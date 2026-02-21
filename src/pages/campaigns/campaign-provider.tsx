import { getFirstPassableTileId } from '@/components/locations';
import { useCampaignCharacters, useLocation } from '@/lib/compass-api';
import { db } from '@/stores';
import type { CampaignCharacter } from '@/types';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCampaignPlayCharacterList } from './hooks/use-campaign-play-character-list';

export interface CampaignPlayContextValue {
  campaignPlayerCharacters: CampaignCharacter[];
  campaignNpcs: CampaignCharacter[];
  selectedCharacters: CampaignCharacter[];
  addSelectedCharacter: (id: string) => void;
  removeSelectedCharacter: (id: string) => void;
  moveSelectedCharactersTo: (locationId: string, tileId?: string) => void;
  navigateTo: (locationId: string) => void;
  navigateBack: () => void;
  /** Current location id the view is showing (not character positions) */
  viewingLocationId: string | null;
}

const CampaignPlayContext = createContext<CampaignPlayContextValue | null>(null);

export function useCampaignContext(): CampaignPlayContextValue {
  const ctx = useContext(CampaignPlayContext);
  if (!ctx) throw new Error('useCampaignContext must be used within CampaignProvider');
  return ctx;
}

function useCampaignProvider(campaignId: string | undefined): CampaignPlayContextValue | null {
  const { campaignCharacters, updateCampaignCharacter } = useCampaignCharacters(campaignId);
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });

  const campaignPlayerCharacters = useMemo(
    () => withNames.filter((e) => e.character?.isNpc !== true).map((e) => e.cc),
    [withNames],
  );
  const campaignNpcs = useMemo(
    () => withNames.filter((e) => e.character?.isNpc === true).map((e) => e.cc),
    [withNames],
  );

  console.log(campaignPlayerCharacters);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [viewingLocationId, setViewingLocationId] = useState<string | null>(null);

  const viewingLocation = useLocation(viewingLocationId ?? undefined);

  const selectedCharacters = useMemo(
    () => campaignCharacters.filter((cc) => selectedIds.has(cc.id)),
    [campaignCharacters, selectedIds],
  );

  const addSelectedCharacter = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const removeSelectedCharacter = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const moveSelectedCharactersTo = useCallback(
    async (locationId: string, tileId?: string) => {
      let resolvedTileId = tileId;
      if (resolvedTileId == null) {
        const loc = await db.locations.get(locationId);
        resolvedTileId = loc?.tiles?.length
          ? (getFirstPassableTileId(loc.tiles) ?? undefined)
          : undefined;
      }
      for (const cc of selectedCharacters) {
        await updateCampaignCharacter(cc.id, {
          currentLocationId: locationId,
          currentTileId: resolvedTileId ?? null,
        });
      }
    },
    [selectedCharacters, updateCampaignCharacter],
  );

  const navigateTo = useCallback((locationId: string) => {
    setViewingLocationId(locationId);
  }, []);

  const navigateBack = useCallback(() => {
    setViewingLocationId(viewingLocation?.parentLocationId ?? null);
  }, [viewingLocation?.parentLocationId]);

  return useMemo(
    () => ({
      campaignPlayerCharacters,
      campaignNpcs,
      selectedCharacters,
      addSelectedCharacter,
      removeSelectedCharacter,
      moveSelectedCharactersTo,
      navigateTo,
      navigateBack,
      viewingLocationId,
    }),
    [
      campaignPlayerCharacters,
      campaignNpcs,
      selectedCharacters,
      addSelectedCharacter,
      removeSelectedCharacter,
      moveSelectedCharactersTo,
      navigateTo,
      navigateBack,
      viewingLocationId,
    ],
  );
}

interface CampaignProviderProps {
  children: React.ReactNode;
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const { campaignId } = useParams<{ campaignId: string }>();
  const value = useCampaignProvider(campaignId);

  return <CampaignPlayContext.Provider value={value}>{children}</CampaignPlayContext.Provider>;
}
