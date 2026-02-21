import { Button, Card } from '@/components';
import { LocationViewer } from '@/components/locations';
import {
  useCampaign,
  useCampaignCharacters,
  useCampaignEventLocationsByLocation,
  useLocation,
  useLocations,
  useWorld,
} from '@/lib/compass-api';
import { ChevronRight, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useCampaignPlayCharacterList,
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
  const { campaignCharacters } = useCampaignCharacters(campaignId);
  const playingCc = useMemo(
    () =>
      characterIdParam
        ? campaignCharacters.find((cc) => cc.characterId === characterIdParam)
        : null,
    [characterIdParam, campaignCharacters],
  );
  const currentLocationId = playingCc?.currentLocationId ?? null;
  const currentLocation = useLocation(currentLocationId ?? undefined);
  const { locations: rootLocations } = useLocations(campaign?.worldId, null);
  const { locations: childLocations } = useLocations(campaign?.worldId, currentLocationId);
  const eventLocationsWithEvent = useCampaignEventLocationsByLocation(
    currentLocationId ?? undefined,
  );
  const [moveLocationOpen, setMoveLocationOpen] = useState(false);

  const characterList = useCampaignPlayCharacterList({ campaignCharacters });

  const { overlayNodes, eventTileIds } = useCampaignPlayOverlay({
    campaignId,
    currentLocationId,
    eventLocationsWithEvent,
  });

  const { handleTileClick, handleMoveToLocation } = useCampaignPlayHandlers({
    campaignId,
    characterIdParam,
    currentLocation,
    currentLocationId,
    playingCc,
    rootLocations,
    setMoveLocationOpen,
  });

  const showLocationView = currentLocationId && currentLocation?.hasMap && playingCc;

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
    const list = characterList;
    return (
      <div className='flex h-full w-full flex-col gap-6 p-4'>
        <h1 className='text-2xl font-bold'>Play campaign</h1>
        <p className='text-muted-foreground'>Choose a character to play as.</p>
        {list.length === 0 ? (
          <p className='text-muted-foreground'>
            No characters in this campaign. Add characters in the campaign editor.
          </p>
        ) : (
          <div className='flex flex-col gap-2'>
            {list.map(({ cc, character }) => (
              <Button
                key={cc.id}
                variant='outline'
                className='justify-start'
                onClick={() =>
                  navigate(`/campaigns/${campaignId}/play?characterId=${cc.characterId}`)
                }>
                <User className='mr-2 h-4 w-4' />
                Play as {character?.name ?? 'Unknown'}
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
        {currentLocation && (
          <>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
            <span className='font-medium text-foreground'>{currentLocation.label}</span>
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
          <div className='flex h-full min-h-[300px] flex-col items-center justify-center gap-4'>
            <p className='text-muted-foreground'>
              {!currentLocationId
                ? 'Loading location…'
                : !currentLocation?.hasMap
                  ? 'This location has no map.'
                  : 'No location set.'}
            </p>
            {rootLocations.length > 0 && !currentLocationId && (
              <p className='text-sm text-muted-foreground'>
                You will be placed at the first location.
              </p>
            )}
          </div>
        )}
        {showLocationView && currentLocationId && (
          <div className='h-full flex justify-center items-center'>
            <LocationViewer
              locationId={currentLocationId}
              worldId={campaign.worldId}
              onSelectCell={handleTileClick}
              tileRenderSize={currentLocation?.tileRenderSize}
              overlayNodes={overlayNodes}
              eventTileIds={eventTileIds}
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
