import type { Transaction } from 'dexie';

/**
 * Migration 69 → 70: `sticky` boolean added to ruleset/character windows (no backfill required).
 */
export async function migrate69to70(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; missing `sticky` treated as false at runtime.
}
