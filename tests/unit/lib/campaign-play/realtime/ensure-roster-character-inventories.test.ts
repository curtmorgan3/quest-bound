import { ensureInventoriesAfterCampaignRosterIngest } from '@/lib/campaign-play/realtime/ensure-roster-character-inventories';
import type { DB } from '@/stores/db/hooks/types';
import { describe, expect, it, vi } from 'vitest';

describe('ensureInventoriesAfterCampaignRosterIngest', () => {
  it('creates inventory with character inventoryId when row is missing on host', async () => {
    const inventoriesAdd = vi.fn().mockResolvedValue(undefined);
    const database = {
      characters: {
        get: vi.fn().mockResolvedValue({
          id: 'ch1',
          name: 'A',
          rulesetId: 'rs1',
          inventoryId: 'inv-peer',
          createdAt: 't0',
          updatedAt: 't0',
          deleted: false,
        }),
      },
      inventories: {
        get: vi.fn().mockResolvedValue(undefined),
        add: inventoriesAdd,
      },
    } as unknown as DB;

    await ensureInventoriesAfterCampaignRosterIngest(database, [
      {
        table: 'characters',
        rows: [{ id: 'ch1', rulesetId: 'rs1', name: 'A', inventoryId: 'inv-peer' }],
      },
    ]);

    expect(inventoriesAdd).toHaveBeenCalledTimes(1);
    expect(inventoriesAdd.mock.calls[0][0]).toMatchObject({
      id: 'inv-peer',
      characterId: 'ch1',
      rulesetId: 'rs1',
    });
  });

  it('creates inventory and updates character when inventoryId is empty', async () => {
    const inventoriesAdd = vi.fn().mockResolvedValue(undefined);
    const charactersUpdate = vi.fn().mockResolvedValue(undefined);
    const database = {
      characters: {
        get: vi.fn().mockResolvedValue({
          id: 'ch1',
          name: 'B',
          rulesetId: 'rs1',
          inventoryId: '',
          createdAt: 't0',
          updatedAt: 't0',
        }),
        update: charactersUpdate,
      },
      inventories: {
        get: vi.fn(),
        add: inventoriesAdd,
      },
    } as unknown as DB;

    await ensureInventoriesAfterCampaignRosterIngest(database, [
      { table: 'campaignCharacters', rows: [{ characterId: 'ch1', campaignId: 'c1' }] },
    ]);

    expect(inventoriesAdd).toHaveBeenCalledTimes(1);
    const added = inventoriesAdd.mock.calls[0][0] as { id: string; characterId: string };
    expect(added.characterId).toBe('ch1');
    expect(charactersUpdate).toHaveBeenCalledWith('ch1', {
      inventoryId: added.id,
      updatedAt: expect.any(String),
    });
  });

  it('skips tombstoned character rows', async () => {
    const inventoriesAdd = vi.fn();
    const database = {
      characters: { get: vi.fn() },
      inventories: { get: vi.fn(), add: inventoriesAdd },
    } as unknown as DB;

    await ensureInventoriesAfterCampaignRosterIngest(database, [
      { table: 'characters', rows: [{ id: 'ch1', deleted: true, rulesetId: 'rs1' }] },
    ]);

    expect(inventoriesAdd).not.toHaveBeenCalled();
  });
});
