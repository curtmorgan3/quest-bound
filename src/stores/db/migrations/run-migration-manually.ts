/**
 * Manual migration runner. Use when you need to run a migration without relying on app load.
 *
 * From the app (e.g. a temporary admin button or page):
 *   import { db } from '@/stores';
 *   import { runMigration43to44Manually } from '@/stores/db/migrations/run-migration-manually';
 *   const result = await runMigration43to44Manually(db);
 *
 * From the browser console (with app open and db exposed as window.__QB_DB__):
 *   See agents/assets-migration-console-snippet.md for the pasteable snippet.
 */
import type Dexie from 'dexie';
import { migrate41to42 } from './migrate-41-to-42';
import { migrate43to44 } from './migrate-43-to-44';

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

const MIGRATION_43_TO_44_TABLES = [
  'assets',
  'users',
  'rulesets',
  'characters',
  'charts',
  'documents',
  'attributes',
  'actions',
  'items',
  'archetypes',
  'worlds',
  'characterPages',
  'components',
] as const;

/**
 * Run the 43→44 migration manually (directory removal, URL-on-entity → URL assets).
 *
 * Use when the DB is stuck at v42/v43 and you want to run the migration without reloading,
 * or for testing. Requires the db instance (e.g. window.__QB_DB__ if exposed).
 */
export async function runMigration43to44Manually(db: Dexie): Promise<ManualMigrationResult> {
  try {
    await db.transaction('rw', [...MIGRATION_43_TO_44_TABLES], async (tx) => {
      await migrate43to44(tx);
    });
    return { ok: true, message: 'Migration 43→44 completed.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}
