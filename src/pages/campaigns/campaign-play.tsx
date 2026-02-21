import { Button, Card } from '@/components';
import { getTopTileDataAt, LocationViewer } from '@/components/locations';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useCampaign,
  useCampaignEventLocationsByLocation,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import type { TileData } from '@/types';
import { ArrowUp, ChevronRight, Users } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaignContext } from './campaign-provider';
import { useCampaignPlayOverlay } from './hooks';

export function CampaignPlay() {
  const { campaignId } = useParams<{ campaignId: string }>();
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
    campaignPlayerCharacters,
  } = useCampaignContext();

  console.log(campaignPlayerCharacters);

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

  const { locations: rootLocations, updateLocation } = useLocations(campaign?.worldId, null);
  const { locations: locationsList } = useLocations(campaign?.worldId, viewingLocationId);
  const { locations: childLocations } = useLocations(campaign?.worldId, viewingLocationId);
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    viewingLocationId ?? undefined,
  );
  const [moveLocationOpen, setMoveLocationOpen] = useState(false);

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

  const handleMoveToLocation = useCallback(
    async (locationId: string) => {
      if (selectedCharacters.length > 0) {
        await moveSelectedCharactersTo(locationId);
      }
      setMoveLocationOpen(false);
    },
    [selectedCharacters.length, moveSelectedCharactersTo],
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm'>
                <Users className='mr-2 h-4 w-4' />
                {selectedCharacters.length > 0
                  ? `${selectedCharacters.length} selected`
                  : 'Select characters'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='max-h-60 overflow-auto'>
              {campaignPlayerCharacters.map((character) => (
                <DropdownMenuCheckboxItem
                  key={character.id}
                  checked={selectedIds.has(character.id)}
                  onCheckedChange={() => toggleCharacterSelection(character.id)}>
                  {character?.name ?? 'Unknown'}
                </DropdownMenuCheckboxItem>
              ))}
              {campaignPlayerCharacters.length === 0 && (
                <span className='px-2 py-1.5 text-sm text-muted-foreground'>
                  No characters in campaign
                </span>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {singleSelectedCharacterId && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigate(`/characters/${singleSelectedCharacterId}`)}>
              Character sheet
            </Button>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={() => setMoveLocationOpen(true)}
            disabled={selectedCharacters.length === 0}>
            Move to location
          </Button>
          <Button variant='ghost' size='sm' onClick={() => navigate(`/campaigns/${campaignId}`)}>
            Back to campaign
          </Button>
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

      {moveLocationOpen && (
        <>
          <div
            className='fixed inset-0 z-10'
            onClick={() => setMoveLocationOpen(false)}
            aria-hidden
          />
          <Card className='fixed left-1/2 top-1/2 z-20 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 p-4'>
            <h3 className='mb-2 font-semibold'>Move to location</h3>
            <div className='flex max-h-60 flex-col gap-1 overflow-auto'>
              {(viewingLocationId ? childLocations : rootLocations).map((loc) => (
                <Button
                  key={loc.id}
                  variant='ghost'
                  size='sm'
                  className='justify-start'
                  onClick={() => handleMoveToLocation(loc.id)}>
                  {loc.label}
                </Button>
              ))}
            </div>
            <Button
              variant='outline'
              className='mt-2 w-full'
              onClick={() => setMoveLocationOpen(false)}>
              Cancel
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
