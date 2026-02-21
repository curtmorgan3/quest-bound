import { getFirstPassableTileId, getTopTileDataAt } from '@/components/locations';
import { useCampaignCharacters } from '@/lib/compass-api';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import { db } from '@/stores';
import type { Location } from '@/types';
import { useCallback, useEffect } from 'react';

interface PlayingCampaignCharacter {
  id: string;
}

interface UseCampaignPlayHandlers {
  campaignId?: string;
  characterIdParam: string | null;
  currentLocation: Location | undefined;
  currentLocationId: string | null;
  playingCc: PlayingCampaignCharacter | null | undefined;
  rootLocations: Location[];
  setMoveLocationOpen: (open: boolean) => void;
}

export const useCampaignPlayHandlers = ({
  campaignId,
  characterIdParam,
  currentLocation,
  currentLocationId,
  playingCc,
  rootLocations,
  setMoveLocationOpen,
}: UseCampaignPlayHandlers) => {
  const { updateCampaignCharacter } = useCampaignCharacters(campaignId);

  const handleTileClick = useCallback(
    (x: number, y: number) => {
      if (!currentLocation?.tiles || !characterIdParam) return;
      const top = getTopTileDataAt(currentLocation.tiles, x, y);
      if (top?.actionId) {
        const client = getQBScriptClient();
        client.executeActionEvent(top.actionId, characterIdParam, null, 'on_activate');
      }
    },
    [currentLocation?.tiles, characterIdParam],
  );

  const handleMoveToLocation = useCallback(
    async (locationId: string) => {
      if (!playingCc?.id) return;
      const loc = await db.locations.get(locationId);
      if (!loc?.tiles?.length) return;
      const tileId = getFirstPassableTileId(loc.tiles);
      if (!tileId) return;
      await updateCampaignCharacter(playingCc.id, {
        currentLocationId: locationId,
        currentTileId: tileId,
      });
      setMoveLocationOpen(false);
    },
    [playingCc?.id, updateCampaignCharacter, setMoveLocationOpen],
  );

  const handleAdvanceToLocation = useCallback(
    async (locationId: string) => {
      if (!playingCc?.id) return;
      const loc = await db.locations.get(locationId);
      if (!loc) return;
      const tileId = loc.tiles?.length ? getFirstPassableTileId(loc.tiles) : null;
      await updateCampaignCharacter(playingCc.id, {
        currentLocationId: locationId,
        currentTileId: tileId ?? null,
      });
    },
    [playingCc?.id, updateCampaignCharacter],
  );

  const handleBack = useCallback(async () => {
    if (!playingCc?.id || !currentLocation) return;
    const parentId = currentLocation.parentLocationId ?? null;
    await updateCampaignCharacter(playingCc.id, {
      currentLocationId: parentId,
      currentTileId: null,
    });
  }, [playingCc?.id, currentLocation, updateCampaignCharacter]);

  useEffect(() => {
    if (playingCc?.id && !currentLocationId && rootLocations.length > 0) {
      const firstRoot = rootLocations[0]!;
      const tileId = firstRoot.tiles?.length ? getFirstPassableTileId(firstRoot.tiles) : null;
      if (tileId) {
        updateCampaignCharacter(playingCc.id, {
          currentLocationId: firstRoot.id,
          currentTileId: tileId,
        });
      }
    }
  }, [playingCc?.id, currentLocationId, rootLocations, updateCampaignCharacter]);

  return {
    handleTileClick,
    handleMoveToLocation,
    handleAdvanceToLocation,
    handleBack,
  };
};
