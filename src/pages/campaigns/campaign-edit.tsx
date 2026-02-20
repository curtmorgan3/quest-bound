import type { LocationViewerOverlayNode } from '@/components/locations/location-viewer';
import { LocationViewer, getTopTileDataAt } from '@/components/locations/location-viewer';
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
  const { locations: rootLocations } = useLocations(campaign?.worldId, null);
  const currentLocation = useLocation(selectedLocationId ?? undefined);
  const { locations: childLocations } = useLocations(campaign?.worldId, selectedLocationId);
  const { assets } = useAssets(null);
  const { createCharacter } = useCharacter();
  const { campaignCharacters, createCampaignCharacter, updateCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const { campaignItems, createCampaignItem, deleteCampaignItem } = useCampaignItems(campaignId);
  const { createCampaignEvent, deleteCampaignEvent } = useCampaignEvents(campaignId);
  const { createCampaignEventLocation, deleteCampaignEventLocation } =
    useCampaignEventLocations(undefined);
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    selectedLocationId ?? undefined,
  );

  const [tileMenu, setTileMenu] = useState<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
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
    (x: number, y: number, clientX: number, clientY: number) => {
      if (!currentLocation?.tiles) return;
      const top = getTopTileDataAt(currentLocation.tiles, x, y);
      if (!top) return;
      setTileMenu({ x, y, clientX, clientY });
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
  }, [charactersAtLocation.map((c) => c.id).join(',')]);
  const itemsResolved = useLiveQuery(async (): Promise<
    Array<{ campaignItem: CampaignItem; item: Item | null }>
  > => {
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
      });
    });
    return nodes;
  }, [charactersResolved, itemsResolved, getAssetData]);

  const tileMenuTileId = useMemo(() => {
    if (!tileMenu || !currentLocation?.tiles) return null;
    const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
    return top?.id ?? null;
  }, [tileMenu, currentLocation?.tiles]);

  const entityAtTile = useMemo(() => {
    if (!selectedLocationId || !tileMenuTileId) return null;
    const cc = campaignCharacters.find(
      (c) => c.currentLocationId === selectedLocationId && c.currentTileId === tileMenuTileId,
    );
    const ci = campaignItems.find(
      (c) => c.currentLocationId === selectedLocationId && c.currentTileId === tileMenuTileId,
    );
    const ev = eventLocationsWithEvent.find(
      (e) => e.locationId === selectedLocationId && e.tileId === tileMenuTileId,
    );
    return { character: cc, item: ci, event: ev };
  }, [
    selectedLocationId,
    tileMenuTileId,
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
              onSelectCell={(x, y, e) => {
                const top = currentLocation?.tiles
                  ? getTopTileDataAt(currentLocation.tiles, x, y)
                  : null;
                if (top) openTileMenuAt(x, y, e?.clientX ?? 0, e?.clientY ?? 0);
              }}
              tileRenderSize={currentLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
            />
          </div>
        )}
      </div>

      {tileMenu && currentLocation?.tiles && tileMenuTileId && (
        <CampaignEditTileMenu
          position={{ clientX: tileMenu.clientX, clientY: tileMenu.clientY }}
          tile={{ locationId: currentLocation.id, tileId: tileMenuTileId }}
          entityAtTile={entityAtTile}
          rulesetId={campaign?.rulesetId}
          onClose={() => setTileMenu(null)}
          onCreateCharacter={onCreateCharacter}
          onCreateItem={onCreateItem}
          onCreateEvent={onCreateEvent}
          onRemoveCharacter={handleRemoveCharacter}
          onRemoveItem={handleRemoveItem}
          onRemoveEvent={handleRemoveEvent}
        />
      )}
    </div>
  );
}
