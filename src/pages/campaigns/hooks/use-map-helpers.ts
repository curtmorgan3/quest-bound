import { getFirstPassableTileId, getTopTileDataAt } from '@/components/locations';
import {
  useCampaign,
  useCampaignCharacters,
  useCampaignItems,
  useLocation,
  useLocations,
} from '@/lib/compass-api';
import { db } from '@/stores';
import type { ActiveCharacter, Location, TileData } from '@/types';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { moveCharacters } from '../campaign-controls/character-movement';

interface UseMapHelpers {
  campaignId?: string;
  currentLocation?: Location;
  selectedLocationId?: string | null;
  selectedCharacters: ActiveCharacter[];
}

export const useMapHelpers = ({
  campaignId,
  currentLocation,
  selectedLocationId,
  selectedCharacters,
}: UseMapHelpers) => {
  const campaign = useCampaign(campaignId);
  const { campaignCharacters, updateCampaignCharacter } = useCampaignCharacters(campaignId);
  const { updateLocation } = useLocations(campaign?.worldId, null);
  const { updateCampaignItem } = useCampaignItems(campaignId);

  const navigate = useNavigate();
  const { campaignId: campaignIdParam, locationId: locationIdParam } = useParams<{
    campaignId?: string;
    locationId?: string;
  }>();

  const viewingLocation = useLocation(locationIdParam);

  const moveSelectedCharactersTo = useCallback(
    async (locationId: string | null, tileId?: string) => {
      if (!locationId) {
        for (const character of selectedCharacters) {
          await updateCampaignCharacter(character.campaignCharacterId, {
            currentLocationId: null,
          });
        }

        return;
      }

      const loc = await db.locations.get(locationId);
      if (!loc) return;

      const tiles = loc.tiles ?? [];
      const targetTileId =
        tileId ?? getFirstPassableTileId(tiles) ?? (tiles[0] ? tiles[0].id : null);

      if (!targetTileId) {
        for (const character of selectedCharacters) {
          await updateCampaignCharacter(character.campaignCharacterId, {
            currentLocationId: locationId,
            currentTileId: null,
          });
        }

        return;
      }

      const charactersInLocation = campaignCharacters.filter(
        (cc) => cc.currentLocationId === locationId,
      );

      const movements = moveCharacters({
        location: loc,
        targetTile: { id: targetTileId },
        characterToMove: selectedCharacters,
        charactersInLocation,
      });

      for (const movement of movements) {
        await updateCampaignCharacter(movement.characterId, {
          currentLocationId: locationId,
          currentTileId: movement.tileId,
        });
      }
    },
    [selectedCharacters, campaignCharacters, updateCampaignCharacter],
  );

  const navigateTo = useCallback(
    (locationId: string) => {
      if (campaignIdParam) {
        navigate(`/campaigns/${campaignIdParam}/locations/${locationId}`);
      }

      moveSelectedCharactersTo(locationId);
    },
    [campaignIdParam, navigate, selectedCharacters],
  );

  const navigateBack = useCallback(() => {
    if (!campaignIdParam) return;
    if (viewingLocation?.parentLocationId) {
      navigate(`/campaigns/${campaignIdParam}/locations/${viewingLocation.parentLocationId}`);
      moveSelectedCharactersTo(viewingLocation.parentLocationId);
    } else {
      navigate(`/campaigns/${campaignIdParam}`);
      moveSelectedCharactersTo(null);
    }
  }, [campaignIdParam, viewingLocation?.parentLocationId, navigate, selectedCharacters]);

  const jumpToCharacter = useCallback(
    (characterId: string) => {
      const cc = campaignCharacters.find((c) => c.characterId === characterId);
      if (cc?.currentLocationId && campaignIdParam) {
        navigate(`/campaigns/${campaignIdParam}/locations/${cc.currentLocationId}`);
      }
    },
    [campaignCharacters, campaignIdParam, navigate, selectedCharacters],
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
    navigateTo,
    navigateBack,
    jumpToCharacter,
    moveSelectedCharactersTo,
    handleDrop,
  };
};
