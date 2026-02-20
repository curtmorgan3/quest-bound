import { Button } from '@/components';
import { LocationViewer } from '@/components/locations/location-viewer';
import { WorldViewer } from '@/components/worlds/world-viewer';
import { useAssets, useCampaign, useLocation, useLocations, useWorld } from '@/lib/compass-api';
import { ArrowUp, ChevronRight } from 'lucide-react';
import { useCallback, useMemo } from 'react';
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
  const [searchParams] = useSearchParams();
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

  const parentStack = useMemo(() => {
    if (selectedLocationId && currentLocation) return [currentLocation];
    return [];
  }, [selectedLocationId, currentLocation]);

  const handleBack = useCallback(() => {
    if (!campaignId) return;
    if (currentLocation?.parentLocationId) {
      navigate(`/campaigns/${campaignId}/locations/${currentLocation.parentLocationId}/view`);
    } else {
      navigate(`/campaigns/${campaignId}/view`);
    }
  }, [campaignId, currentLocation?.parentLocationId, navigate]);

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
      <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' onClick={() => navigate(`/campaigns/${campaignId}`)}>
          Back to campaign
        </Button>
        <span className='truncate font-semibold'>{world.label}</span>
        {parentStack.map((loc) => (
          <span key={loc.id} className='flex items-center gap-1 text-muted-foreground'>
            <ChevronRight className='h-4 w-4' />
            <span className='truncate font-medium text-foreground'>{loc.label}</span>
          </span>
        ))}
        {parentStack.length > 0 && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleBack}
            data-testid='campaign-world-view-back'
            className='clickable'>
            <ArrowUp className='h-4 w-4' />
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
