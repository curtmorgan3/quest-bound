import type { CampaignCharacter, Character } from '@/types';
import { db } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';

export type CampaignCharacterWithName = {
  cc: CampaignCharacter;
  character: Character | null;
};

interface UseCampaignPlayCharacterList {
  campaignCharacters: CampaignCharacter[];
}

export const useCampaignPlayCharacterList = ({
  campaignCharacters,
}: UseCampaignPlayCharacterList): CampaignCharacterWithName[] => {
  const resolved = useLiveQuery(async (): Promise<CampaignCharacterWithName[]> => {
    if (campaignCharacters.length === 0) return [];
    const chars = await db.characters.bulkGet(campaignCharacters.map((cc) => cc.characterId));
    return campaignCharacters.map((cc) => ({
      cc,
      character: chars.find((c) => c?.id === cc.characterId) ?? null,
    }));
  }, [campaignCharacters.map((c) => c.characterId).join(',')]);

  return resolved ?? [];
};
