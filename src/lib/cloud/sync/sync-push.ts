/**
 * Push local changes for a ruleset: collect changed records, strip fields, upsert to Supabase.
 * Also push pending sync_deletes and clear them for this ruleset.
 *
 * Remote rows use the ruleset owner's `user_id` (not necessarily the session user) so RLS matches
 * org-linked collaboration. Tombstones use the same owner plus `ruleset_id` so collaborators can pull deletes.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { fetchCloudRulesetRowOwnerId } from '@/lib/cloud/sync/fetch-cloud-ruleset-row-owner';
import { fetchRulesetStorageFolderPrefix } from '@/lib/cloud/sync/fetch-ruleset-storage-prefix';
import { uploadAssetsForPush, uploadFontsForPush } from '@/lib/cloud/sync/sync-assets';
import {
  getPendingSyncDeletes,
  getStoredLastSyncedAt,
  setStoredLastSyncedAt,
  takePendingSyncDeletesForRuleset,
  useSyncStateStore,
} from '@/lib/cloud/sync/sync-state';
import type { SyncTableConfig } from '@/lib/cloud/sync/sync-tables';
import { getSyncTableConfig, SYNC_TABLE_ORDER } from '@/lib/cloud/sync/sync-tables';
import { addSyncEntityCount, sumSyncEntityCounts } from '@/lib/cloud/sync/sync-entity-labels';
import type { StagedPullPayload } from '@/lib/cloud/sync/sync-pull';
import { formatSyncError, prepareRecordForRemote } from '@/lib/cloud/sync/sync-utils';
import type { DB } from '@/stores/db/hooks/types';

/** Row keys (`tableName:id`) merged from pull in the same sync pass — must not count or upsert as push. */
export function syncPushSkipKeysFromAppliedPull(payload: StagedPullPayload): Set<string> {
  const keys = new Set<string>();
  for (const [tableName, rows] of Object.entries(payload.upsertsByTable ?? {})) {
    if (!rows?.length) continue;
    for (const row of rows) {
      const id = (row as { id?: unknown }).id;
      if (typeof id === 'string' && id.length > 0) keys.add(`${tableName}:${id}`);
    }
  }
  return keys;
}

function filterRowsExcludedByAppliedPull(
  tableName: string,
  rows: Record<string, unknown>[],
  skipKeys: Set<string> | null,
): Record<string, unknown>[] {
  if (!skipKeys || skipKeys.size === 0) return rows;
  return rows.filter((r) => {
    const id = r.id;
    if (typeof id !== 'string' || id.length === 0) return true;
    return !skipKeys.has(`${tableName}:${id}`);
  });
}

export interface SyncPushOptions {
  /** Same-pass pull payload: rows written by apply before push must not be re-pushed. */
  appliedPull?: StagedPullPayload;
}

type TableWithWhere = {
  where: (key: string) => {
    equals: (v: string) => {
      toArray: () => Promise<Record<string, unknown>[]>;
      first: () => Promise<Record<string, unknown> | undefined>;
    };
    anyOf: (v: string[]) => { toArray: () => Promise<Record<string, unknown>[]> };
  };
};

type TableWithGet = {
  get: (key: string) => Promise<Record<string, unknown> | undefined>;
};

export async function syncPush(
  rulesetId: string,
  db: DB,
  options?: SyncPushOptions,
): Promise<{ error?: string; pushedCount?: number; pushedByEntity?: Record<string, number> }> {
  const client = cloudClient;
  const session = await getSession();

  if (!client || !session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const sessionUserId = session.user.id;
  const { setSyncError, setLastSyncedAt, loadLastSyncedAt } = useSyncStateStore.getState();
  await loadLastSyncedAt();
  const lastSyncedAtMap = await getStoredLastSyncedAt();
  const lastSyncedAt = lastSyncedAtMap[rulesetId] ?? '1970-01-01T00:00:00Z';
  const skipKeysAfterPull = options?.appliedPull
    ? syncPushSkipKeysFromAppliedPull(options.appliedPull)
    : null;

  setSyncError(null);
  const pushedByEntity: Record<string, number> = {};
  try {
    // First push path: ruleset row may not exist remotely yet.
    // In that case, use the signed-in user as row owner so `rulesets` upsert can create it.
    let rowOwnerId = sessionUserId;
    try {
      rowOwnerId = await fetchCloudRulesetRowOwnerId(client, rulesetId);
    } catch (error) {
      const message = formatSyncError(error);
      const isMissingRemoteRuleset =
        message.includes('Ruleset not found in the cloud or you do not have access');
      if (!isMissingRemoteRuleset) {
        throw error;
      }
    }
    const rulesetStoragePrefix = await fetchRulesetStorageFolderPrefix(client, rowOwnerId, rulesetId);

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
      } else if (config.tableName === 'users' && table.where) {
        const linked = await table.where('cloudUserId').equals(sessionUserId).first();
        rows =
          linked && (linked.updatedAt as string) > lastSyncedAt
            ? [linked as Record<string, unknown>]
            : [];
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

      rows = filterRowsExcludedByAppliedPull(config.tableName, rows, skipKeysAfterPull);

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

      // Backfill ruleset_id for character_pages from parent character when missing (required by remote)
      if (config.tableName === 'characterPages') {
        const charactersTable = tables['characters'] as TableWithGet | undefined;
        if (charactersTable?.get) {
          for (const r of rows) {
            if (
              (r.rulesetId == null || r.ruleset_id == null) &&
              typeof (r.characterId ?? r.character_id) === 'string'
            ) {
              const char = await charactersTable.get((r.characterId ?? r.character_id) as string);
              const rid = (char as { rulesetId?: string } | undefined)?.rulesetId;
              if (typeof rid === 'string' && rid.length > 0) {
                r.rulesetId = rid;
              }
            }
          }
        }
      }

      if (config.tableName === 'users') {
        const authEmail = session.user.email?.trim();
        if (authEmail) {
          const normalized = authEmail.toLowerCase();
          for (const r of rows) {
            const has = typeof r.email === 'string' && r.email.trim() !== '';
            if (!has) r.email = normalized;
          }
        }
      }

      const remoteRows = rows.map((r) => {
        const cloudRowUserId = config.tableName === 'users' ? sessionUserId : rowOwnerId;
        const row: { user_id: string; user_id_local?: string } = {
          ...prepareRecordForRemote(config.tableName, r),
          user_id: cloudRowUserId,
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
        await uploadAssetsForPush(client, rulesetStoragePrefix, remoteRows);
      } else if (config.tableName === 'fonts') {
        await uploadFontsForPush(client, rulesetStoragePrefix, remoteRows);
      }

      // `users`: default upsert merges on conflict → UPDATE, which RLS denies unless cloud_enabled (sync_is_allowed).
      // When sync is disabled, only insert missing rows; when sync is enabled, merge profile updates.
      const upsertOptions =
        config.tableName === 'users'
          ? {
              onConflict: 'user_id,id' as const,
              ignoreDuplicates: !useCloudAuthStore.getState().cloudSyncEnabled,
            }
          : { onConflict: 'user_id,id' as const };

      const { error } = await client.from(config.remoteTableName).upsert(remoteRows, upsertOptions);
      if (error) throw error;
      addSyncEntityCount(pushedByEntity, config.tableName, remoteRows.length);
    }

    const pendingDeletes = await takePendingSyncDeletesForRuleset(rulesetId);
    if (pendingDeletes.length > 0) {
      const now = new Date().toISOString();
      const deleteRows = pendingDeletes.map((d) => ({
        user_id: rowOwnerId,
        ruleset_id: rulesetId,
        table_name: getRemoteTableName(d.tableName),
        entity_id: d.entityId,
        deleted_at: now,
      }));
      const { error } = await client.from('sync_deletes').upsert(deleteRows, {
        onConflict: 'user_id,table_name,entity_id',
      });
      if (error) throw error;
      for (const d of pendingDeletes) {
        addSyncEntityCount(pushedByEntity, d.tableName, 1);
      }
    }

    const now = new Date().toISOString();
    setLastSyncedAt(rulesetId, now);
    await setStoredLastSyncedAt({ ...lastSyncedAtMap, [rulesetId]: now });
    const pushedCount = sumSyncEntityCounts(pushedByEntity);
    return { pushedCount, pushedByEntity };
  } catch (err) {
    const message = formatSyncError(err);
    setSyncError(message);
    return { error: message };
  }
}

/**
 * Same row selection as {@link syncPush} without uploads or upserts; includes pending delete tombstones.
 */
export async function planSyncPush(
  rulesetId: string,
  db: DB,
  options?: SyncPushOptions,
): Promise<{ error?: string; pushedByEntity?: Record<string, number> }> {
  const client = cloudClient;
  const session = await getSession();

  if (!client || !session?.user?.id) {
    return { error: 'Not authenticated' };
  }
  const sessionUserId = session.user.id;
  const { loadLastSyncedAt } = useSyncStateStore.getState();
  await loadLastSyncedAt();
  const lastSyncedAtMap = await getStoredLastSyncedAt();
  const lastSyncedAt = lastSyncedAtMap[rulesetId] ?? '1970-01-01T00:00:00Z';
  const skipKeysAfterPull = options?.appliedPull
    ? syncPushSkipKeysFromAppliedPull(options.appliedPull)
    : null;

  const pushedByEntity: Record<string, number> = {};
  try {
    let rowOwnerId = sessionUserId;
    try {
      rowOwnerId = await fetchCloudRulesetRowOwnerId(client, rulesetId);
    } catch (error) {
      const message = formatSyncError(error);
      const isMissingRemoteRuleset =
        message.includes('Ruleset not found in the cloud or you do not have access');
      if (!isMissingRemoteRuleset) {
        throw error;
      }
    }

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
      if (config.parentTable && config.parentKey && table.where) {
        const parentIds = await getParentIds(db, config.parentTable, rulesetId);
        if (parentIds.length === 0) continue;
        const all = await table.where(config.parentKey).anyOf(parentIds).toArray();
        rows = all.filter((r) => (r.updatedAt as string) > lastSyncedAt);
      } else if (config.tableName === 'users' && table.where) {
        const linked = await table.where('cloudUserId').equals(sessionUserId).first();
        rows =
          linked && (linked.updatedAt as string) > lastSyncedAt
            ? [linked as Record<string, unknown>]
            : [];
      } else if (config.hasRulesetId) {
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

      rows = filterRowsExcludedByAppliedPull(config.tableName, rows, skipKeysAfterPull);

      if (rows.length === 0) continue;
      addSyncEntityCount(pushedByEntity, config.tableName, rows.length);
    }

    const pendingDeletes = (await getPendingSyncDeletes()).filter((r) => r.rulesetId === rulesetId);
    for (const d of pendingDeletes) {
      addSyncEntityCount(pushedByEntity, d.tableName, 1);
    }

    void rowOwnerId;
    return { pushedByEntity };
  } catch (err) {
    const message = formatSyncError(err);
    useSyncStateStore.getState().setSyncError(message);
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
  if (parentTable === 'composites') {
    const rows = await table.where('rulesetId').equals(rulesetId).toArray();
    return rows.map((r) => r.id);
  }
  return [];
}
