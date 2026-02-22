import type { CampaignCharacter, Character } from './data-model-types';

export type ActiveCharacter = Character &
  CampaignCharacter & {
    characterId: string;
    campaignCharacterId: string;
  };
