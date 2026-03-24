/**
 * Coordinated soft-delete for Phase 2 multiplayer sync (tombstones via `deleted: true` + bulkPut).
 * Hard Dexie `.delete()` remains appropriate for local-only wipes (e.g. whole campaign/ruleset removal).
 */

export type SoftDeletable = { deleted?: boolean };

export function isNotSoftDeleted<T extends SoftDeletable>(row: T | null | undefined): row is T {
  return row != null && row.deleted !== true;
}

export function filterNotSoftDeleted<T extends SoftDeletable>(rows: T[] | undefined): T[] {
  if (!rows?.length) return [];
  return rows.filter(isNotSoftDeleted);
}

/** Tables that participate in cloud soft-delete semantics (Dexie + Postgres). */
export const SOFT_DELETE_SYNC_TABLES = [
  'campaignCharacters',
  'inventoryItems',
  'characterAttributes',
  'characterArchetypes',
  'scriptLogs',
  'campaignScenes',
] as const;

export type SoftDeleteSyncTableName = (typeof SOFT_DELETE_SYNC_TABLES)[number];

export function isSoftDeleteSyncTable(name: string): name is SoftDeleteSyncTableName {
  return (SOFT_DELETE_SYNC_TABLES as readonly string[]).includes(name);
}

export function softDeletePatch(): { deleted: true; updatedAt: string } {
  return { deleted: true, updatedAt: new Date().toISOString() };
}
