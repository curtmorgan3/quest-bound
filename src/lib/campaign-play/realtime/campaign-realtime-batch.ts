import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';

/**
 * Stay under Realtime payload limits (platform-dependent; use a conservative default).
 * @see https://supabase.com/docs/guides/realtime — split large `bulkPut` batches across envelopes in later phases.
 */
export const DEFAULT_CAMPAIGN_REALTIME_MAX_BATCH_BYTES = 256_000;

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Split rows for one table into multiple batches by approximate serialized UTF-8 size.
 */
export function splitRowsIntoBulkPutBatchesApprox(
  table: string,
  rows: Record<string, unknown>[],
  maxBytes: number = DEFAULT_CAMPAIGN_REALTIME_MAX_BATCH_BYTES,
): CampaignRealtimeBulkPutBatchV1[] {
  if (rows.length === 0) return [];

  const batches: CampaignRealtimeBulkPutBatchV1[] = [];
  let current: Record<string, unknown>[] = [];
  let currentSize = 0;

  const flush = () => {
    if (current.length > 0) {
      batches.push({ table, rows: current });
      current = [];
      currentSize = 0;
    }
  };

  for (const row of rows) {
    const rowBytes = utf8ByteLength(JSON.stringify(row));
    if (current.length > 0 && currentSize + rowBytes > maxBytes) {
      flush();
    }
    current.push(row);
    currentSize += rowBytes;
  }
  flush();

  return batches;
}
