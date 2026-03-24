import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import type { DB } from '@/stores/db/hooks/types';

/** Tables allowed for Phase 2 campaign realtime ingest (soft-delete + session entities). */
const REALTIME_INGEST_TABLES = new Set<string>([
  'campaignCharacters',
  'inventoryItems',
  'characterAttributes',
  'characterArchetypes',
  'scriptLogs',
  'campaignScenes',
]);

/**
 * Apply host-broadcast rows with the same guard as cloud sync pull: `isSyncing` skips Dexie sync hooks.
 */
export async function applyCampaignRealtimeBatches(
  database: DB,
  batches: CampaignRealtimeBulkPutBatchV1[],
): Promise<void> {
  const { setSyncing } = useSyncStateStore.getState();
  setSyncing(true);
  try {
    for (const batch of batches) {
      if (!REALTIME_INGEST_TABLES.has(batch.table)) continue;
      const table = (database as unknown as Record<string, { bulkPut: (r: unknown[]) => Promise<void> }>)[
        batch.table
      ];
      if (table?.bulkPut) {
        await table.bulkPut(batch.rows);
      }
    }
  } finally {
    setSyncing(false);
  }
}
