import type { Transaction } from 'dexie';

/**
 * Migration 65 → 66: optional `states` on components, `componentActiveStates` on characterWindows (no row migration).
 */
export async function migrate65to66(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; new fields default on read (stringify [] / {}).
}
