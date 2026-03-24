import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { splitRowsIntoBulkPutBatchesApprox } from '@/lib/campaign-play/realtime/campaign-realtime-batch';
import type { DB } from '@/stores/db/hooks/types';

function rowRecord<T extends object>(row: T): Record<string, unknown> {
  return { ...row } as Record<string, unknown>;
}

/**
 * Snapshot Dexie rows touched by a host action/item script for broadcast to joiners.
 */
export async function buildCampaignActionResultBatches(
  database: DB,
  characterId: string,
  attributeRowIds: string[],
  startedAtMs: number,
): Promise<CampaignRealtimeBulkPutBatchV1[]> {
  const batches: CampaignRealtimeBulkPutBatchV1[] = [];
  const uniqueAttrIds = Array.from(new Set(attributeRowIds.filter(Boolean)));
  if (uniqueAttrIds.length > 0) {
    const attrs = (await database.characterAttributes.bulkGet(uniqueAttrIds)).filter(Boolean);
    if (attrs.length > 0) {
      batches.push({
        table: 'characterAttributes',
        rows: attrs.map((r) => rowRecord(r)),
      });
    }
  }

  const inv = await database.inventoryItems.where('characterId').equals(characterId).toArray();
  const invChanged = inv.filter((r) => {
    const t = new Date(r.updatedAt).getTime();
    return Number.isFinite(t) && t + 500 >= startedAtMs;
  });
  if (invChanged.length > 0) {
    batches.push({
      table: 'inventoryItems',
      rows: invChanged.map((r) => rowRecord(r)),
    });
  }

  return batches;
}

export function expandCampaignBatchesForRealtimeLimit(
  batches: CampaignRealtimeBulkPutBatchV1[],
): CampaignRealtimeBulkPutBatchV1[] {
  const out: CampaignRealtimeBulkPutBatchV1[] = [];
  for (const b of batches) {
    out.push(...splitRowsIntoBulkPutBatchesApprox(b.table, b.rows));
  }
  return out;
}
