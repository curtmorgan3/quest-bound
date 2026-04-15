import type { CampaignCharacter, Character } from '@quest-bound/types';

/** Client-side cap for Phase 2 (1 host + 5 joiners); not enforced on the server. */
export const CAMPAIGN_PLAY_MAX_JOINERS = 5;

/**
 * Counts non-NPC campaign characters whose `Character.userId` differs from the host's cloud id
 * (treated as guest/joiner slots for cap UX).
 */
export function countCampaignPlayJoinerSlots(
  campaignCharacters: CampaignCharacter[],
  charactersById: Map<string, Character>,
  hostCloudUserId: string,
): number {
  let n = 0;
  for (const cc of campaignCharacters) {
    if (cc.deleted) continue;
    const ch = charactersById.get(cc.characterId);
    if (!ch || ch.isNpc) continue;
    if (ch.userId !== hostCloudUserId) n++;
  }
  return n;
}
