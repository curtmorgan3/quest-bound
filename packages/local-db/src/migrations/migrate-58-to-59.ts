import type { Transaction } from 'dexie';

const TABLES = [
  'campaignCharacters',
  'inventoryItems',
  'characterAttributes',
  'characterArchetypes',
  'scriptLogs',
  'campaignScenes',
] as const;

/**
 * Migration 58 → 59: default `deleted: false` on coordinated sync entities (Phase 2.2 soft deletes).
 */
export async function migrate58to59(tx: Transaction): Promise<void> {
  for (const name of TABLES) {
    const table = tx.table(name);
    await table.toCollection().modify((row: Record<string, unknown>) => {
      if (row.deleted === undefined) {
        row.deleted = false;
      }
    });
  }
}
