import {
  useCampaignCharacters,
  useCampaignEventLocations,
  useCampaignEvents,
  useCampaignItems,
  useCharacter,
} from '@/lib/compass-api';
import type { CampaignEventType, Location } from '@/types';
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
  const { createCampaignEvent, deleteCampaignEvent } = useCampaignEvents(campaignId);

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

  const handleCreateCampaignEvent = useCallback(
    async (
      tile: { locationId: string; tileId: string },
      label: string,
      type: CampaignEventType,
    ) => {
      if (!campaignId) return;
      const eventId = await createCampaignEvent(campaignId, { label, type });
      if (eventId) {
        await createCampaignEventLocation(eventId, tile.locationId, tile.tileId);
      }
    },
    [campaignId, createCampaignEvent, createCampaignEventLocation],
  );

  const handleRemoveCampaignEvent = useCallback(
    async (campaignEventId: string) => {
      await deleteCampaignEventLocation(campaignEventId);
      await deleteCampaignEvent(campaignEventId);
    },
    [deleteCampaignEventLocation, deleteCampaignEvent],
  );

  return {
    handleCreateCampaignCharacter,
    handleDeleteCampaignCharacter,
    handleCreateCampaignEvent,
    handleRemoveCampaignEvent,
    handleRemoveCampaginItem,
    handleCreateCampaignItem,
  };
};
