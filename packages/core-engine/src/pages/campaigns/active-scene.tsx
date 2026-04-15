import { useCampaignCharacters } from '@/lib/compass-api';
import { useMemo } from 'react';
import { useCampaignPlayCharacterList } from './hooks';
import { SceneCharacterAvatarGrid } from './scene-character-avatar-grid';

export interface ActiveSceneProps {
  campaignId: string;
  /** When set, only active NPCs in this scene are shown. */
  sceneId?: string;
  hoveredCampaignCharacterId?: string | null;
  onAvatarClick?: (characterId: string) => void;
}

/**
 * Shows active NPCs in the scene (no turn order). For turn-based mode with
 * cycle and current-turn highlight, use TurnOrderScene instead.
 */
export function ActiveScene({
  campaignId,
  sceneId,
  hoveredCampaignCharacterId,
  onAvatarClick,
}: ActiveSceneProps) {
  const { campaignCharacters } = useCampaignCharacters(campaignId);
  const activeCampaignCharacters = useMemo(
    () =>
      campaignCharacters.filter(
        (cc) => cc.active === true && (!sceneId || cc.campaignSceneId === sceneId),
      ),
    [campaignCharacters, sceneId],
  );
  const withNames = useCampaignPlayCharacterList({
    campaignCharacters: activeCampaignCharacters,
  });

  const activeNpcs = useMemo(
    () => withNames.filter((entry) => entry.character?.isNpc === true),
    [withNames],
  );

  return (
    <SceneCharacterAvatarGrid
      headerLabel='Active'
      entries={activeNpcs}
      hoveredCampaignCharacterId={hoveredCampaignCharacterId}
      onAvatarClick={onAvatarClick}
      emptyMessage='No active NPCs'
    />
  );
}
