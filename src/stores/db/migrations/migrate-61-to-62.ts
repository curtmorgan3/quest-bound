import type { Transaction } from 'dexie';

/**
 * Migration 61 → 62: adds optional `sheetFitToViewport` index on characterPages (no row migration).
 */
export async function migrate61to62(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; existing rows omit the field (treated as false).
}
