/**
 * Push local changes for a ruleset: collect changed records, strip fields, upsert to Supabase.
 * Also push pending sync_deletes and clear them for this ruleset.
 */

import { cloudClient } from '@/lib/cloud/client';
import { getSession } from '@/lib/cloud/auth';
import type { DB } from '@/stores/db/hooks/types';
import {
  getSyncTableConfig,
  SYNC_TABLE_ORDER,
} from '@/lib/cloud/sync/sync-tables';
import { prepareRecordForRemote } from '@/lib/cloud/sync/sync-utils';
import {
  useSyncStateStore,
  getStoredLastSyncedAt,
  setStoredLastSyncedAt,
  takePendingSyncDeletesForRuleset,
} from '@/lib/cloud/sync/sync-state';
import type { SyncTableConfig } from '@/lib/cloud/sync/sync-tables';

type TableWithWhere = {
  where: (key: string) => {
    equals: (v: string) => { toArray: () => Promise<Record<string, unknown>[]> };
    anyOf: (v: string[]) => { toArray: () => Promise<Record<string, unknown>[]> };
  };
};

export async function syncPush(rulesetId: string, db: DB): Promise<{ error?: string }> {
  const client = cloudClient;
  const session = await getSession();
  if (!client || !session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const userId = session.user.id;
  const { setSyncError, setLastSyncedAt, loadLastSyncedAt } = useSyncStateStore.getState();
  await loadLastSyncedAt();
  const lastSyncedAtMap = await getStoredLastSyncedAt();
  const lastSyncedAt = lastSyncedAtMap[rulesetId] ?? '1970-01-01T00:00:00Z';

  setSyncError(null);
  try {
    const configs: SyncTableConfig[] = [];
    for (const name of SYNC_TABLE_ORDER) {
      const c = getSyncTableConfig(name);
      if (c) configs.push(c);
    }

    for (const config of configs) {
      const table = (db as unknown as Record<string, TableWithWhere>)[config.tableName];
      if (!table?.where) continue;

      let rows: Record<string, unknown>[];
      if (config.hasRulesetId) {
        const all = await table.where('rulesetId').equals(rulesetId).toArray();
        rows = all.filter((r) => (r.updatedAt as string) > lastSyncedAt);
      } else if (config.parentTable && config.parentKey) {
        const parentIds = await getParentIds(db, config.parentTable, rulesetId);
        if (parentIds.length === 0) continue;
        const all = await table.where(config.parentKey).anyOf(parentIds).toArray();
        rows = all.filter((r) => (r.updatedAt as string) > lastSyncedAt);
      } else {
        continue;
      }

      if (rows.length === 0) continue;

      const remoteRows = rows.map((r) => ({
        ...prepareRecordForRemote(config.tableName, r),
        user_id: userId,
      }));
      const { error } = await client
        .from(config.remoteTableName)
        .upsert(remoteRows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }

    const pendingDeletes = await takePendingSyncDeletesForRuleset(rulesetId);
    if (pendingDeletes.length > 0) {
      const now = new Date().toISOString();
      const deleteRows = pendingDeletes.map((d) => ({
        user_id: userId,
        table_name: getRemoteTableName(d.tableName),
        entity_id: d.entityId,
        deleted_at: now,
      }));
      const { error } = await client.from('sync_deletes').upsert(deleteRows, {
        onConflict: 'user_id,table_name,entity_id',
      });
      if (error) throw error;
    }

    const now = new Date().toISOString();
    setLastSyncedAt(rulesetId, now);
    await setStoredLastSyncedAt({ ...lastSyncedAtMap, [rulesetId]: now });
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setSyncError(message);
    return { error: message };
  }
}

function getRemoteTableName(dexieTableName: string): string {
  const config = getSyncTableConfig(dexieTableName);
  return config?.remoteTableName ?? dexieTableName;
}

type TableWithWhereId = {
  where: (key: string) => {
    equals: (v: string) => { toArray: () => Promise<{ id: string }[]> };
    anyOf: (v: string[]) => { toArray: () => Promise<{ id: string }[]> };
  };
};

async function getParentIds(db: DB, parentTable: string, rulesetId: string): Promise<string[]> {
  const dbTables = db as unknown as Record<string, TableWithWhereId>;
  const table = dbTables[parentTable];
  if (!table?.where) return [];
  if (parentTable === 'characters' || parentTable === 'campaigns') {
    const rows = await table.where('rulesetId').equals(rulesetId).toArray();
    return rows.map((r) => r.id);
  }
  if (parentTable === 'campaignScenes') {
    const campaigns = await dbTables['campaigns'].where('rulesetId').equals(rulesetId).toArray();
    const campaignIds = campaigns.map((c) => c.id);
    if (campaignIds.length === 0) return [];
    const scenes = await table.where('campaignId').anyOf(campaignIds).toArray();
    return scenes.map((s) => s.id);
  }
  if (parentTable === 'archetypes' || parentTable === 'items') {
    const rows = await table.where('rulesetId').equals(rulesetId).toArray();
    return rows.map((r) => r.id);
  }
  if (parentTable === 'inventories') {
    const characters = await dbTables['characters'].where('rulesetId').equals(rulesetId).toArray();
    const characterIds = characters.map((c) => c.id);
    if (characterIds.length === 0) return [];
    const invs = await table.where('characterId').anyOf(characterIds).toArray();
    return invs.map((i) => i.id);
  }
  return [];
}
