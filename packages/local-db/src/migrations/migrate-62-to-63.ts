import type { Transaction } from 'dexie';

/**
 * Migration 62 → 63: adds optional `customProperties` index on actions and attributes (no row migration).
 */
export async function migrate62to63(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; existing rows omit the field.
}
