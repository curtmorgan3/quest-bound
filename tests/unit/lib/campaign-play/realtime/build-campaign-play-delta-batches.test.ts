import {
  resolveCampaignCharacterIdsForActionResultDelta,
} from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import { describe, expect, it, vi } from 'vitest';

describe('resolveCampaignCharacterIdsForActionResultDelta', () => {
  it('includes acting character and roster members with attributes updated since start', async () => {
    const startedAtMs = Date.now();
    const recent = new Date(startedAtMs + 1000).toISOString();
    const old = new Date(startedAtMs - 60_000).toISOString();

    const campaignCharacters = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { characterId: 'char-a', deleted: undefined },
            { characterId: 'char-b', deleted: undefined },
          ]),
        }),
      }),
    };

    const characterAttributes = {
      get: vi.fn().mockResolvedValue(undefined),
      where: vi.fn((idx: string) => {
        if (idx === 'characterId') {
          return {
            equals: vi.fn((cid: string) => ({
              toArray: vi.fn().mockImplementation(async () => {
                if (cid === 'char-a') {
                  return [{ id: 'a1', characterId: 'char-a', updatedAt: old }];
                }
                if (cid === 'char-b') {
                  return [{ id: 'b1', characterId: 'char-b', updatedAt: recent }];
                }
                return [];
              }),
            })),
          };
        }
        throw new Error(`unexpected index ${idx}`);
      }),
    };

    const inventoryItems = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const database = { campaignCharacters, characterAttributes, inventoryItems } as never;

    const ids = await resolveCampaignCharacterIdsForActionResultDelta(database, 'camp-1', {
      actingCharacterId: 'char-a',
      startedAtMs,
    });

    expect(ids.sort()).toEqual(['char-a', 'char-b'].sort());
  });

  it('adds owner of modifiedAttributeIds when attribute row exists on roster', async () => {
    const startedAtMs = Date.now();

    const campaignCharacters = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ characterId: 'char-b' }]),
        }),
      }),
    };

    const characterAttributes = {
      get: vi.fn().mockImplementation(async (id: string) =>
        id === 'attr-y' ? { id: 'attr-y', characterId: 'char-b', updatedAt: new Date().toISOString() } : undefined,
      ),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const inventoryItems = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const database = { campaignCharacters, characterAttributes, inventoryItems } as never;

    const ids = await resolveCampaignCharacterIdsForActionResultDelta(database, 'camp-1', {
      actingCharacterId: 'char-a',
      startedAtMs,
      modifiedAttributeIds: ['attr-y'],
    });

    expect(ids).toContain('char-a');
    expect(ids).toContain('char-b');
  });
});
