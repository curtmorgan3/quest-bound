import { cloudClient } from '@/lib/cloud/client';
import type { SyncMergeConflict } from '@/lib/cloud/sync/sync-merge-conflict-types';
import { applySingleStagedUpsert } from '@/lib/cloud/sync/sync-pull';
import { addSuppressedPullDelete } from '@/lib/cloud/sync/sync-state';
import type { DB } from '@/stores/db/hooks/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function listUnresolvedSyncMergeConflicts(
  db: DB,
  rulesetId: string,
): Promise<SyncMergeConflict[]> {
  return db.syncMergeConflicts
    .where('rulesetId')
    .equals(rulesetId)
    .filter((c) => c.resolvedAt == null)
    .toArray();
}

export async function resolveSyncMergeConflict(
  db: DB,
  conflictId: string,
  resolution: 'local' | 'remote' | 'merged',
  mergedRow?: Record<string, unknown>,
): Promise<{ error?: string }> {
  const row = await db.syncMergeConflicts.get(conflictId);
  if (!row || row.resolvedAt != null) {
    return { error: 'Conflict not found or already resolved.' };
  }

  const client = cloudClient as SupabaseClient | null;
  const now = new Date().toISOString();

  if (row.kind === 'delete') {
    if (resolution === 'remote') {
      const delTable = (db as unknown as Record<string, { delete: (id: string) => Promise<void> }>)[
        row.tableName
      ];
      if (delTable?.delete) {
        try {
          await delTable.delete(row.entityId);
        } catch {
          /* row may already be gone */
        }
      }
    } else {
      const local = resolution === 'local' ? row.localSnapshot : mergedRow;
      if (!local || typeof local !== 'object') {
        return { error: 'Invalid row to keep.' };
      }
      const id = (local as { id?: unknown }).id;
      if (id !== row.entityId) {
        return { error: 'Row id must match the conflict entity.' };
      }
      const bulkPutTable = (
        db as unknown as Record<string, { bulkPut: (objs: unknown[]) => Promise<void> } | undefined>
      )[row.tableName];
      if (!bulkPutTable?.bulkPut) {
        return { error: 'Cannot write table.' };
      }
      await bulkPutTable.bulkPut([{ ...local, updatedAt: now }]);
      await addSuppressedPullDelete({
        rulesetId: row.rulesetId,
        tableName: row.tableName,
        entityId: row.entityId,
      });
    }
    await db.syncMergeConflicts.update(conflictId, { resolvedAt: now });
    return {};
  }

  const bulkPutTable = (
    db as unknown as Record<string, { bulkPut: (objs: unknown[]) => Promise<void> } | undefined>
  )[row.tableName];
  if (!bulkPutTable?.bulkPut) {
    return { error: 'Cannot write table.' };
  }

  if (resolution === 'local') {
    if (!row.localSnapshot) return { error: 'No local snapshot.' };
    await bulkPutTable.bulkPut([{ ...row.localSnapshot, updatedAt: now }]);
  } else if (resolution === 'remote') {
    if (!row.remoteSnapshot) return { error: 'No remote snapshot.' };
    if (row.tableName === 'assets' || row.tableName === 'fonts') {
      if (!client) return { error: 'Cloud not configured' };
      await applySingleStagedUpsert(db, client, row.tableName, { ...row.remoteSnapshot });
    } else {
      await bulkPutTable.bulkPut([{ ...row.remoteSnapshot }]);
    }
  } else {
    if (!mergedRow || typeof mergedRow !== 'object') return { error: 'Invalid merged row.' };
    const id = mergedRow.id;
    if (id !== row.entityId) return { error: 'Row id must match the conflict entity.' };
    await bulkPutTable.bulkPut([{ ...mergedRow, updatedAt: now }]);
  }

  await db.syncMergeConflicts.update(conflictId, { resolvedAt: now });
  return {};
}
