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

  it('fills characterId on inventoryItems from inventory when missing', async () => {
    const bulkPut = vi.fn().mockResolvedValue(undefined);
    const database = {
      inventoryItems: { bulkPut, get: vi.fn() },
      inventories: {
        get: vi.fn().mockResolvedValue({ characterId: 'ch1' }),
      },
    } as never;

    await applyCampaignRealtimeBatches(database, [
      {
        table: 'inventoryItems',
        rows: [{ id: 'ii1', inventoryId: 'inv1', quantity: 2 }],
      },
    ]);

    expect(bulkPut).toHaveBeenCalledWith([
      { id: 'ii1', inventoryId: 'inv1', quantity: 2, characterId: 'ch1' },
    ]);
  });
});
