import { describe, expect, it } from 'vitest';

import {
  extractCharacterIdsFromManualBatches,
  validateCampaignManualUpdate,
} from '@/lib/campaign-play/realtime/validate-campaign-manual-update';
import type { DB } from '@/stores/db/hooks/types';

function mockDb(
  compoundFirst: { deleted?: boolean } | null,
  inventoriesById: Record<string, { characterId?: string }> = {},
): DB {
  return mockCampaignCharactersDb(
    compoundFirst == null ? [] : [compoundFirst],
    [],
    inventoriesById,
  );
}

/** Supports compound index + campaignId fallback used by resolveActiveCampaignCharacter. */
function mockCampaignCharactersDb(
  compoundRows: Array<{
    deleted?: boolean;
    characterId?: string;
    campaignId?: string;
    id?: string;
  }>,
  rosterByCampaign: Array<{
    deleted?: boolean;
    characterId?: string;
    campaignId?: string;
    id?: string;
  }>,
  inventoriesById: Record<string, { characterId?: string }> = {},
): DB {
  return {
    campaignCharacters: {
      where: (index: string) => ({
        equals: () => {
          if (index === '[campaignId+characterId]') {
            return { toArray: async () => compoundRows };
          }
          if (index === 'campaignId') {
            return { toArray: async () => rosterByCampaign };
          }
          return { toArray: async () => [] };
        },
      }),
    },
    inventories: {
      get: async (id: string) => inventoriesById[id],
    },
  } as unknown as DB;
}

describe('validateCampaignManualUpdate', () => {
  it('rejects empty batches', async () => {
    const r = await validateCampaignManualUpdate(mockDb({ deleted: false }), 'c1', []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('empty_batches');
  });

  it('rejects disallowed tables', async () => {
    const r = await validateCampaignManualUpdate(mockDb({ deleted: false }), 'c1', [
      { table: 'characters', rows: [{ id: 'x' }] },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('table_not_allowed');
  });

  it('rejects rows without characterId', async () => {
    const r = await validateCampaignManualUpdate(mockDb({ deleted: false }), 'c1', [
      { table: 'characterAttributes', rows: [{ id: 'a1' }] },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('no_character');
  });

  it('rejects when character is not in campaign', async () => {
    const r = await validateCampaignManualUpdate(mockDb(null), 'c1', [
      { table: 'characterAttributes', rows: [{ id: 'a1', characterId: 'ch1' }] },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('character_not_in_campaign');
  });

  it('accepts valid manual batches', async () => {
    const r = await validateCampaignManualUpdate(mockDb({ deleted: false }), 'c1', [
      { table: 'characterAttributes', rows: [{ id: 'a1', characterId: 'ch1' }] },
    ]);
    expect(r).toEqual({ ok: true, characterIds: ['ch1'] });
  });

  it('accepts when compound index misses but roster row matches (e.g. UUID case)', async () => {
    const rosterRow = {
      id: 'cc1',
      campaignId: 'c1',
      characterId: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      deleted: false,
    };
    const db = mockCampaignCharactersDb([], [rosterRow]);
    const r = await validateCampaignManualUpdate(db, 'c1', [
      {
        table: 'characterAttributes',
        rows: [{ id: 'a1', characterId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }],
      },
    ]);
    expect(r).toEqual({
      ok: true,
      characterIds: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
    });
  });

  it('accepts when compound matches list tombstone before active row', async () => {
    const db = mockCampaignCharactersDb(
      [
        { id: 'old', campaignId: 'c1', characterId: 'ch1', deleted: true },
        { id: 'new', campaignId: 'c1', characterId: 'ch1', deleted: false },
      ],
      [],
    );
    const r = await validateCampaignManualUpdate(db, 'c1', [
      { table: 'characterAttributes', rows: [{ id: 'a1', characterId: 'ch1' }] },
    ]);
    expect(r).toEqual({ ok: true, characterIds: ['ch1'] });
  });

  it('accepts when campaign roster lists tombstone before active row for same characterId', async () => {
    const db = mockCampaignCharactersDb(
      [],
      [
        { id: 'old', campaignId: 'c1', characterId: 'ch1', deleted: true },
        { id: 'new', campaignId: 'c1', characterId: 'ch1', deleted: false },
      ],
    );
    const r = await validateCampaignManualUpdate(db, 'c1', [
      { table: 'characterAttributes', rows: [{ id: 'a1', characterId: 'ch1' }] },
    ]);
    expect(r).toEqual({ ok: true, characterIds: ['ch1'] });
  });

  it('accepts inventoryItems without characterId when inventoryId resolves on host', async () => {
    const db = mockDb({ deleted: false }, { inv1: { characterId: 'ch1' } });
    const r = await validateCampaignManualUpdate(db, 'c1', [
      {
        table: 'inventoryItems',
        rows: [{ id: 'ii1', inventoryId: 'inv1', entityId: 'e1', quantity: 1 }],
      },
    ]);
    expect(r).toEqual({ ok: true, characterIds: ['ch1'] });
  });

  it('rejects inventoryItems without characterId when inventory is missing', async () => {
    const r = await validateCampaignManualUpdate(mockDb({ deleted: false }, {}), 'c1', [
      {
        table: 'inventoryItems',
        rows: [{ id: 'ii1', inventoryId: 'missing', entityId: 'e1', quantity: 1 }],
      },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('inventory_not_found');
  });

  it('rejects inventoryItems with neither characterId nor inventoryId', async () => {
    const r = await validateCampaignManualUpdate(mockDb({ deleted: false }), 'c1', [
      {
        table: 'inventoryItems',
        rows: [{ id: 'ii1', entityId: 'e1', quantity: 1 }],
      },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('inventory_item_missing_scope');
  });
});

describe('extractCharacterIdsFromManualBatches', () => {
  it('dedupes character ids', () => {
    const ids = extractCharacterIdsFromManualBatches([
      {
        table: 'inventoryItems',
        rows: [{ characterId: 'c1' }, { characterId: 'c1' }, { characterId: 'c2' }],
      },
    ]);
    expect(ids.sort()).toEqual(['c1', 'c2']);
  });
});
