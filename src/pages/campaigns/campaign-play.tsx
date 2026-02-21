import { Button, Card } from '@/components';
import { getTopTileDataAt, LocationViewer } from '@/components/locations';
import { WorldViewer } from '@/components/worlds/world-viewer';
import {
  useCampaign,
  useCampaignCharacters,
  useCampaignEventLocationsByLocation,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import type { TileData } from '@/types';
import { ArrowUp, ChevronRight, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useCampaignPlayEligibleCharacters,
  useCampaignPlayHandlers,
  useCampaignPlayOverlay,
} from './hooks';

export function CampaignPlay() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams] = useSearchParams();
  const characterIdParam = searchParams.get('characterId');
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const world = useWorld(campaign?.worldId);
  const { campaignCharacters, createCampaignCharacter, updateCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const eligibleCharacters = useCampaignPlayEligibleCharacters({
    campaignId,
    rulesetId: campaign?.rulesetId,
  });
  const playingCc = useMemo(
    () =>
      characterIdParam
        ? campaignCharacters.find((cc) => cc.characterId === characterIdParam)
        : null,
    [characterIdParam, campaignCharacters],
  );
  const currentLocationId = playingCc?.currentLocationId ?? null;
  const currentLocation = useLocation(currentLocationId ?? undefined);

  const [viewingLocationId, setViewingLocationId] = useState<string | null>(null);
  const initialViewSet = useRef(false);
  useEffect(() => {
    if (!initialViewSet.current && playingCc?.currentLocationId != null) {
      initialViewSet.current = true;
      setViewingLocationId(playingCc.currentLocationId);
    }
  }, [playingCc?.currentLocationId]);

  const { locations: rootLocations, updateLocation } = useLocations(
    campaign?.worldId,
    null,
  );
  const { locations: locationsList } = useLocations(
    campaign?.worldId,
    viewingLocationId,
  );
  const { locations: childLocations } = useLocations(
    campaign?.worldId,
    currentLocationId,
  );
  const viewingLocation = useLocation(viewingLocationId ?? undefined);
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    viewingLocationId ?? undefined,
  );
  const [moveLocationOpen, setMoveLocationOpen] = useState(false);

  const { overlayNodes, eventTileIds } = useCampaignPlayOverlay({
    campaignId,
    currentLocationId: viewingLocationId,
    eventLocationsWithEvent,
  });

  const { handleTileClick, handleMoveToLocation } = useCampaignPlayHandlers({
    campaignId,
    characterIdParam,
    currentLocation: viewingLocation ?? currentLocation,
    currentLocationId: viewingLocationId ?? currentLocationId,
    playingCc,
    rootLocations,
    setMoveLocationOpen,
  });

  const handleAdvanceView = useCallback((locationId: string) => {
    setViewingLocationId(locationId);
  }, []);

  const handleBackView = useCallback(() => {
    setViewingLocationId(viewingLocation?.parentLocationId ?? null);
  }, [viewingLocation?.parentLocationId]);

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

  const showLocationView =
    viewingLocationId && viewingLocation?.hasMap && playingCc;

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

  if (!characterIdParam) {
    const handleSelectCharacter = async (characterId: string) => {
      const existingCc = campaignCharacters.find((cc) => cc.characterId === characterId);
      if (existingCc) {
        navigate(`/campaigns/${campaignId}/play?characterId=${characterId}`);
        return;
      }
      if (campaignId) {
        await createCampaignCharacter(campaignId, characterId, {});
      }
      navigate(`/campaigns/${campaignId}/play?characterId=${characterId}`);
    };

    return (
      <div className='flex h-full w-full flex-col gap-6 p-4'>
        <h1 className='text-2xl font-bold'>Play campaign</h1>
        <p className='text-muted-foreground'>Choose a character to play as.</p>
        {eligibleCharacters.length === 0 ? (
          <p className='text-muted-foreground'>
            No characters available. Create a character for this ruleset first.
          </p>
        ) : (
          <div className='flex flex-col gap-2'>
            {eligibleCharacters.map(({ character, existingCc }) => (
              <Button
                key={character.id}
                variant='outline'
                className='justify-start'
                onClick={() => handleSelectCharacter(character.id)}>
                <User className='mr-2 h-4 w-4' />
                Play as {character.name ?? 'Unknown'}
              </Button>
            ))}
          </div>
        )}
        <Button variant='ghost' onClick={() => navigate(`/campaigns/${campaignId}`)}>
          Back to campaign
        </Button>
      </div>
    );
  }

  if (!playingCc) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <p className='text-muted-foreground'>Character not found in campaign.</p>
        <Button variant='outline' onClick={() => navigate(`/campaigns/${campaignId}/play`)}>
          Choose character
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
            <span className='font-medium text-foreground'>
              {viewingLocation.label}
            </span>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleBackView()}
              data-testid='campaign-play-back'
              className='clickable'>
              <ArrowUp className='h-4 w-4' />
            </Button>
          </>
        )}
        <div className='ml-auto flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => navigate(`/characters/${characterIdParam}`)}>
            Character sheet
          </Button>
          <Button variant='outline' size='sm' onClick={() => setMoveLocationOpen(true)}>
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
        {showLocationView && viewingLocationId && playingCc && (
          <div className='h-full flex justify-center items-center'>
            <LocationViewer
              locationId={viewingLocationId}
              worldId={campaign.worldId}
              onSelectCell={handleTileClick}
              tileRenderSize={viewingLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
              playMode
              onMoveCharacter={(tileId) =>
                updateCampaignCharacter(playingCc.id, {
                  currentLocationId: viewingLocationId,
                  currentTileId: tileId,
                })
              }
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
            <h3 className='font-semibold mb-2'>Move to location</h3>
            <div className='flex flex-col gap-1 max-h-60 overflow-auto'>
              {(currentLocationId ? childLocations : rootLocations).map((loc) => (
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
