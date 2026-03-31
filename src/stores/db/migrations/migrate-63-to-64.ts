import type { Transaction } from 'dexie';

/**
 * Migration 63 → 64: adds optional `customProperties` on characterAttributes (no row migration).
 */
export async function migrate63to64(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; existing rows omit the field until next sync / attribute edit.
}
