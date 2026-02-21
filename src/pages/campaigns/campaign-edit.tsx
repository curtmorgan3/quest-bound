import { LocationViewer, getTopTileDataAt } from '@/components/locations';
import { Button } from '@/components/ui/button';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useCampaign,
  useCampaignEventLocationsByLocation,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import type { TileData } from '@/types';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampaignEditTileMenu } from './campaign-edit-tile-menu';
import {
  useCampaignEditHandlers,
  useLocationEntities,
  useMapHelpers,
  type TileMenu,
} from './hooks';

export function CampaignEdit() {
  const { campaignId, locationId: locationIdParam } = useParams<{
    campaignId: string;
    locationId?: string;
  }>();
  const selectedLocationId = locationIdParam ?? null;

  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const world = useWorld(campaign?.worldId);
  const { locations: rootLocations, updateLocation } = useLocations(campaign?.worldId, null);
  const { locations: childLocations } = useLocations(campaign?.worldId, selectedLocationId);

  const currentLocation = useLocation(selectedLocationId ?? undefined);

  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    selectedLocationId ?? undefined,
  );
  const [movingEventLocationId, setMovingEventLocationId] = useState<string | null>(null);
  const [tileMenu, setTileMenu] = useState<TileMenu>(null);

  const locationsList = selectedLocationId ? childLocations : rootLocations;

  const tileMenuTileId = useMemo(() => {
    if (!tileMenu || !currentLocation?.tiles) return null;
    const top = getTopTileDataAt(currentLocation.tiles, tileMenu.x, tileMenu.y);
    return top?.id ?? null;
  }, [tileMenu, currentLocation?.tiles]);

  /** Tile id for the menu: from existing tile at cell, or from a blank tile we just created. */
  const effectiveTileId = tileMenuTileId ?? tileMenu?.createdTileId ?? null;

  const { overlayNodes, entityAtTile } = useLocationEntities({
    campaignId,
    selectedLocationId,
    effectiveTileId,
    eventLocationsWithEvent,
  });

  const {
    handleMoveEvent,
    handleRemoveCharacter,
    handleRemoveItem,
    handleRemoveEvent,
    onCreateCharacter,
    onCreateEvent,
    onCreateItem,
    updateCampaignEventLocation,
  } = useCampaignEditHandlers({
    campaignId,
    entityAtTile,
    setMovingEventLocationId,
    setTileMenu,
  });

  const {
    openTileMenuAt,
    handleBack,
    handleDrop,
    handleAdvanceToLocation,
    handleOpenMap,
    handleOverlayClick,
  } = useMapHelpers({
    campaignId,
    setTileMenu,
    currentLocation,
  });

  const eventTileIds = useMemo(
    () => eventLocationsWithEvent.filter((el) => el.tileId).map((el) => el.tileId as string),
    [eventLocationsWithEvent],
  );

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
