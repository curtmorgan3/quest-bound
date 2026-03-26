import { describe, expect, it } from 'vitest';

import {
  extractCharacterIdsFromManualBatches,
  validateCampaignManualUpdate,
} from '@/lib/campaign-play/realtime/validate-campaign-manual-update';
import type { DB } from '@/stores/db/hooks/types';

function mockDb(compoundFirst: { deleted?: boolean } | null): DB {
  return mockCampaignCharactersDb(compoundFirst == null ? [] : [compoundFirst], []);
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
    expect(r).toEqual({ ok: true });
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
    expect(r).toEqual({ ok: true });
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
    expect(r).toEqual({ ok: true });
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
    expect(r).toEqual({ ok: true });
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
