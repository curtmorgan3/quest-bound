import { useLocation } from '@/lib/compass-api';
import { useCampaignEntities, useMapHelpers } from '@/pages/campaigns/hooks';
import type { ActiveCharacter, Location } from '@/types';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

export interface CampaignPlayContextValue {
  campaignPlayerCharacters: ActiveCharacter[];
  campaignNpcs: ActiveCharacter[];
  selectedCharacters: ActiveCharacter[];
  selectedPlayerCharacters: ActiveCharacter[];
  selectedNpcs: ActiveCharacter[];
  charactersInThisLocation: ActiveCharacter[];
  addSelectedCharacter: (id: string) => void;
  removeSelectedCharacter: (id: string) => void;
  toggleCharacterSelection: (id: string) => void;
  moveSelectedCharactersTo: (locationId: string, tileId?: string) => void;
  navigateTo: (locationId: string) => void;
  navigateBack: () => void;
  /** Navigate the view to the given character's current location, if they have one */
  jumpToCharacter: (characterId: string) => void;
  /** Current location id the view is showing (not character positions) */
  viewingLocationId: string | null;
  currentLocation?: Location;
}

export const CampaignPlayContext = createContext<CampaignPlayContextValue | null>(null);

export function useCampaignContext(): CampaignPlayContextValue {
  const ctx = useContext(CampaignPlayContext);
  if (!ctx) throw new Error('useCampaignContext must be used within CampaignProvider');
  return ctx;
}

function useCampaignProvider(campaignId: string | undefined): CampaignPlayContextValue | null {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const { locationId } = useParams<{
    locationId?: string;
  }>();

  const {
    activeNpcs,
    activePlayerCharacters,
    selectedPlayerCharacters,
    selectedNpcs,
    selectedCharacters,
    charactersInThisLocation,
  } = useCampaignEntities({ campaignId, selectedIds, locationId });

  const currentLocation = useLocation(locationId);

  const { navigateTo, navigateBack, moveSelectedCharactersTo, jumpToCharacter } = useMapHelpers({
    campaignId,
    currentLocation,
    selectedCharacters,
  });

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

  return useMemo(
    () => ({
      campaignPlayerCharacters: activePlayerCharacters,
      campaignNpcs: activeNpcs,
      selectedCharacters,
      selectedPlayerCharacters,
      selectedNpcs,
      addSelectedCharacter,
      removeSelectedCharacter,
      moveSelectedCharactersTo,
      navigateTo,
      navigateBack,
      jumpToCharacter,
      toggleCharacterSelection,
      viewingLocationId: currentLocation?.id ?? null,
      currentLocation,
      charactersInThisLocation,
    }),
    [
      activePlayerCharacters,
      activeNpcs,
      selectedCharacters,
      addSelectedCharacter,
      removeSelectedCharacter,
      moveSelectedCharactersTo,
      navigateTo,
      navigateBack,
      jumpToCharacter,
      toggleCharacterSelection,
      currentLocation,
      charactersInThisLocation,
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
