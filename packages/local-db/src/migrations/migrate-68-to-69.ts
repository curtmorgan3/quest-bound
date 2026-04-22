import type { Transaction } from 'dexie';

/**
 * Migration 68 → 69: documents table gains optional `order` (no backfill required).
 */
export async function migrate68to69(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; missing `order` sorts as 0 in the UI.
}
