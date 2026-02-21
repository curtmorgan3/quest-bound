import {
  useCampaign,
  useCampaignCharacters,
  useCampaignEventLocations,
  useCampaignEvents,
  useCampaignItems,
  useCharacter,
  type EventLocationWithEvent,
} from '@/lib/compass-api';
import type { CampaignCharacter, CampaignEventType, CampaignItem } from '@/types';
import { useCallback } from 'react';

type entityAtTile = {
  character: CampaignCharacter | undefined;
  item: CampaignItem | undefined;
  event: EventLocationWithEvent | undefined;
} | null;

interface UseCampaignEditHandlers {
  campaignId?: string;
  entityAtTile: entityAtTile;
  setTileMenu: (id: null) => void;
  setMovingEventLocationId: (id: string) => void;
}

export const useCampaignEditHandlers = ({
  campaignId,
  entityAtTile,
  setTileMenu,
  setMovingEventLocationId,
}: UseCampaignEditHandlers) => {
  const { createCharacter } = useCharacter();
  const campaign = useCampaign(campaignId);

  const { createCampaignCharacter, updateCampaignCharacter } = useCampaignCharacters(campaignId);

  const { createCampaignItem, deleteCampaignItem } = useCampaignItems(campaignId);

  const { createCampaignEvent, deleteCampaignEvent } = useCampaignEvents(campaignId);

  const { createCampaignEventLocation, deleteCampaignEventLocation, updateCampaignEventLocation } =
    useCampaignEventLocations(undefined);

  const handleRemoveCharacter = useCallback(async () => {
    if (!entityAtTile?.character) return;
    await updateCampaignCharacter(entityAtTile.character.id, {
      currentLocationId: null,
      currentTileId: null,
    });
    setTileMenu(null);
  }, [entityAtTile?.character, updateCampaignCharacter]);

  const handleRemoveItem = useCallback(async () => {
    if (!entityAtTile?.item) return;
    await deleteCampaignItem(entityAtTile.item.id);
    setTileMenu(null);
  }, [entityAtTile?.item, deleteCampaignItem]);

  const handleRemoveEvent = useCallback(async () => {
    if (!entityAtTile?.event) return;
    await deleteCampaignEventLocation(entityAtTile.event.id);
    await deleteCampaignEvent(entityAtTile.event.campaignEventId);
    setTileMenu(null);
  }, [entityAtTile?.event, deleteCampaignEventLocation, deleteCampaignEvent]);

  const handleMoveEvent = useCallback((eventLocationId: string) => {
    setMovingEventLocationId(eventLocationId);
    setTileMenu(null);
  }, []);

  const onCreateCharacter = useCallback(
    async (tile: { locationId: string; tileId: string }, archetypeId: string) => {
      if (!campaignId || !campaign?.rulesetId) return;
      const newCharId = await createCharacter({
        rulesetId: campaign.rulesetId,
        archetypeIds: [archetypeId],
        isNpc: true,
      });
      if (newCharId) {
        await createCampaignCharacter(campaignId, newCharId, {
          currentLocationId: tile.locationId,
          currentTileId: tile.tileId,
        });
      }
    },
    [campaignId, campaign?.rulesetId, createCharacter, createCampaignCharacter],
  );

  const onCreateItem = useCallback(
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

  const onCreateEvent = useCallback(
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

  return {
    handleMoveEvent,
    handleRemoveCharacter,
    handleRemoveItem,
    handleRemoveEvent,
    onCreateCharacter,
    onCreateEvent,
    onCreateItem,
    updateCampaignEventLocation,
  };
};
