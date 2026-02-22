import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components';
import { getTopTileDataAt, LocationViewer } from '@/components/locations';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useCampaign,
  useCampaignEventLocationsByLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import { useCampaignContext } from '@/stores';
import type { TileData, TileMenuPayload } from '@/types';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CampaignCharacterSheet, JumpToCharacter, TileMenu } from './campaign-controls';
import { useCampaignPlayOverlay } from './hooks';

export function CampaignPlay() {
  const { campaignId } = useParams<{ campaignId: string; locationId?: string }>();
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const world = useWorld(campaign?.worldId);

  const {
    viewingLocationId,
    navigateTo,
    navigateBack,
    selectedCharacters,
    addSelectedCharacter,
    removeSelectedCharacter,
    campaignPlayerCharacters,
    campaignNpcs,
    charactersInThisLocation,
    toggleCharacterSelection,
    currentLocation,
    playerCharactersInThisLocation,
  } = useCampaignContext();

  const selectedIds = useMemo(
    () => new Set(selectedCharacters.map((c) => c.id)),
    [selectedCharacters],
  );

  const { locations: locationsList, updateLocation } = useLocations(
    campaign?.worldId,
    viewingLocationId,
  );
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    viewingLocationId ?? undefined,
  );
  const { overlayNodes, eventTileIds, tileMenu, onTileMenuRequest, lastClickedTileId } =
    useCampaignPlayOverlay({
      campaignId,
      currentLocationId: currentLocation?.id ?? null,
      eventLocationsWithEvent,
      selectedCharacterIds: selectedIds,
      charactersInThisLocation,
    });

  const eventAtClickedTile = useMemo(
    () => eventLocationsWithEvent.find((el) => el.tileId === tileMenu?.tileId) ?? null,
    [eventLocationsWithEvent, tileMenu?.tileId],
  );

  const handleAdvanceView = useCallback(
    (locationId: string) => {
      navigateTo(locationId);
    },
    [navigateTo],
  );

  const handleBackView = useCallback(() => {
    navigateBack();
  }, [navigateBack]);

  const handleCreateTileAt = useCallback(
    async (x: number, y: number): Promise<string | null> => {
      if (!currentLocation) return null;
      const tiles = currentLocation.tiles ?? [];
      const existing = getTopTileDataAt(tiles, x, y);
      if (existing) return existing.id;
      const newTile: TileData = {
        id: crypto.randomUUID(),
        x,
        y,
        zIndex: 0,
        isPassable: true,
      };
      await updateLocation(currentLocation.id, { tiles: [...tiles, newTile] });
      return newTile.id;
    },
    [currentLocation, updateLocation],
  );

  const handleOverlayClick = useCallback(
    (tileId: string, e?: React.MouseEvent) => {
      const shiftHeld = e?.shiftKey;

      const allAtLocation = [...campaignPlayerCharacters, ...campaignNpcs];
      const charactersAtTile = allAtLocation.filter(
        (c) => c.currentLocationId === viewingLocationId && c.currentTileId === tileId,
      );
      const idsAtTile = new Set(charactersAtTile.map((c) => c.id));

      if (!shiftHeld) {
        allAtLocation
          .filter((c) => selectedIds.has(c.id) && !idsAtTile.has(c.id))
          .forEach((c) => removeSelectedCharacter(c.id));
      }

      const anyAlreadySelected = charactersAtTile.some((c) => selectedIds.has(c.id));
      if (anyAlreadySelected) {
        charactersAtTile.forEach((c) => removeSelectedCharacter(c.id));
      } else {
        charactersAtTile.forEach((c) => addSelectedCharacter(c.id));
      }
    },
    [
      campaignPlayerCharacters,
      campaignNpcs,
      viewingLocationId,
      selectedIds,
      addSelectedCharacter,
      removeSelectedCharacter,
    ],
  );

  const handleClickFromSheet = (payload: TileMenuPayload) => {
    onTileMenuRequest(payload);
  };

  const showLocationView = Boolean(viewingLocationId && currentLocation?.hasMap);

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
            <Button
              variant='ghost'
              size='sm'
              onClick={handleBackView}
              data-testid='campaign-play-back'
              className='clickable'>
              <ArrowUp className='h-4 w-4' />
            </Button>
          </>
        )}
        <div className='ml-auto flex gap-2'>
          <CampaignCharacterSheet />
          <div className='flex gap-2'>
            {playerCharactersInThisLocation.map((character) => (
              <button
                type='button'
                key={character.id}
                onClick={() => toggleCharacterSelection(character.id)}
                className='rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                aria-label={
                  selectedIds.has(character.id) ? 'Deselect character' : 'Select character'
                }>
                <Avatar
                  className={cn(
                    'size-8 shrink-0 rounded-md',
                    selectedIds.has(character.id) && 'ring-2 ring-primary',
                  )}>
                  <AvatarImage src={character?.image ?? ''} alt={character?.name ?? 'Character'} />
                  <AvatarFallback className='rounded-md text-xs'>
                    {(character?.name ?? '?').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>

          <JumpToCharacter />
        </div>
      </div>
      <div className='min-h-0 flex-1 p-4'>
        {!showLocationView && (
          <div className='h-full min-h-[400px]'>
            <WorldViewer
              locations={locationsList}
              onAdvanceToLocation={handleAdvanceView}
              onOpenMap={handleAdvanceView}
              translateExtent={[
                [-2000, -2000],
                [2000, 2000],
              ]}
            />
          </div>
        )}
        {showLocationView && viewingLocationId && (
          <div className='flex h-full items-center justify-center'>
            <TileMenu
              onTileMenuRequest={onTileMenuRequest}
              tileMenu={tileMenu}
              lastClickedTileId={lastClickedTileId}
              eventAtClickedTile={eventAtClickedTile}
              campaignId={campaignId}
            />

            <LocationViewer
              locationId={viewingLocationId}
              worldId={campaign.worldId}
              tileRenderSize={currentLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
              highlightedTileId={tileMenu?.tileId ?? null}
              playMode
              onTileMenuRequest={onTileMenuRequest}
              onCreateTileAt={handleCreateTileAt}
              onOverlayClick={handleOverlayClick}
              onSheetBackdropClick={handleClickFromSheet}
            />
          </div>
        )}
      </div>
    </div>
  );
}
