/**
 * Pull remote changes for a ruleset: fetch from Supabase, LWW merge, then either stage for review
 * or apply immediately (install path). Tombstones are scoped by owner + `ruleset_id`.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { fetchCloudRulesetRowOwnerId } from '@/lib/cloud/sync/fetch-cloud-ruleset-row-owner';
import {
  resolveAssetRowsForPull,
  resolveFontRowsForPull,
  updateMemoizedAssetsForRecords,
} from '@/lib/cloud/sync/sync-assets';
import { addSyncEntityCount, sumSyncEntityCounts } from '@/lib/cloud/sync/sync-entity-labels';
import { getStoredLastSyncedAt, useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import {
  getSyncTableConfig,
  getSyncTableConfigByRemote,
  SYNC_TABLE_ORDER,
} from '@/lib/cloud/sync/sync-tables';
import { prepareRemoteForLocal, toSnakeCaseKeys } from '@/lib/cloud/sync/sync-utils';
import { isSoftDeleteSyncTable } from '@/lib/data/soft-delete';
import type { DB } from '@/stores/db/hooks/types';
import type { SupabaseClient } from '@supabase/supabase-js';

/** When no local ruleset row exists, pull everything from remote (ignore stored incremental cursor). */
const FULL_PULL_SINCE = '1970-01-01T00:00:00Z';

export interface StagedPullDelete {
  tableName: string;
  entityId: string;
  /** ISO from remote `sync_deletes.deleted_at` when present */
  deletedAt?: string;
}

/** In-memory staged pull: prepared local rows per table + remote tombstones (not applied until confirm). */
export interface StagedPullPayload {
  upsertsByTable: Partial<Record<string, Record<string, unknown>[]>>;
  deletes: StagedPullDelete[];
}

async function fetchTableRecords(
  remoteTableName: string,
  rulesetId: string,
  lastSyncedAt: string,
  userId: string,
): Promise<Record<string, unknown>[]> {
  if (!cloudClient) return [];
  const { data, error } = await cloudClient
    .from(remoteTableName)
    .select('*')
    .eq('user_id', userId)
    .eq('ruleset_id', rulesetId)
    .gt('updated_at', lastSyncedAt);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

async function fetchTableRecordsByParent(
  remoteTableName: string,
  parentKey: string,
  parentIds: string[],
  lastSyncedAt: string,
  userId: string,
): Promise<Record<string, unknown>[]> {
  if (!cloudClient || parentIds.length === 0) return [];
  const snakeParentKey = parentKey.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
  const { data, error } = await cloudClient
    .from(remoteTableName)
    .select('*')
    .eq('user_id', userId)
    .in(snakeParentKey, parentIds)
    .gt('updated_at', lastSyncedAt);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

/** Tombstones for this ruleset live under the cloud row owner with ruleset_id set (org collaboration). */
async function fetchSyncDeletes(
  rowOwnerId: string,
  rulesetId: string,
  since: string,
): Promise<{ table_name: string; entity_id: string; deleted_at: string }[]> {
  if (!cloudClient) return [];
  const { data, error } = await cloudClient
    .from('sync_deletes')
    .select('table_name, entity_id, deleted_at')
    .eq('user_id', rowOwnerId)
    .eq('ruleset_id', rulesetId)
    .gt('deleted_at', since);
  if (error) throw error;
  return (data ?? []) as { table_name: string; entity_id: string; deleted_at: string }[];
}

async function mergeTablePlan(
  db: DB,
  tableName: string,
  remoteRows: Record<string, unknown>[],
): Promise<{ count: number; toPut: Record<string, unknown>[] }> {
  if (remoteRows.length === 0) return { count: 0, toPut: [] };
  const table = (
    db as unknown as Record<
      string,
      {
        bulkPut: (objs: unknown[]) => Promise<void>;
        get: (id: string) => Promise<{ updatedAt?: string } | undefined>;
      }
    >
  )[tableName];
  if (!table?.bulkPut) return { count: 0, toPut: [] };
  const toPut: Record<string, unknown>[] = [];
  for (const row of remoteRows) {
    const local = await table.get(row.id as string);
    const remoteUpdated = row.updated_at as string;
    if (!local || !local.updatedAt || remoteUpdated >= local.updatedAt) {
      const prepared = prepareRemoteForLocal(row, tableName);
      if (isSoftDeleteSyncTable(tableName)) {
        prepared.deleted = prepared.deleted === true;
      }
      if (tableName === 'users' && local) {
        const loc = local as Record<string, unknown>;
        if (loc.emailVerified !== undefined) prepared.emailVerified = loc.emailVerified;
        if (loc.cloudEnabled !== undefined) prepared.cloudEnabled = loc.cloudEnabled;
      }
      toPut.push(prepared);
    }
  }
  return { count: toPut.length, toPut };
}

export interface PlanSyncPullResult {
  error?: string;
  payload?: StagedPullPayload;
  pulledCount?: number;
  pulledByEntity?: Record<string, number>;
}

/**
 * Fetch remote deltas and compute LWW merges without writing IndexedDB.
 * Asset/font binary data is not downloaded; rows keep storage_path / storagePath for apply.
 */
export async function planSyncPull(rulesetId: string, db: DB): Promise<PlanSyncPullResult> {
  const client = cloudClient;
  const session = await getSession();
  if (!client || !session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const sessionUserId = session.user.id;
  const { setSyncError, loadLastSyncedAt } = useSyncStateStore.getState();
  await loadLastSyncedAt();
  const lastSyncedAtMap = await getStoredLastSyncedAt();
  const localRuleset = await db.rulesets.get(rulesetId);
  const lastSyncedAt = localRuleset
    ? (lastSyncedAtMap[rulesetId] ?? FULL_PULL_SINCE)
    : FULL_PULL_SINCE;

  setSyncError(null);
  try {
    const rowOwnerId = await fetchCloudRulesetRowOwnerId(client, rulesetId);
    const pulledByEntity: Record<string, number> = {};
    const upsertsByTable: Partial<Record<string, Record<string, unknown>[]>> = {};
    const deletes: StagedPullDelete[] = [];

    const tablesByParent = new Map<string, string[]>();
    const configs = SYNC_TABLE_ORDER.map((name) => getSyncTableConfig(name)).filter(
      Boolean,
    ) as ReturnType<typeof getSyncTableConfig> extends undefined
      ? never
      : NonNullable<ReturnType<typeof getSyncTableConfig>>[];

    for (const config of configs) {
      if (config.tableName === 'users') {
        if (!cloudClient) continue;
        const { data, error } = await cloudClient
          .from('users')
          .select('*')
          .eq('user_id', sessionUserId)
          .gt('updated_at', lastSyncedAt);
        if (error) throw error;
        const rows = (data ?? []) as Record<string, unknown>[];
        const localLinked = await db.users.where('cloudUserId').equals(sessionUserId).first();
        const filtered =
          localLinked && rows.length > 0 ? rows.filter((r) => r.id === localLinked.id) : rows;
        const { count, toPut } = await mergeTablePlan(db, config.tableName, filtered);
        if (toPut.length > 0) upsertsByTable[config.tableName] = toPut;
        addSyncEntityCount(pulledByEntity, config.tableName, count);
      } else if (config.hasRulesetId) {
        let rows: Record<string, unknown>[];
        if (config.tableName === 'rulesets') {
          if (!cloudClient) rows = [];
          else {
            const { data, error } = await cloudClient
              .from(config.remoteTableName)
              .select('*')
              .eq('user_id', rowOwnerId)
              .eq('id', rulesetId)
              .gt('updated_at', lastSyncedAt);
            if (error) throw error;
            rows = (data ?? []) as Record<string, unknown>[];
          }
        } else {
          rows = await fetchTableRecords(
            config.remoteTableName,
            rulesetId,
            lastSyncedAt,
            rowOwnerId,
          );
        }

        if (config.tableName === 'assets' && rows.length > 0) {
          tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
          const { count, toPut } = await mergeTablePlan(db, config.tableName, rows);
          if (toPut.length > 0) upsertsByTable[config.tableName] = toPut;
          addSyncEntityCount(pulledByEntity, config.tableName, count);
        } else if (config.tableName === 'fonts' && rows.length > 0) {
          tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
          const { count, toPut } = await mergeTablePlan(db, config.tableName, rows);
          if (toPut.length > 0) upsertsByTable[config.tableName] = toPut;
          addSyncEntityCount(pulledByEntity, config.tableName, count);
        } else {
          tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
          const { count, toPut } = await mergeTablePlan(db, config.tableName, rows);
          if (toPut.length > 0) upsertsByTable[config.tableName] = toPut;
          addSyncEntityCount(pulledByEntity, config.tableName, count);
        }
      } else if (config.parentTable && config.parentKey) {
        let parentIds = [...(tablesByParent.get(config.parentTable) ?? [])];
        if (config.parentTable === 'characters') {
          const localChars = await db.characters.where('rulesetId').equals(rulesetId).toArray();
          const localIds = localChars.map((c) => c.id);
          parentIds = [...new Set([...parentIds, ...localIds])];
        }
        if (config.parentTable === 'campaigns') {
          const localCamps = await db.campaigns.where('rulesetId').equals(rulesetId).toArray();
          const localIds = localCamps.map((c) => c.id);
          parentIds = [...new Set([...parentIds, ...localIds])];
        }
        if (config.parentTable === 'campaignScenes') {
          const sceneIds = tablesByParent.get('campaignScenes') ?? [];
          if (sceneIds.length === 0) {
            const campaigns = await db.campaigns.where('rulesetId').equals(rulesetId).toArray();
            const campaignIds = campaigns.map((c) => c.id);
            const scenes = await db.campaignScenes.where('campaignId').anyOf(campaignIds).toArray();
            parentIds = [...new Set([...parentIds, ...scenes.map((s) => s.id)])];
          } else {
            parentIds = [...new Set([...parentIds, ...sceneIds])];
          }
        }
        if (config.parentTable === 'composites') {
          const localComposites = await db.composites.where('rulesetId').equals(rulesetId).toArray();
          const localIds = localComposites.map((c) => c.id);
          parentIds = [...new Set([...parentIds, ...localIds])];
        }
        const effectiveParentIds = parentIds;
        const rows = await fetchTableRecordsByParent(
          config.remoteTableName,
          config.parentKey,
          effectiveParentIds,
          lastSyncedAt,
          rowOwnerId,
        );
        const ids = rows.map((r) => r.id as string).filter(Boolean);
        if (ids.length > 0) tablesByParent.set(config.tableName, ids);
        const { count, toPut } = await mergeTablePlan(db, config.tableName, rows);
        if (toPut.length > 0) upsertsByTable[config.tableName] = toPut;
        addSyncEntityCount(pulledByEntity, config.tableName, count);
      }
    }

    const deleteEntries = await fetchSyncDeletes(rowOwnerId, rulesetId, lastSyncedAt);
    for (const entry of deleteEntries) {
      const config = getSyncTableConfigByRemote(entry.table_name);
      if (!config) continue;
      deletes.push({
        tableName: config.tableName,
        entityId: entry.entity_id,
        deletedAt: entry.deleted_at,
      });
      addSyncEntityCount(pulledByEntity, config.tableName, 1);
    }

    const pulledCount = sumSyncEntityCounts(pulledByEntity);
    return {
      payload: { upsertsByTable, deletes },
      pulledCount,
      pulledByEntity,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setSyncError(message);
    return { error: message };
  }
}

/**
 * Write staged pull to IndexedDB: download assets/fonts from storage, then bulkPut in table order, then deletes.
 */
export async function applyStagedPull(
  db: DB,
  client: SupabaseClient,
  payload: StagedPullPayload,
): Promise<void> {
  type BulkTable = { bulkPut: (objs: unknown[]) => Promise<void> };
  const dbTables = db as unknown as Record<string, BulkTable>;

  for (const name of SYNC_TABLE_ORDER) {
    const rows = payload.upsertsByTable[name];
    if (!rows?.length) continue;
    const table = dbTables[name];
    if (!table?.bulkPut) continue;

    if (name === 'assets') {
      const snakeRows = rows.map((r) => toSnakeCaseKeys(r as Record<string, unknown>));
      const resolved = await resolveAssetRowsForPull(client, snakeRows);
      const prepared = resolved.rows.map((r) => prepareRemoteForLocal(r, 'assets'));
      await table.bulkPut(prepared);
      if (resolved.downloaded.length > 0) {
        updateMemoizedAssetsForRecords(resolved.downloaded);
      }
    } else if (name === 'fonts') {
      const snakeRows = rows.map((r) => toSnakeCaseKeys(r as Record<string, unknown>));
      const resolved = await resolveFontRowsForPull(client, snakeRows);
      const prepared = resolved.map((r) => prepareRemoteForLocal(r, 'fonts'));
      await table.bulkPut(prepared);
    } else {
      await table.bulkPut(rows);
    }
  }

  for (const d of payload.deletes) {
    const delTable = (db as unknown as Record<string, { delete: (id: string) => Promise<void> }>)[
      d.tableName
    ];
    if (!delTable?.delete) continue;
    try {
      await delTable.delete(d.entityId);
    } catch {
      /* row may already be gone */
    }
  }
}

/** Full pull + immediate local apply (e.g. install from cloud). */
export async function syncPull(
  rulesetId: string,
  db: DB,
): Promise<{ error?: string; pulledCount?: number; pulledByEntity?: Record<string, number> }> {
  const plan = await planSyncPull(rulesetId, db);
  if (plan.error) return { error: plan.error };
  if (!plan.payload) return { error: 'No pull payload' };
  const client = cloudClient;
  if (!client) return { error: 'Cloud not configured' };
  await applyStagedPull(db, client, plan.payload);
  return {
    pulledCount: plan.pulledCount,
    pulledByEntity: plan.pulledByEntity,
  };
}
