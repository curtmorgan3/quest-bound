/**
 * Manual migration runner. Use when you need to run the 41→42 migration without relying on app load.
 *
 * From the app (e.g. a temporary admin button or page):
 *   import { db } from '@/stores';
 *   import { runMigration41to42Manually } from '@/stores/db/migrations/run-migration-manually';
 *   const result = await runMigration41to42Manually(db);
 *   console.log(result.ok ? result.message : result.message);
 *
 * From the browser console (with app open):
 *   const { db } = await import('/src/stores/db/db.ts');
 *   const { runMigration41to42Manually } = await import('/src/stores/db/migrations/run-migration-manually.ts');
 *   await runMigration41to42Manually(db);
 */
import type Dexie from 'dexie';
import { migrate41to42 } from './migrate-41-to-42';

export type ManualMigrationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

const MIGRATION_TABLES = [
  'rulesetPages',
  'pages',
  'rulesetWindows',
  'characterPages',
  'characters',
] as const;

/**
 * Run the 41→42 migration manually (transfer RulesetPage.rulesetId to Page, update windows, expand characterPages).
 *
 * Only works when the database still has the `rulesetPages` store (i.e. before the DB has been upgraded to
 * version 43). After a normal app load with v43 schema, `rulesetPages` is removed and this will return an error.
 *
 * Use cases:
 * - Testing the migration in dev (e.g. with a DB snapshot at v41).
 * - Triggering the migration from an admin UI or console without reloading.
 *
 * @param db - The Dexie instance (e.g. from `import { db } from '@/stores'`).
 */
export async function runMigration41to42Manually(db: Dexie): Promise<ManualMigrationResult> {
  try {
    await db.transaction('rw', [...MIGRATION_TABLES], async (tx) => {
      await migrate41to42(tx);
    });
    return { ok: true, message: 'Migration 41→42 completed.' };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    const hint = message.includes('rulesetPages') || message.includes('not found')
      ? ' The DB may already be at v43 (rulesetPages removed). Manual run only works when the DB is still at v41 or v42.'
      : '';
    return {
      ok: false,
      message: message + hint,
    };
  }
}
