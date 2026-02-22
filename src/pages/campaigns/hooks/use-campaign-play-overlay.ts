import type { LocationViewerOverlayNode } from '@/components/locations';
import { useCampaignItems, type EventLocationWithEvent } from '@/lib/compass-api';
import { db } from '@/stores';
import type { ActiveCharacter } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo, useRef, useState } from 'react';

export type TileMenuPayload = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  tileId: string;
};

export type TileMenu = {
  clientX: number;
  clientY: number;
  tileId: string;
} | null;

interface UseCampaignPlayOverlay {
  campaignId?: string;
  currentLocationId: string | null;
  eventLocationsWithEvent: EventLocationWithEvent[];
  /** Campaign character ids that are currently selected (used to set overlay node selected state). */
  selectedCharacterIds?: Set<string>;
  charactersInThisLocation: ActiveCharacter[];
}

export const useCampaignPlayOverlay = ({
  campaignId,
  currentLocationId,
  eventLocationsWithEvent,
  selectedCharacterIds,
  charactersInThisLocation,
}: UseCampaignPlayOverlay) => {
  const { campaignItems } = useCampaignItems(campaignId);
  const lastClickedTileId = useRef<string | null>(null);

  const itemsAtLocation = useMemo(
    () =>
      campaignItems.filter((ci) => ci.currentLocationId === currentLocationId && ci.currentTileId),
    [campaignItems, currentLocationId],
  );

  const itemsResolved = useLiveQuery(async () => {
    if (itemsAtLocation.length === 0) return [];
    const itemRecs = await db.items.bulkGet(itemsAtLocation.map((ci) => ci.itemId));
    return itemsAtLocation.map((ci) => ({
      campaignItem: ci,
      item: itemRecs.find((i) => i?.id === ci.itemId) ?? null,
    }));
  }, [itemsAtLocation.map((i) => `${i.id}:${i.currentTileId}`).join(',')]);

  const [tileMenu, setTileMenu] = useState<TileMenu>(null);

  const onTileMenuRequest = useCallback((payload: TileMenuPayload | null) => {
    if (!payload) {
      setTileMenu(null);
      return;
    }

    lastClickedTileId.current = payload.tileId;

    setTileMenu({
      clientX: payload.clientX,
      clientY: payload.clientY,
      tileId: payload.tileId,
    });
  }, []);

  const overlayNodes = useMemo((): LocationViewerOverlayNode[] => {
    const nodes: LocationViewerOverlayNode[] = [];
    (charactersInThisLocation ?? []).forEach((activeChacter) => {
      if (!activeChacter.currentTileId) return;
      const sprites = activeChacter?.sprites ?? [];
      const imageUrl = sprites.length > 0 ? null : (activeChacter?.image ?? null);
      nodes.push({
        id: `char-${activeChacter.id}`,
        tileId: activeChacter.currentTileId,
        type: 'character',
        imageUrl,
        label: activeChacter?.name ?? 'Character',
        sprites: sprites.length > 0 ? sprites : undefined,
        mapWidth: activeChacter.mapWidth ?? 1,
        mapHeight: activeChacter.mapHeight ?? 1,
        selected: selectedCharacterIds?.has(activeChacter.id),
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
  }, [charactersInThisLocation, itemsResolved, selectedCharacterIds]);

  const eventTileIds = useMemo(
    () => eventLocationsWithEvent.filter((el) => el.tileId).map((el) => el.tileId as string),
    [eventLocationsWithEvent],
  );

  return {
    overlayNodes,
    eventTileIds,
    onTileMenuRequest,
    tileMenu,
    lastClickedTileId: lastClickedTileId.current,
  };
};
