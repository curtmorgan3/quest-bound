/**
 * Pull remote changes for a ruleset: fetch from Supabase, LWW merge, bulkPut with isSyncing guard.
 */

import { cloudClient } from '@/lib/cloud/client';
import { getSession } from '@/lib/cloud/auth';
import type { DB } from '@/stores/db/hooks/types';
import {
  getSyncTableConfig,
  getSyncTableConfigByRemote,
  SYNC_TABLE_ORDER,
} from '@/lib/cloud/sync/sync-tables';
import { prepareRemoteForLocal } from '@/lib/cloud/sync/sync-utils';
import {
  useSyncStateStore,
  getStoredLastSyncedAt,
  setStoredLastSyncedAt,
} from '@/lib/cloud/sync/sync-state';

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

async function fetchSyncDeletes(userId: string, since: string): Promise<{ table_name: string; entity_id: string }[]> {
  if (!cloudClient) return [];
  const { data, error } = await cloudClient
    .from('sync_deletes')
    .select('table_name, entity_id')
    .eq('user_id', userId)
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
  const userId = session.user.id;
  const { setSyncing, setSyncError, setLastSyncedAt, loadLastSyncedAt } = useSyncStateStore.getState();
  await loadLastSyncedAt();
  const lastSyncedAtMap = await getStoredLastSyncedAt();
  const lastSyncedAt = lastSyncedAtMap[rulesetId] ?? '1970-01-01T00:00:00Z';

  setSyncing(true);
  setSyncError(null);
  try {
    const tablesByParent = new Map<string, string[]>();
    const configs = SYNC_TABLE_ORDER.map((name) => getSyncTableConfig(name)).filter(Boolean) as ReturnType<
      typeof getSyncTableConfig
    > extends undefined ? never : NonNullable<ReturnType<typeof getSyncTableConfig>>[];

    for (const config of configs) {
      if (config.hasRulesetId) {
        let rows: Record<string, unknown>[];
        if (config.tableName === 'rulesets') {
          if (!cloudClient) rows = [];
          else {
            const { data, error } = await cloudClient
              .from(config.remoteTableName)
              .select('*')
              .eq('user_id', userId)
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
            userId,
          );
        }
        tablesByParent.set(config.tableName, rows.map((r) => r.id as string).filter(Boolean));
        await mergeTable(db, config.tableName, rows);
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
          userId,
        );
        const ids = rows.map((r) => r.id as string).filter(Boolean);
        if (ids.length > 0) tablesByParent.set(config.tableName, ids);
        await mergeTable(db, config.tableName, rows);
      }
    }

    const deleteEntries = await fetchSyncDeletes(userId, lastSyncedAt);
    for (const entry of deleteEntries) {
      const config = getSyncTableConfigByRemote(entry.table_name);
      if (!config) continue;
      const table = (db as unknown as Record<string, { delete: (id: string) => Promise<void> }>)[config.tableName];
      if (table) await table.delete(entry.entity_id).catch(() => {});
    }

    const now = new Date().toISOString();
    setLastSyncedAt(rulesetId, now);
    await setStoredLastSyncedAt({ ...lastSyncedAtMap, [rulesetId]: now });
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
      toPut.push(prepareRemoteForLocal(row));
    }
  }
  if (toPut.length > 0) await table.bulkPut(toPut);
}
