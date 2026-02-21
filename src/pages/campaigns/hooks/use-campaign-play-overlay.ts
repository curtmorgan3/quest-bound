import type { LocationViewerOverlayNode } from '@/components/locations';
import {
  useCampaignCharacters,
  useCampaignItems,
  type EventLocationWithEvent,
} from '@/lib/compass-api';
import { db } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

interface UseCampaignPlayOverlay {
  campaignId?: string;
  currentLocationId: string | null;
  eventLocationsWithEvent: EventLocationWithEvent[];
}

export const useCampaignPlayOverlay = ({
  campaignId,
  currentLocationId,
  eventLocationsWithEvent,
}: UseCampaignPlayOverlay) => {
  const { campaignCharacters } = useCampaignCharacters(campaignId);
  const { campaignItems } = useCampaignItems(campaignId);

  const itemsAtLocation = useMemo(
    () =>
      campaignItems.filter((ci) => ci.currentLocationId === currentLocationId && ci.currentTileId),
    [campaignItems, currentLocationId],
  );

  const charactersAtLocation = useMemo(
    () =>
      campaignCharacters.filter(
        (cc) => cc.currentLocationId === currentLocationId && cc.currentTileId,
      ),
    [campaignCharacters, currentLocationId],
  );

  const charactersResolved = useLiveQuery(async () => {
    if (charactersAtLocation.length === 0) return [];
    const chars = await db.characters.bulkGet(charactersAtLocation.map((cc) => cc.characterId));
    return charactersAtLocation.map((cc) => ({
      campaignCharacter: cc,
      character: chars.find((c) => c?.id === cc.characterId) ?? null,
    }));
  }, [charactersAtLocation.map((c) => c.id).join(',')]);

  const itemsResolved = useLiveQuery(async () => {
    if (itemsAtLocation.length === 0) return [];
    const itemRecs = await db.items.bulkGet(itemsAtLocation.map((ci) => ci.itemId));
    return itemsAtLocation.map((ci) => ({
      campaignItem: ci,
      item: itemRecs.find((i) => i?.id === ci.itemId) ?? null,
    }));
  }, [itemsAtLocation.map((i) => i.id).join(',')]);

  const overlayNodes = useMemo((): LocationViewerOverlayNode[] => {
    const nodes: LocationViewerOverlayNode[] = [];
    (charactersResolved ?? []).forEach(({ campaignCharacter, character }) => {
      if (!campaignCharacter.currentTileId) return;
      const sprites = character?.sprites ?? [];
      const imageUrl = sprites.length > 0 ? null : (character?.image ?? null);
      nodes.push({
        id: `char-${campaignCharacter.id}`,
        tileId: campaignCharacter.currentTileId,
        type: 'character',
        imageUrl,
        label: character?.name ?? 'Character',
        sprites: sprites.length > 0 ? sprites : undefined,
        mapWidth: campaignCharacter.mapWidth ?? 1,
        mapHeight: campaignCharacter.mapHeight ?? 1,
      });
    });
    (itemsResolved ?? []).forEach(({ campaignItem, item }) => {
      if (!campaignItem.currentTileId) return;
      const sprites = item?.sprites ?? [];
      const imageUrl = sprites.length > 0 ? null : (item?.image ?? null);
      nodes.push({
        id: `item-${campaignItem.id}`,
        tileId: campaignItem.currentTileId,
        type: 'item',
        imageUrl,
        label: item?.title ?? 'Item',
        sprites: sprites.length > 0 ? sprites : undefined,
        mapWidth: campaignItem.mapWidth ?? 1,
        mapHeight: campaignItem.mapHeight ?? 1,
      });
    });
    return nodes;
  }, [charactersResolved, itemsResolved]);

  const eventTileIds = useMemo(
    () => eventLocationsWithEvent.filter((el) => el.tileId).map((el) => el.tileId as string),
    [eventLocationsWithEvent],
  );

  return {
    overlayNodes,
    eventTileIds,
  };
};
