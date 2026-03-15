/**
 * Registers deleting hooks on all synced tables to record deletes for sync_deletes.
 * Single place so every local delete is recorded once.
 */

import { SYNC_TABLE_CONFIGS } from '@/lib/cloud/sync/sync-tables';
import { getSyncState, recordSyncDelete } from '@/lib/cloud/sync/sync-state';
import type { DB } from './types';

export function registerSyncDeleteHooks(db: DB): void {
  for (const config of SYNC_TABLE_CONFIGS) {
    const table = (db as unknown as Record<string, { hook: (event: string, fn: (primKey: unknown, obj?: unknown) => void) => void }>)[config.tableName];
    if (!table?.hook) continue;
    table.hook('deleting', (primKey, obj) => {
      if (getSyncState().isSyncing) return;
      recordSyncDelete(db, config.tableName, String(primKey), obj as Record<string, unknown> | undefined).catch(() => {});
    });
  }
}
