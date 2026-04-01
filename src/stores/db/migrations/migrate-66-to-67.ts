import type { Transaction } from 'dexie';

/**
 * Migration 66 → 67: optional `editorStateTarget` on components (editor-only; no row migration).
 */
export async function migrate66to67(_tx: Transaction): Promise<void> {
  // Schema-only upgrade; field defaults on read (treat unset as base).
}
