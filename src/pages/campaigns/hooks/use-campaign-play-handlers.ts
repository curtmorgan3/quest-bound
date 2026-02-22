import {
  useCampaignCharacters,
  useCampaignEventLocations,
  useCampaignItems,
  useCharacter,
} from '@/lib/compass-api';
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
  const { createCampaignCharacter, deleteCampaignCharacter } = useCampaignCharacters(campaignId);
  const { createCampaignItem, deleteCampaignItem } = useCampaignItems(campaignId);

  const { createCampaignEventLocation, deleteCampaignEventLocation } =
    useCampaignEventLocations(undefined);

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

  const handleDeleteCampaignCharacter = useCallback(
    async (campaignCharacterId: string) => {
      deleteCampaignCharacter(campaignCharacterId);
    },
    [deleteCampaignCharacter],
  );

  const handleCreateCampaignItem = useCallback(
    async (tile: { locationId: string; tileId: string }, itemId: string) => {
      if (!campaignId) return;
      await createCampaignItem(campaignId, {
        itemId,
        currentLocationId: tile.locationId,
        currentTileId: tile.tileId,
      });
    },
    [campaignId, createCampaignItem],
  );

  const handleRemoveCampaginItem = useCallback(
    async (campaignItemId: string) => {
      await deleteCampaignItem(campaignItemId);
    },
    [deleteCampaignItem],
  );

  const handleAddEventToTile = useCallback(
    async (tile: { locationId: string; tileId: string }, campaignEventId: string) => {
      console.log(tile, campaignEventId);
      await createCampaignEventLocation(campaignEventId, tile.locationId, tile.tileId);
    },
    [createCampaignEventLocation],
  );

  const handleRemoveEventFromTile = useCallback(
    async (campaignEventLocationId: string) => {
      await deleteCampaignEventLocation(campaignEventLocationId);
    },
    [deleteCampaignEventLocation],
  );

  return {
    handleCreateCampaignCharacter,
    handleDeleteCampaignCharacter,
    handleAddEventToTile,
    handleRemoveEventFromTile,
    handleRemoveCampaginItem,
    handleCreateCampaignItem,
  };
};
