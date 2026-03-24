import { applyCampaignRealtimeBatches } from '@/lib/campaign-play/realtime/apply-campaign-realtime-batches';
import { describe, expect, it, vi } from 'vitest';

describe('applyCampaignRealtimeBatches', () => {
  it('ignores unknown tables (loop prevention / whitelist)', async () => {
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const database = {
      characterAttributes: { bulkPut },
      unknownTable: { bulkPut: vi.fn() },
    } as never;

    await applyCampaignRealtimeBatches(database, [
      { table: 'not_a_realtime_table', rows: [{ id: '1' }] },
      { table: 'characterAttributes', rows: [{ id: 'a1', characterId: 'c1' }] },
    ]);

    expect(bulkPut).toHaveBeenCalledTimes(1);
    expect(bulkPut).toHaveBeenCalledWith([{ id: 'a1', characterId: 'c1' }]);
  });
});
