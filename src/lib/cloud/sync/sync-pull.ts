/**
 * Pull remote changes for a ruleset: fetch from Supabase, LWW merge, bulkPut with isSyncing guard.
 * Ruleset-scoped fetches use the cloud row owner’s `user_id`; tombstones are scoped by owner + `ruleset_id`.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { fetchCloudRulesetRowOwnerId } from '@/lib/cloud/sync/fetch-cloud-ruleset-row-owner';
import type { DB } from '@/stores/db/hooks/types';
import {
  getSyncTableConfig,
  getSyncTableConfigByRemote,
  SYNC_TABLE_ORDER,
} from '@/lib/cloud/sync/sync-tables';
import { prepareRemoteForLocal } from '@/lib/cloud/sync/sync-utils';
import { useSyncStateStore, getStoredLastSyncedAt } from '@/lib/cloud/sync/sync-state';
import {
  resolveAssetRowsForPull,
  resolveFontRowsForPull,
  updateMemoizedAssetsForRecords,
} from '@/lib/cloud/sync/sync-assets';

const IS_SYNCING_CLEAR_DELAY_MS = 80;

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
): Promise<{ table_name: string; entity_id: string }[]> {
  if (!cloudClient) return [];
  const { data, error } = await cloudClient
    .from('sync_deletes')
    .select('table_name, entity_id')
    .eq('user_id', rowOwnerId)
    .eq('ruleset_id', rulesetId)
    .gt('deleted_at', since);
  if (error) throw error;
  return (data ?? []) as { table_name: string; entity_id: string }[];
}

export async function syncPull(rulesetId: string, db: DB): Promise<{ error?: string }> {
  const client = cloudClient;
  const session = await getSession();
  if (!client || !session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const sessionUserId = session.user.id;
  const { setSyncing, setSyncError, loadLastSyncedAt } = useSyncStateStore.getState();
  await loadLastSyncedAt();
  const lastSyncedAtMap = await getStoredLastSyncedAt();
  const lastSyncedAt = lastSyncedAtMap[rulesetId] ?? '1970-01-01T00:00:00Z';

  setSyncing(true);
  setSyncError(null);
  try {
    const rowOwnerId = await fetchCloudRulesetRowOwnerId(client, rulesetId);

    const tablesByParent = new Map<string, string[]>();
    const configs = SYNC_TABLE_ORDER.map((name) => getSyncTableConfig(name)).filter(Boolean) as ReturnType<
      typeof getSyncTableConfig
    > extends undefined ? never : NonNullable<ReturnType<typeof getSyncTableConfig>>[];

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
          localLinked && rows.length > 0
            ? rows.filter((r) => r.id === localLinked.id)
            : rows;
        await mergeTable(db, config.tableName, filtered);
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

        if (config.tableName === 'assets' && client && rows.length > 0) {
          const resolved = await resolveAssetRowsForPull(client, rows);
          rows = resolved.rows;
          tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
          await mergeTable(db, config.tableName, rows);
          if (resolved.downloaded.length > 0) {
            updateMemoizedAssetsForRecords(resolved.downloaded);
          }
        } else if (config.tableName === 'fonts' && client && rows.length > 0) {
          rows = await resolveFontRowsForPull(client, rows);
          tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
          await mergeTable(db, config.tableName, rows);
        } else {
          tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
          await mergeTable(db, config.tableName, rows);
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
        await mergeTable(db, config.tableName, rows);
      }
    }

    const deleteEntries = await fetchSyncDeletes(rowOwnerId, rulesetId, lastSyncedAt);
    for (const entry of deleteEntries) {
      const config = getSyncTableConfigByRemote(entry.table_name);
      if (!config) continue;
      const table = (db as unknown as Record<string, { delete: (id: string) => Promise<void> }>)[config.tableName];
      if (table) await table.delete(entry.entity_id).catch(() => {});
    }

    // Do not advance lastSyncedAt here. syncPush (or the full sync in syncRuleset) must
    // use the same lastSyncedAt to decide which local rows to push. If we advance it now,
    // local changes made before this pull would have updatedAt < lastSyncedAt and would
    // never be pushed. lastSyncedAt is only updated after a successful push.
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setSyncError(message);
    return { error: message };
  } finally {
    queueMicrotask(() => {
      setTimeout(() => {
        useSyncStateStore.getState().setSyncing(false);
      }, IS_SYNCING_CLEAR_DELAY_MS);
    });
  }
}

async function mergeTable(
  db: DB,
  tableName: string,
  remoteRows: Record<string, unknown>[],
): Promise<void> {
  if (remoteRows.length === 0) return;
  const table = (db as unknown as Record<string, { bulkPut: (objs: unknown[]) => Promise<void>; get: (id: string) => Promise<{ updatedAt?: string } | undefined> }>)[tableName];
  if (!table?.bulkPut) return;
  const toPut: Record<string, unknown>[] = [];
  for (const row of remoteRows) {
    const local = await table.get(row.id as string);
    const remoteUpdated = row.updated_at as string;
    if (!local || !local.updatedAt || remoteUpdated >= local.updatedAt) {
      const prepared = prepareRemoteForLocal(row, tableName);
      if (tableName === 'users' && local) {
        const loc = local as Record<string, unknown>;
        if (loc.emailVerified !== undefined) prepared.emailVerified = loc.emailVerified;
        if (loc.cloudEnabled !== undefined) prepared.cloudEnabled = loc.cloudEnabled;
      }
      toPut.push(prepared);
    }
  }
  if (toPut.length > 0) await table.bulkPut(toPut);
}
