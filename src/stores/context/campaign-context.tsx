import { useLocation } from '@/lib/compass-api';
import {
  useCampaignEntities,
  useCampaignPlayHandlers,
  useMapHelpers,
} from '@/pages/campaigns/hooks';
import type { ActiveCharacter, Location } from '@/types';
import { createContext, useCallback, useContext, useState } from 'react';
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
  rulesetId?: string;
  npcsInThisLocation: ActiveCharacter[];
  playerCharactersInThisLocation: ActiveCharacter[];
  handleCreateCampaignCharacter: (archetypeId: string, tileId?: string) => void;
  /** Place an existing campaign event on a tile (creates CampaignEventLocation only). */
  handleAddEventToTile: (
    tile: { locationId: string; tileId: string },
    campaignEventId: string,
  ) => Promise<void>;
  /** Remove an event from a tile (deletes only the CampaignEventLocation). */
  handleRemoveEventFromTile: (campaignEventLocationId: string) => Promise<void>;
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
    rulesetId,
    playerCharactersInThisLocation,
    npcsInThisLocation,
  } = useCampaignEntities({ campaignId, selectedIds, locationId });

  const currentLocation = useLocation(locationId);

  const { navigateTo, navigateBack, moveSelectedCharactersTo, jumpToCharacter } = useMapHelpers({
    campaignId,
    currentLocation,
    selectedCharacters,
  });

  const { handleCreateCampaignCharacter, handleAddEventToTile, handleRemoveEventFromTile } =
    useCampaignPlayHandlers({
      campaignId,
      currentLocation,
      rulesetId,
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

  return {
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
    rulesetId,
    handleCreateCampaignCharacter,
    playerCharactersInThisLocation,
    npcsInThisLocation,
    handleAddEventToTile,
    handleRemoveEventFromTile,
  };
}

interface CampaignProviderProps {
  children: React.ReactNode;
}

export function CampaignProvider({ children }: CampaignProviderProps) {
  const { campaignId } = useParams<{ campaignId: string }>();
  const value = useCampaignProvider(campaignId);

  return <CampaignPlayContext.Provider value={value}>{children}</CampaignPlayContext.Provider>;
}
