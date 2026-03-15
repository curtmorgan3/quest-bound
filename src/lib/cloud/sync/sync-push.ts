/**
 * Push local changes for a ruleset: collect changed records, strip fields, upsert to Supabase.
 * Also push pending sync_deletes and clear them for this ruleset.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { uploadAssetsForPush, uploadFontsForPush } from '@/lib/cloud/sync/sync-assets';
import {
  getStoredLastSyncedAt,
  setStoredLastSyncedAt,
  takePendingSyncDeletesForRuleset,
  useSyncStateStore,
} from '@/lib/cloud/sync/sync-state';
import type { SyncTableConfig } from '@/lib/cloud/sync/sync-tables';
import { getSyncTableConfig, SYNC_TABLE_ORDER } from '@/lib/cloud/sync/sync-tables';
import { prepareRecordForRemote } from '@/lib/cloud/sync/sync-utils';
import type { DB } from '@/stores/db/hooks/types';

type TableWithWhere = {
  where: (key: string) => {
    equals: (v: string) => { toArray: () => Promise<Record<string, unknown>[]> };
    anyOf: (v: string[]) => { toArray: () => Promise<Record<string, unknown>[]> };
  };
};

type TableWithGet = {
  get: (key: string) => Promise<Record<string, unknown> | undefined>;
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
      const tables = db as unknown as Record<string, TableWithWhere & TableWithGet>;
      const table = tables[config.tableName];
      if (!table) continue;

      let rows: Record<string, unknown>[];
      // Child tables (e.g. characterAttributes): no rulesetId index — use parent ids
      if (config.parentTable && config.parentKey && table.where) {
        const parentIds = await getParentIds(db, config.parentTable, rulesetId);
        if (parentIds.length === 0) continue;
        const all = await table.where(config.parentKey).anyOf(parentIds).toArray();
        rows = all.filter((r) => (r.updatedAt as string) > lastSyncedAt);
      } else if (config.hasRulesetId) {
        // rulesets table uses id as key, not rulesetId (no rulesetId index)
        if (config.tableName === 'rulesets') {
          const row = await table.get?.(rulesetId);
          rows = row && (row.updatedAt as string) > lastSyncedAt ? [row] : [];
        } else if (table.where) {
          const all = await table.where('rulesetId').equals(rulesetId).toArray();
          rows = all.filter((r) => (r.updatedAt as string) > lastSyncedAt);
        } else {
          continue;
        }
      } else {
        continue;
      }

      if (rows.length === 0) continue;

      // Backfill character_id for inventory_items from parent inventory when missing (required by remote)
      if (config.tableName === 'inventoryItems') {
        const inventoriesTable = tables['inventories'] as TableWithGet | undefined;
        if (inventoriesTable?.get) {
          for (const r of rows) {
            if (
              (r.characterId == null || r.character_id == null) &&
              typeof (r.inventoryId ?? r.inventory_id) === 'string'
            ) {
              const inv = await inventoriesTable.get((r.inventoryId ?? r.inventory_id) as string);
              const cid = (inv as { characterId?: string } | undefined)?.characterId;
              if (typeof cid === 'string') {
                r.characterId = cid;
              }
            }
          }
        }
      }

      const remoteRows = rows.map((r) => {
        const row: { user_id: string; user_id_local?: string } = {
          ...prepareRecordForRemote(config.tableName, r),
          user_id: userId,
        };
        // Remote schema has user_id_local (local app user); required for characters and dice_rolls
        if (
          (config.tableName === 'characters' || config.tableName === 'diceRolls') &&
          typeof (r as { userId?: string }).userId === 'string'
        ) {
          row.user_id_local = (r as { userId: string; user_id_local: string }).userId;
        }
        return row;
      });

      if (config.tableName === 'assets') {
        await uploadAssetsForPush(client, userId, remoteRows);
      } else if (config.tableName === 'fonts') {
        await uploadFontsForPush(client, userId, remoteRows);
      }

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
