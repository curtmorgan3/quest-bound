import {
  extractCharacterIdsFromManualBatches,
  validateCampaignManualUpdate,
} from '@/lib/campaign-play/realtime/validate-campaign-manual-update';
import type { DB } from '@/stores/db/hooks/types';
import { describe, expect, it } from 'vitest';

function mockDb(firstCampaignCharacter: { deleted?: boolean } | null): DB {
  return {
    campaignCharacters: {
      where: () => ({
        equals: () => ({
          first: async () => firstCampaignCharacter,
        }),
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
});

describe('extractCharacterIdsFromManualBatches', () => {
  it('dedupes character ids', () => {
    const ids = extractCharacterIdsFromManualBatches([
      {
        table: 'inventoryItems',
        rows: [
          { characterId: 'c1' },
          { characterId: 'c1' },
          { characterId: 'c2' },
        ],
      },
    ]);
    expect(ids.sort()).toEqual(['c1', 'c2']);
  });
});
