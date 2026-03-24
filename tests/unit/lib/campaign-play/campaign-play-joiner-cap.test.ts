import {
  CAMPAIGN_PLAY_MAX_JOINERS,
  countCampaignPlayJoinerSlots,
} from '@/lib/campaign-play/campaign-play-joiner-cap';
import type { CampaignCharacter, Character } from '@/types';
import { describe, expect, it } from 'vitest';

describe('countCampaignPlayJoinerSlots', () => {
  it('counts non-NPC characters whose userId is not the host', () => {
    const host = 'host-uid';
    const cc: CampaignCharacter[] = [
      {
        id: 'cc1',
        characterId: 'c1',
        campaignId: 'camp',
        createdAt: 't',
        updatedAt: 't',
      },
      {
        id: 'cc2',
        characterId: 'c2',
        campaignId: 'camp',
        createdAt: 't',
        updatedAt: 't',
      },
    ];
    const chars = new Map<string, Character>([
      [
        'c1',
        {
          id: 'c1',
          userId: host,
          rulesetId: 'r',
          inventoryId: 'i',
          name: 'Host PC',
          assetId: null,
          isTestCharacter: false,
          componentData: {},
          pinnedSidebarDocuments: [],
          pinnedSidebarCharts: [],
          createdAt: 't',
          updatedAt: 't',
        },
      ],
      [
        'c2',
        {
          id: 'c2',
          userId: 'guest-uid',
          rulesetId: 'r',
          inventoryId: 'i2',
          name: 'Guest',
          assetId: null,
          isTestCharacter: false,
          componentData: {},
          pinnedSidebarDocuments: [],
          pinnedSidebarCharts: [],
          createdAt: 't',
          updatedAt: 't',
        },
      ],
    ]);
    expect(countCampaignPlayJoinerSlots(cc, chars, host)).toBe(1);
  });

  it('exports cap constant', () => {
    expect(CAMPAIGN_PLAY_MAX_JOINERS).toBe(5);
  });
});
