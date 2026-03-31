import type { Transaction } from 'dexie';

/**
 * Migration 64 → 65: adds optional `attributeCustomPropertyValues` on characterAttributes (no row migration).
 */
export async function migrate64to65(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; values are populated on next ruleset sync or user edit.
}
