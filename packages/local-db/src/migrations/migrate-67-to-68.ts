import type { Transaction } from 'dexie';

/**
 * Migration 67 → 68: `syncMergeConflicts` table for branch + manual merge (no row backfill).
 */
export async function migrate67to68(_tx: Transaction): Promise<void> {
  // Schema-only upgrade.
}
