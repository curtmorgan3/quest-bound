import {
  useCampaign,
  useCampaignCharacters,
  useCampaignItems,
  useLocation,
  useLocations,
} from '@/lib/compass-api';
import type { ActiveCharacter } from '@/types';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/** Map/location feature removed; stub returns no-op handlers. */
interface UseMapHelpers {
  campaignId?: string;
  currentLocation?: { id: string; tiles?: unknown[]; parentLocationId?: string | null };
  selectedLocationId?: string | null;
  selectedCharacters: ActiveCharacter[];
}

export const useMapHelpers = ({
  campaignId,
  currentLocation: _currentLocation,
  selectedLocationId: _selectedLocationId,
  selectedCharacters: _selectedCharacters,
}: UseMapHelpers) => {
  useCampaign(campaignId);
  useCampaignCharacters(campaignId);
  useCampaignItems(campaignId);
  useLocations(undefined, null);
  const navigate = useNavigate();
  const { campaignId: campaignIdParam } = useParams<{ campaignId?: string; locationId?: string }>();
  useLocation(undefined);

  const moveSelectedCharactersTo = useCallback(async (_locationId: string | null, _tileId?: string) => {}, []);
  const navigateTo = useCallback((_locationId: string) => {
    if (campaignIdParam) navigate(`/campaigns/${campaignIdParam}/locations/${_locationId}`);
  }, [campaignIdParam, navigate]);
  const openMap = useCallback((_locationId: string) => {
    if (campaignIdParam) navigate(`/campaigns/${campaignIdParam}/locations/${_locationId}?view=map`);
  }, [campaignIdParam, navigate]);
  const navigateBack = useCallback(() => {
    if (campaignIdParam) navigate(`/campaigns/${campaignIdParam}`);
  }, [campaignIdParam, navigate]);
  const jumpToCharacter = useCallback((_characterId: string) => {}, []);
  const handleDrop = useCallback(async (_x: number, _y: number, _e: React.DragEvent) => {}, []);

  return {
    navigateTo,
    openMap,
    navigateBack,
    jumpToCharacter,
    moveSelectedCharactersTo,
    handleDrop,
  };
};
