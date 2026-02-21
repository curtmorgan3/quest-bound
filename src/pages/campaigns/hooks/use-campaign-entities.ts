import { useCampaign, useCampaignCharacters, useCharacters } from '@/lib/compass-api';
import type { ActiveCharacter } from '@/types';
import { useMemo } from 'react';

export const useCampaignEntities = ({
  campaignId,
  selectedIds,
  locationId,
}: {
  selectedIds: Set<string>;
  campaignId?: string;
  locationId?: string | null;
}) => {
  const campaign = useCampaign(campaignId);
  const rulesetId = campaign?.rulesetId;
  const charactersForRuleset = useCharacters(rulesetId);
  const { campaignCharacters } = useCampaignCharacters(campaignId);

  const characterIdsInCampaign = useMemo(
    () => new Set(campaignCharacters.map((cc) => cc.characterId)),
    [campaignCharacters],
  );

  const campaignPlayerCharacters = useMemo(
    () => charactersForRuleset.filter((c) => characterIdsInCampaign.has(c.id) && c.isNpc !== true),
    [charactersForRuleset, characterIdsInCampaign],
  );
  const campaignNpcs = useMemo(
    () => charactersForRuleset.filter((c) => characterIdsInCampaign.has(c.id) && c.isNpc === true),
    [charactersForRuleset, characterIdsInCampaign],
  );

  const activePlayerCharacters: ActiveCharacter[] = campaignPlayerCharacters.map((character) => {
    const campaignCharacter = campaignCharacters.find((cc) => cc.characterId === character.id)!;
    return {
      ...character,
      ...campaignCharacter,
      characterId: character.id,
      campaignCharacterId: campaignCharacter.id,
    };
  });

  const activeNpcs: ActiveCharacter[] = campaignNpcs.map((character) => {
    const campaignCharacter = campaignCharacters.find((cc) => cc.characterId === character.id)!;
    return {
      ...character,
      ...campaignCharacter,
      characterId: character.id,
      campaignCharacterId: campaignCharacter.id,
    };
  });

  const selectedPlayerCharacters: ActiveCharacter[] = useMemo(
    () => activePlayerCharacters.filter((cc) => selectedIds.has(cc.id)),
    [activePlayerCharacters, selectedIds],
  );

  const selectedNpcs: ActiveCharacter[] = useMemo(
    () => activeNpcs.filter((cc) => selectedIds.has(cc.id)),
    [activeNpcs, selectedIds],
  );

  const selectedCharacters = [...selectedNpcs, ...selectedPlayerCharacters];

  const charactersInThisLocation = activePlayerCharacters.filter(
    (c) => c.currentLocationId === locationId || (!locationId && c.currentLocationId === null),
  );

  return {
    activePlayerCharacters,
    activeNpcs,
    selectedPlayerCharacters,
    selectedNpcs,
    selectedCharacters,
    charactersInThisLocation,
  };
};
