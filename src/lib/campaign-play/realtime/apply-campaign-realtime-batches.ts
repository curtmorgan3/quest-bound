import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import type { DB } from '@/stores/db/hooks/types';

async function normalizeInventoryItemRowsForIngest(
  database: DB,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    rows.map(async (row) => {
      const cid = row.characterId;
      if (typeof cid === 'string' && cid.trim() !== '') return row;

      const invId = row.inventoryId;
      if (typeof invId === 'string' && invId.trim() !== '') {
        const inv = (await database.inventories.get(invId.trim())) as { characterId?: string } | undefined;
        const ic = inv?.characterId;
        if (typeof ic === 'string' && ic.trim() !== '') {
          return { ...row, characterId: ic.trim() };
        }
      }

      const id = row.id;
      if (typeof id === 'string' && id.trim() !== '') {
        const existing = (await database.inventoryItems.get(id.trim())) as { characterId?: string } | undefined;
        const ec = existing?.characterId;
        if (typeof ec === 'string' && ec.trim() !== '') {
          return { ...row, characterId: ec.trim() };
        }
      }

      return row;
    }),
  );
}

/** Tables allowed for Phase 2 campaign realtime ingest (soft-delete + session entities). */
const REALTIME_INGEST_TABLES = new Set<string>([
  'campaignCharacters',
  'characters',
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
        const rows =
          batch.table === 'inventoryItems'
            ? await normalizeInventoryItemRowsForIngest(database, batch.rows)
            : batch.rows;
        await table.bulkPut(rows);
      }
    }
  } finally {
    setSyncing(false);
  }
}
