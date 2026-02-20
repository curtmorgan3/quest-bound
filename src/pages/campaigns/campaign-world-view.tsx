import { Button } from '@/components';
import { LocationViewer } from '@/components/locations/location-viewer';
import { WorldViewer } from '@/components/worlds/world-viewer';
import { useAssets, useCampaign, useLocation, useLocations, useWorld } from '@/lib/compass-api';
import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

/**
 * View a campaign's world (read-only). Current location and view mode are
 * controlled by the URL: /campaigns/:campaignId/view or
 * /campaigns/:campaignId/locations/:locationId/view, with ?map=1 for map view.
 * When at a location, the viewer shows that location's child locations.
 */
export function CampaignWorldView() {
  const { campaignId, locationId: locationIdParam } = useParams<{
    campaignId: string;
    locationId?: string;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const world = useWorld(campaign?.worldId);
  const selectedLocationId = locationIdParam ?? null;
  const { locations } = useLocations(campaign?.worldId, selectedLocationId);
  const currentLocation = useLocation(selectedLocationId ?? undefined);
  const { assets } = useAssets(null);

  const showMap = searchParams.get('map') === '1';
  const viewMode = showMap ? 'location' : 'world';

  const getAssetData = useCallback(
    (assetId: string) => assets?.find((a) => a.id === assetId)?.data ?? null,
    [assets],
  );

  const handleAdvanceToLocation = useCallback(
    (locationId: string) => {
      if (!campaignId) return;
      navigate(`/campaigns/${campaignId}/locations/${locationId}/view`);
    },
    [campaignId, navigate],
  );

  const handleOpenMap = useCallback(
    (locationId: string) => {
      if (!campaignId) return;
      navigate(`/campaigns/${campaignId}/locations/${locationId}/view?map=1`);
    },
    [campaignId, navigate],
  );

  const handleBackToWorld = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('map');
      return next;
    });
  }, [setSearchParams]);

  const locationsList = locations ?? [];
  const selectedLocation = currentLocation ?? null;

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
      <div className='flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' onClick={() => navigate(`/campaigns/${campaignId}`)}>
          Back to campaign
        </Button>
        {selectedLocation && (
          <>
            <span className='text-muted-foreground'>›</span>
            <span className='font-medium'>{selectedLocation.label}</span>
          </>
        )}
        {viewMode === 'location' && selectedLocation && (
          <Button variant='ghost' size='sm' onClick={handleBackToWorld}>
            Back to world
          </Button>
        )}
      </div>
      <div className='min-h-0 flex-1 p-4'>
        {viewMode === 'world' && (
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
        {viewMode === 'location' && selectedLocationId && (
          <div className='flex justify-center'>
            <LocationViewer
              locationId={selectedLocationId}
              worldId={campaign.worldId}
              getAssetData={getAssetData}
              tileRenderSize={selectedLocation?.tileRenderSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
