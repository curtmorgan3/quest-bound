import type { Transaction } from 'dexie';

/**
 * Migration 59 → 60: `components.parentComponentId` for grouped sheet items (Phase 4a).
 * Legacy `groupId` is left in place but unused by the new grouping model.
 */
export async function migrate59to60(tx: Transaction): Promise<void> {
  const table = tx.table('components');
  await table.toCollection().modify((row: Record<string, unknown>) => {
    if (row.parentComponentId === undefined) {
      row.parentComponentId = null;
    }
  });
}
