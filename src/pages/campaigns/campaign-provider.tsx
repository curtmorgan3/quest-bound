import { getFirstPassableTileId } from '@/components/locations';
import { useCampaign, useCampaignCharacters, useCharacters, useLocation } from '@/lib/compass-api';
import { db } from '@/stores';
import type { CampaignCharacter, Character } from '@/types';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type ActiveCharacter = Character & CampaignCharacter;

export interface CampaignPlayContextValue {
  campaignPlayerCharacters: ActiveCharacter[];
  campaignNpcs: ActiveCharacter[];
  selectedCharacters: ActiveCharacter[];
  selectedPlayerCharacters: ActiveCharacter[];
  selectedNpcs: ActiveCharacter[];
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
  const campaign = useCampaign(campaignId);
  const rulesetId = campaign?.rulesetId;
  const charactersForRuleset = useCharacters(rulesetId);
  const { campaignCharacters, updateCampaignCharacter } = useCampaignCharacters(campaignId);

  const characterIdsInCampaign = useMemo(
    () => new Set(campaignCharacters.map((cc) => cc.characterId)),
    [campaignCharacters],
  );

  const campaignPlayerCharacters = useMemo(
    () => charactersForRuleset.filter((c) => characterIdsInCampaign.has(c.id) && c.isNpc !== true),
    [charactersForRuleset, characterIdsInCampaign],
  );
  const campaignNpcs = useMemo(
    () => charactersForRuleset.filter((c) => characterIdsInCampaign.has(c.id) && c.isNpc === true),
    [charactersForRuleset, characterIdsInCampaign],
  );

  const activePlayerCharacters: ActiveCharacter[] = campaignPlayerCharacters.map((character) => {
    const campaignCharacter = campaignCharacters.find((cc) => cc.characterId === character.id)!;
    return {
      ...character,
      ...campaignCharacter,
    };
  });

  const activeNpcs: ActiveCharacter[] = campaignNpcs.map((character) => {
    const campaignCharacter = campaignCharacters.find((cc) => cc.characterId === character.id)!;
    return {
      ...character,
      ...campaignCharacter,
    };
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const navigate = useNavigate();
  const { campaignId: campaignIdParam, locationId: locationIdParam } = useParams<{
    campaignId?: string;
    locationId?: string;
  }>();
  const viewingLocationId = locationIdParam ?? null;

  const viewingLocation = useLocation(viewingLocationId ?? undefined);

  const selectedPlayerCharacters: ActiveCharacter[] = useMemo(
    () => activePlayerCharacters.filter((cc) => selectedIds.has(cc.id)),
    [activePlayerCharacters, selectedIds],
  );

  const selectedNpcs: ActiveCharacter[] = useMemo(
    () => activeNpcs.filter((cc) => selectedIds.has(cc.id)),
    [activeNpcs, selectedIds],
  );

  const selectedCharacters = [...selectedNpcs, ...selectedPlayerCharacters];

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

  const navigateTo = useCallback(
    (locationId: string) => {
      if (campaignIdParam) {
        navigate(`/campaigns/${campaignIdParam}/play/locations/${locationId}`);
      }

      moveSelectedCharactersTo(locationId);
    },
    [campaignIdParam, navigate, selectedCharacters],
  );

  const navigateBack = useCallback(() => {
    if (!campaignIdParam) return;
    if (viewingLocation?.parentLocationId) {
      navigate(`/campaigns/${campaignIdParam}/play/locations/${viewingLocation.parentLocationId}`);
      moveSelectedCharactersTo(viewingLocation.parentLocationId);
    } else {
      navigate(`/campaigns/${campaignIdParam}/play`);
    }
  }, [campaignIdParam, viewingLocation?.parentLocationId, navigate, selectedCharacters]);

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
      viewingLocationId,
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
