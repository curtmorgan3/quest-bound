import type { Transaction } from 'dexie';

/**
 * Migration 57 → 58: User model for cloud sync.
 * - Add cloudUserId (optional link to cloud auth identity).
 * - Remove rulesets from user records (ruleset listing is now "all in DB" for local users).
 */
export async function migrate57to58(tx: Transaction): Promise<void> {
  const usersTable = tx.table('users');
  const users = await usersTable.toArray();

  for (const user of users) {
    const record = user as Record<string, unknown>;
    const updated: Record<string, unknown> = { ...record };
    delete updated.rulesets;
    if (!('cloudUserId' in updated) || updated.cloudUserId === undefined) {
      updated.cloudUserId = null;
    }
    await usersTable.put(updated);
  }
}
