import { getTopTileDataAt } from '@/components/locations';
import {
  useCampaign,
  useCampaignCharacters,
  useCampaignItems,
  useLocations,
} from '@/lib/compass-api';
import type { Location, TileData } from '@/types';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export type TileMenu = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  /** Set when we just created a blank tile; use as tileId until location refetches. */
  createdTileId?: string;
} | null;

interface UseMapHelpers {
  campaignId?: string;
  currentLocation?: Location;
  setTileMenu: (menu: TileMenu) => void;
  selectedLocationId?: string;
}

export const useMapHelpers = ({
  campaignId,
  currentLocation,
  selectedLocationId,
  setTileMenu,
}: UseMapHelpers) => {
  const campaign = useCampaign(campaignId);
  const { updateLocation } = useLocations(campaign?.worldId, null);
  const { updateCampaignCharacter } = useCampaignCharacters(campaignId);
  const { updateCampaignItem } = useCampaignItems(campaignId);

  const navigate = useNavigate();

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
    async (x: number, y: number, clientX: number, clientY: number) => {
      if (!currentLocation) return;
      const tiles = currentLocation.tiles ?? [];
      let top = getTopTileDataAt(tiles, x, y);
      if (!top) {
        const newTile: TileData = {
          id: crypto.randomUUID(),
          x,
          y,
          zIndex: 0,
          isPassable: true,
        };
        await updateLocation(currentLocation.id, { tiles: [...tiles, newTile] });
        setTileMenu({ x, y, clientX, clientY, createdTileId: newTile.id });
        return;
      }
      setTileMenu({ x, y, clientX, clientY });
    },
    [currentLocation, updateLocation],
  );

  const handleOverlayClick = useCallback(
    (tileId: string, e: React.MouseEvent) => {
      if (!currentLocation?.tiles) return;
      const tile = currentLocation.tiles.find((t) => t.id === tileId);
      if (!tile) return;
      setTileMenu({
        x: tile.x,
        y: tile.y,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [currentLocation],
  );

  const handleDrop = useCallback(
    async (x: number, y: number, e: React.DragEvent) => {
      if (!currentLocation || !selectedLocationId) return;
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      let payload: { type: string; id: string };
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
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
      if (payload.type === 'campaign-character') {
        await updateCampaignCharacter(payload.id, {
          currentLocationId: selectedLocationId,
          currentTileId: targetTile.id,
        });
      } else if (payload.type === 'campaign-item') {
        await updateCampaignItem(payload.id, {
          currentLocationId: selectedLocationId,
          currentTileId: targetTile.id,
        });
      }
    },
    [
      currentLocation,
      selectedLocationId,
      updateLocation,
      updateCampaignCharacter,
      updateCampaignItem,
    ],
  );

  return {
    handleOpenMap,
    handleOverlayClick,
    openTileMenuAt,
    handleAdvanceToLocation,
    handleBack,
    handleDrop,
  };
};
