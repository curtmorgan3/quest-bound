import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components';
import { getTopTileDataAt, LocationViewer } from '@/components/locations';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useCampaign,
  useCampaignEventLocationsByLocation,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import type { TileData } from '@/types';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaignContext } from './campaign-provider';
import { useCampaignPlayOverlay } from './hooks';

export function CampaignPlay() {
  const { campaignId, locationId } = useParams<{ campaignId: string; locationId?: string }>();
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
    moveSelectedCharactersTo,
    jumpToCharacter,
    campaignPlayerCharacters,
  } = useCampaignContext();

  const charactersInThisLocation = campaignPlayerCharacters.filter(
    (c) => c.currentLocationId === locationId || (!locationId && c.currentLocationId === null),
  );

  const hasPlayerCharactersElsewhere = campaignPlayerCharacters.some(
    (c) => c.currentLocationId !== viewingLocationId,
  );

  const selectedIds = useMemo(
    () => new Set(selectedCharacters.map((c) => c.id)),
    [selectedCharacters],
  );

  const toggleCharacterSelection = useCallback(
    (ccId: string) => {
      if (selectedIds.has(ccId)) {
        removeSelectedCharacter(ccId);
      } else {
        addSelectedCharacter(ccId);
      }
    },
    [selectedIds, addSelectedCharacter, removeSelectedCharacter],
  );

  const viewingLocation = useLocation(viewingLocationId ?? undefined);

  const { locations: locationsList, updateLocation } = useLocations(
    campaign?.worldId,
    viewingLocationId,
  );
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    viewingLocationId ?? undefined,
  );
  const [jumpToCharacterOpen, setJumpToCharacterOpen] = useState(false);

  const { overlayNodes, eventTileIds } = useCampaignPlayOverlay({
    campaignId,
    currentLocationId: viewingLocationId,
    eventLocationsWithEvent,
  });

  const handleAdvanceView = useCallback(
    (locationId: string) => {
      navigateTo(locationId);
    },
    [navigateTo],
  );

  const handleBackView = useCallback(() => {
    navigateBack();
  }, [navigateBack]);

  const handleMoveToTile = useCallback(
    (tileId: string) => {
      if (viewingLocationId && selectedCharacters.length > 0) {
        moveSelectedCharactersTo(viewingLocationId, tileId);
      }
    },
    [viewingLocationId, selectedCharacters.length, moveSelectedCharactersTo],
  );

  const handleJumpToCharacter = useCallback(
    (characterId: string) => {
      jumpToCharacter(characterId);
      setJumpToCharacterOpen(false);
    },
    [jumpToCharacter],
  );

  const handleCreateTileAt = useCallback(
    async (x: number, y: number): Promise<string | null> => {
      if (!viewingLocation) return null;
      const tiles = viewingLocation.tiles ?? [];
      const existing = getTopTileDataAt(tiles, x, y);
      if (existing) return existing.id;
      const newTile: TileData = {
        id: crypto.randomUUID(),
        x,
        y,
        zIndex: 0,
        isPassable: true,
      };
      await updateLocation(viewingLocation.id, { tiles: [...tiles, newTile] });
      return newTile.id;
    },
    [viewingLocation, updateLocation],
  );

  const showLocationView = Boolean(viewingLocationId && viewingLocation?.hasMap);
  const singleSelectedCharacterId =
    selectedCharacters.length === 1 ? selectedCharacters[0]!.id : null;

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
        {viewingLocation && (
          <>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
            <span className='font-medium text-foreground'>{viewingLocation.label}</span>
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
          {singleSelectedCharacterId && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigate(`/characters/${singleSelectedCharacterId}`)}>
              Character sheet
            </Button>
          )}
          <div className='flex gap-2'>
            {charactersInThisLocation.map((character) => (
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

          {hasPlayerCharactersElsewhere && (
            <Button variant='outline' size='sm' onClick={() => setJumpToCharacterOpen(true)}>
              Jump to character
            </Button>
          )}
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
            <LocationViewer
              locationId={viewingLocationId}
              worldId={campaign.worldId}
              tileRenderSize={viewingLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
              playMode
              onMoveCharacter={handleMoveToTile}
              onCreateTileAt={handleCreateTileAt}
            />
          </div>
        )}
      </div>

      <Dialog open={jumpToCharacterOpen} onOpenChange={setJumpToCharacterOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Jump to character</DialogTitle>
          </DialogHeader>
          <div className='flex max-h-60 flex-col gap-1 overflow-auto'>
            {campaignPlayerCharacters.map((character) => (
              <button
                key={character.id}
                type='button'
                onClick={() => handleJumpToCharacter(character.characterId)}
                className='flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                <Avatar className='size-8 shrink-0 rounded-md'>
                  <AvatarImage src={character.image ?? ''} alt={character.name ?? 'Character'} />
                  <AvatarFallback className='rounded-md text-xs'>
                    {(character.name ?? '?').slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className='truncate font-medium'>{character.name ?? 'Unknown'}</span>
              </button>
            ))}
            {campaignPlayerCharacters.length === 0 && (
              <p className='py-4 text-center text-sm text-muted-foreground'>
                No player characters in campaign
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
