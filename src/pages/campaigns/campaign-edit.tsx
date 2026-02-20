import { LocationViewer, getTopTileDataAt } from '@/components/locations';
import type { LocationViewerOverlayNode } from '@/components/locations/location-viewer';
import { Button } from '@/components/ui/button';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useAssets,
  useCampaign,
  useCampaignCharacters,
  useCampaignEventLocations,
  useCampaignEventLocationsByLocation,
  useCampaignEvents,
  useCampaignItems,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import { useCharacter } from '@/lib/compass-api/hooks/characters/use-character';
import { db } from '@/stores';
import type {
  CampaignCharacter,
  CampaignEventType,
  CampaignItem,
  Character,
  Item,
  TileData,
} from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampaignEditTileMenu } from './campaign-edit-tile-menu';

export function CampaignEdit() {
  const { campaignId, locationId: locationIdParam } = useParams<{
    campaignId: string;
    locationId?: string;
  }>();
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const world = useWorld(campaign?.worldId);
  const selectedLocationId = locationIdParam ?? null;
  const { locations: rootLocations, updateLocation } = useLocations(campaign?.worldId, null);
  const currentLocation = useLocation(selectedLocationId ?? undefined);
  const { locations: childLocations } = useLocations(campaign?.worldId, selectedLocationId);
  const { updateCampaignEventLocation } = useCampaignEventLocations(undefined);
  const { assets } = useAssets(null);
  const { createCharacter } = useCharacter();
  const { campaignCharacters, createCampaignCharacter, updateCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const { campaignItems, createCampaignItem, updateCampaignItem, deleteCampaignItem } =
    useCampaignItems(campaignId);
  const { createCampaignEvent, deleteCampaignEvent } = useCampaignEvents(campaignId);
  const { createCampaignEventLocation, deleteCampaignEventLocation } =
    useCampaignEventLocations(undefined);
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    selectedLocationId ?? undefined,
  );

  const [movingEventLocationId, setMovingEventLocationId] = useState<string | null>(null);
  const [tileMenu, setTileMenu] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    /** Set when we just created a blank tile; use as tileId until location refetches. */
    createdTileId?: string;
  } | null>(null);

  const getAssetData = useCallback(
    (assetId: string) => assets?.find((a) => a.id === assetId)?.data ?? null,
    [assets],
  );

  const locationsList = selectedLocationId ? childLocations : rootLocations;

  const handleAdvanceToLocation = useCallback(
    (locationId: string) => {
      if (!campaignId) return;
      navigate(`/campaigns/${campaignId}/locations/${locationId}/edit`);
    },
    [campaignId, navigate],
  );

  const handleOpenMap = useCallback(
    (locationId: string) => {
      if (!campaignId) return;
      navigate(`/campaigns/${campaignId}/locations/${locationId}/edit`);
    },
    [campaignId, navigate],
  );

  const handleBack = useCallback(() => {
    if (!campaignId) return;
    if (currentLocation?.parentLocationId) {
      navigate(`/campaigns/${campaignId}/locations/${currentLocation.parentLocationId}/edit`);
    } else {
      navigate(`/campaigns/${campaignId}/edit`);
    }
  }, [campaignId, currentLocation?.parentLocationId, navigate]);

  const openTileMenuAt = useCallback(
    async (x: number, y: number, clientX: number, clientY: number) => {
      if (!currentLocation) return;
      const tiles = currentLocation.tiles ?? [];
      let top = getTopTileDataAt(tiles, x, y);
      if (!top) {
        const newTile: TileData = {
          id: crypto.randomUUID(),
          x,
          y,
          zIndex: 0,
          isPassable: true,
        };
        await updateLocation(currentLocation.id, { tiles: [...tiles, newTile] });
        setTileMenu({ x, y, clientX, clientY, createdTileId: newTile.id });
        return;
      }
      setTileMenu({ x, y, clientX, clientY });
    },
    [currentLocation, updateLocation],
  );

  const handleOverlayClick = useCallback(
    (tileId: string, e: React.MouseEvent) => {
      if (!currentLocation?.tiles) return;
      const tile = currentLocation.tiles.find((t) => t.id === tileId);
      if (!tile) return;
      setTileMenu({
        x: tile.x,
        y: tile.y,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [currentLocation],
  );

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
      let imageUrl: string | null = null;
      if (character?.sprites?.[0]) {
        imageUrl = getAssetData(character.sprites[0]) ?? null;
      }
      if (!imageUrl && character?.image) imageUrl = character.image;
      nodes.push({
        id: `char-${campaignCharacter.id}`,
        tileId: campaignCharacter.currentTileId,
        type: 'character',
        imageUrl,
        label: character?.name ?? 'Character',
        dragPayload: { type: 'campaign-character', id: campaignCharacter.id },
      });
    });
    (itemsResolved ?? []).forEach(({ campaignItem, item }) => {
      if (!campaignItem.currentTileId) return;
      let imageUrl: string | null = null;
      if (item?.assetId) imageUrl = getAssetData(item.assetId) ?? null;
      if (!imageUrl && item?.image) imageUrl = item.image;
      nodes.push({
        id: `item-${campaignItem.id}`,
        tileId: campaignItem.currentTileId,
        type: 'item',
        imageUrl,
        label: item?.title ?? 'Item',
        dragPayload: { type: 'campaign-item', id: campaignItem.id },
      });
    });
    return nodes;
  }, [charactersResolved, itemsResolved, getAssetData]);

  const tileMenuTileId = useMemo(() => {
    if (!tileMenu || !currentLocation?.tiles) return null;
    const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
    return top?.id ?? null;
  }, [tileMenu, currentLocation?.tiles]);

  /** Tile id for the menu: from existing tile at cell, or from a blank tile we just created. */
  const effectiveTileId = tileMenuTileId ?? tileMenu?.createdTileId ?? null;

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

  const eventTileIds = useMemo(
    () => eventLocationsWithEvent.filter((el) => el.tileId).map((el) => el.tileId as string),
    [eventLocationsWithEvent],
  );

  const onCreateCharacter = useCallback(
    async (tile: { locationId: string; tileId: string }, archetypeId: string) => {
      if (!campaignId || !campaign?.rulesetId) return;
      const newCharId = await createCharacter({
        rulesetId: campaign.rulesetId,
        archetypeIds: [archetypeId],
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

  const handleSelectCell = useCallback(
    async (x: number, y: number, e: React.MouseEvent | undefined) => {
      if (!currentLocation || !selectedLocationId) return;
      if (movingEventLocationId != null) {
        const tiles = currentLocation.tiles ?? [];
        let targetTile = getTopTileDataAt(tiles, x, y);
        if (!targetTile) {
          const newTile: TileData = {
            id: crypto.randomUUID(),
            x,
            y,
            zIndex: 0,
            isPassable: true,
          };
          await updateLocation(currentLocation.id, { tiles: [...tiles, newTile] });
          targetTile = newTile;
        }
        await updateCampaignEventLocation(movingEventLocationId, {
          locationId: selectedLocationId,
          tileId: targetTile.id,
        });
        setMovingEventLocationId(null);
        return;
      }
      openTileMenuAt(x, y, e?.clientX ?? 0, e?.clientY ?? 0);
    },
    [
      currentLocation,
      selectedLocationId,
      movingEventLocationId,
      updateLocation,
      updateCampaignEventLocation,
      openTileMenuAt,
    ],
  );

  const handleDrop = useCallback(
    async (x: number, y: number, e: React.DragEvent) => {
      if (!currentLocation || !selectedLocationId) return;
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      let payload: { type: string; id: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      const tiles = currentLocation.tiles ?? [];
      let targetTile = getTopTileDataAt(tiles, x, y);
      if (!targetTile) {
        const newTile: TileData = {
          id: crypto.randomUUID(),
          x,
          y,
          zIndex: 0,
          isPassable: true,
        };
        await updateLocation(currentLocation.id, { tiles: [...tiles, newTile] });
        targetTile = newTile;
      }
      if (payload.type === 'campaign-character') {
        await updateCampaignCharacter(payload.id, {
          currentLocationId: selectedLocationId,
          currentTileId: targetTile.id,
        });
      } else if (payload.type === 'campaign-item') {
        await updateCampaignItem(payload.id, {
          currentLocationId: selectedLocationId,
          currentTileId: targetTile.id,
        });
      }
    },
    [
      currentLocation,
      selectedLocationId,
      updateLocation,
      updateCampaignCharacter,
      updateCampaignItem,
    ],
  );

  if (campaignId && campaign === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }
  if (!campaign || !world) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <p className='text-muted-foreground'>Campaign or world not found</p>
        <Button variant='outline' onClick={() => navigate('/campaigns')}>
          Back to campaigns
        </Button>
      </div>
    );
  }

  const showMap = selectedLocationId && currentLocation?.hasMap;

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
        <button
          type='button'
          className='text-muted-foreground hover:text-foreground'
          onClick={() => navigate(`/campaigns/${campaignId}`)}>
          Campaign
        </button>
        <ChevronRight className='h-4 w-4 text-muted-foreground' />
        <span className='font-medium text-foreground'>{world.label}</span>
        {currentLocation && (
          <>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
            <span className='font-medium text-foreground'>{currentLocation.label}</span>
          </>
        )}
        {movingEventLocationId != null && (
          <span className='text-muted-foreground text-sm'>Click a tile to move the event</span>
        )}
        {(selectedLocationId || currentLocation?.parentLocationId) && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleBack}
            data-testid='campaign-edit-back'
            className='clickable'>
            <ArrowUp className='h-4 w-4' />
          </Button>
        )}
      </div>
      <div className='min-h-0 flex-1 p-4'>
        {!showMap && (
          <div className='h-full min-h-[400px]'>
            <WorldViewer
              locations={locationsList}
              onAdvanceToLocation={handleAdvanceToLocation}
              onOpenMap={handleOpenMap}
              translateExtent={[
                [-2000, -2000],
                [2000, 2000],
              ]}
            />
          </div>
        )}
        {showMap && selectedLocationId && (
          <div className='h-full flex justify-center items-center'>
            <LocationViewer
              locationId={selectedLocationId}
              worldId={campaign.worldId}
              getAssetData={getAssetData}
              onSelectCell={handleSelectCell}
              tileRenderSize={currentLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
              onDrop={handleDrop}
              onOverlayClick={handleOverlayClick}
            />
          </div>
        )}
      </div>

      {tileMenu && currentLocation && effectiveTileId && (
        <CampaignEditTileMenu
          position={{ clientX: tileMenu.clientX, clientY: tileMenu.clientY }}
          tile={{ locationId: currentLocation.id, tileId: effectiveTileId }}
          entityAtTile={entityAtTile}
          rulesetId={campaign?.rulesetId}
          onClose={() => setTileMenu(null)}
          onCreateCharacter={onCreateCharacter}
          onCreateItem={onCreateItem}
          onCreateEvent={onCreateEvent}
          onRemoveCharacter={handleRemoveCharacter}
          onRemoveItem={handleRemoveItem}
          onRemoveEvent={handleRemoveEvent}
          onMoveEvent={handleMoveEvent}
        />
      )}
    </div>
  );
}
