import { getTopTileDataAt } from '@/components/locations';
import { useCampaignCharacters, useCharacter } from '@/lib/compass-api';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import type { Location } from '@/types';
import { useCallback } from 'react';

interface UseCampaignPlayHandlers {
  campaignId?: string;
  currentLocation: Location | undefined;
  rulesetId?: string;
}

export const useCampaignPlayHandlers = ({
  campaignId,
  currentLocation,
  rulesetId,
}: UseCampaignPlayHandlers) => {
  const { createCharacter } = useCharacter();
  const { createCampaignCharacter } = useCampaignCharacters(campaignId);

  // TODO: script execution requires a character, but location events won't have them
  const characterIdParam = '';
  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (!currentLocation?.tiles || !characterIdParam) return;
      const top = getTopTileDataAt(currentLocation.tiles, x, y);
      if (top?.actionId) {
        const client = getQBScriptClient();
        client.executeActionEvent(top.actionId, characterIdParam, null, 'on_activate');
      }
    },
    [currentLocation?.tiles, characterIdParam],
  );

  const handleCreateCampaignCharacter = useCallback(
    async (archetypeId: string, tileId?: string) => {
      if (!campaignId || !rulesetId) return;
      const newCharId = await createCharacter({
        rulesetId,
        archetypeIds: [archetypeId],
        isNpc: true,
      });
      if (newCharId) {
        await createCampaignCharacter(campaignId, newCharId, {
          currentLocationId: currentLocation?.id ?? undefined,
          currentTileId: tileId,
        });
      }
    },
    [campaignId, rulesetId, currentLocation?.id, createCharacter, createCampaignCharacter],
  );

  const handleUpdateCampaignCharacter = () => {};

  return {
    handleTileClick,
    handleCreateCampaignCharacter,
  };
};
