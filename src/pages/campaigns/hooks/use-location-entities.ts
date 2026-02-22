import type { LocationViewerOverlayNode } from '@/components/locations';
import {
  useCampaignCharacters,
  useCampaignItems,
  type EventLocationWithEvent,
} from '@/lib/compass-api';
import { db } from '@/stores';
import type { CampaignCharacter, CampaignItem, Character, Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';

interface UseLocationEntities {
  campaignId?: string;
  selectedLocationId: string | null;
  effectiveTileId: string | null;
  eventLocationsWithEvent: EventLocationWithEvent[];
}

export const useLocationEntities = ({
  campaignId,
  selectedLocationId,
  effectiveTileId,
  eventLocationsWithEvent,
}: UseLocationEntities) => {
  const { campaignCharacters } = useCampaignCharacters(campaignId);
  const { campaignItems } = useCampaignItems(campaignId);

  const charactersAtLocation = useMemo(
    () =>
      campaignCharacters.filter(
        (cc) => cc.currentLocationId === selectedLocationId && cc.currentTileId,
      ),
    [campaignCharacters, selectedLocationId],
  );

  const itemsAtLocation = useMemo(
    () =>
      campaignItems.filter((ci) => ci.currentLocationId === selectedLocationId && ci.currentTileId),
    [campaignItems, selectedLocationId],
  );

  // Characters
  const charactersResolved = useLiveQuery(async (): Promise<
    Array<{ campaignCharacter: CampaignCharacter; character: Character | null }>
  > => {
    if (charactersAtLocation.length === 0) return [];
    const chars = await db.characters.bulkGet(charactersAtLocation.map((cc) => cc.characterId));
    return charactersAtLocation.map((cc) => ({
      campaignCharacter: cc,
      character: chars.find((c) => c?.id === cc.characterId) ?? null,
    }));
  }, [charactersAtLocation.map((c) => `${c.id}:${c.currentTileId}`).join(',')]);

  // Items
  const itemsResolved = useLiveQuery(async (): Promise<
    Array<{ campaignItem: CampaignItem; item: Item | null }>
  > => {
    if (itemsAtLocation.length === 0) return [];
    const itemRecs = await db.items.bulkGet(itemsAtLocation.map((ci) => ci.itemId));
    return itemsAtLocation.map((ci) => ({
      campaignItem: ci,
      item: itemRecs.find((i) => i?.id === ci.itemId) ?? null,
    }));
  }, [itemsAtLocation.map((i) => `${i.id}:${i.currentTileId}`).join(',')]);

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
        dragPayload: { type: 'campaign-character', id: campaignCharacter.id },
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
        dragPayload: { type: 'campaign-item', id: campaignItem.id },
      });
    });
    return nodes;
  }, [charactersResolved, itemsResolved]);

  const entityAtTile = useMemo(() => {
    if (!selectedLocationId || !effectiveTileId) return null;
    const cc = campaignCharacters.find(
      (c) => c.currentLocationId === selectedLocationId && c.currentTileId === effectiveTileId,
    );
    const ci = campaignItems.find(
      (c) => c.currentLocationId === selectedLocationId && c.currentTileId === effectiveTileId,
    );
    const ev = eventLocationsWithEvent.find(
      (e) => e.locationId === selectedLocationId && e.tileId === effectiveTileId,
    );
    return { character: cc, item: ci, event: ev };
  }, [
    selectedLocationId,
    effectiveTileId,
    campaignCharacters,
    campaignItems,
    eventLocationsWithEvent,
  ]);

  return {
    overlayNodes,
    entityAtTile,
  };
};
