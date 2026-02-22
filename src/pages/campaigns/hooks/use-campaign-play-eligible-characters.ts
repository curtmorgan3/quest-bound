import { useCampaignCharacters, useCharacter } from '@/lib/compass-api';
import type { CampaignCharacter, Character } from '@/types';

export type EligibleCharacterEntry = {
  character: Character;
  existingCc: CampaignCharacter | undefined;
};

interface UseCampaignPlayEligibleCharacters {
  campaignId: string | undefined;
  rulesetId: string | undefined;
}

export const useCampaignPlayEligibleCharacters = ({
  campaignId,
  rulesetId,
}: UseCampaignPlayEligibleCharacters): EligibleCharacterEntry[] => {
  const { characters } = useCharacter();
  const { campaignCharacters } = useCampaignCharacters(campaignId);

  const eligible = characters.filter(
    (c) => c.rulesetId === rulesetId && c.isNpc !== true,
  );

  return eligible.map((character) => ({
    character,
    existingCc: campaignCharacters.find((cc) => cc.characterId === character.id),
  }));
};
