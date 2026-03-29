import type { Transaction } from 'dexie';

/**
 * Migration 60 → 61: adds `composites` and `compositeVariants` tables (no row migration).
 */
export async function migrate60to61(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; tables are created by Dexie from dbSchemaV61.
}
