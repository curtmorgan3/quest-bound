import { useCampaignCharacters } from '@/lib/compass-api';
import { useMemo } from 'react';
import { useCampaignPlayCharacterList } from './hooks';
import { SceneCharacterAvatarGrid } from './scene-character-avatar-grid';

export interface TurnOrderSceneProps {
  campaignId: string;
  sceneId: string;
  /** Current cycle number (1-based). */
  currentTurnCycle: number;
  /** Campaign character id whose turn it is (for highlight). */
  currentTurnCampaignCharacterId: string | null;
  hoveredCampaignCharacterId?: string | null;
  onAvatarClick?: (characterId: string) => void;
}

/**
 * Shows characters in turn order when turn-based mode is on: header "Active · Cycle N",
 * list sorted by turn order, with current-turn highlight.
 */
export function TurnOrderScene({
  campaignId,
  sceneId,
  currentTurnCycle,
  currentTurnCampaignCharacterId,
  hoveredCampaignCharacterId,
  onAvatarClick,
}: TurnOrderSceneProps) {
  const { campaignCharacters } = useCampaignCharacters(campaignId);
  const inScene = useMemo(
    () =>
      campaignCharacters.filter(
        (cc) => cc.campaignSceneId === sceneId,
      ),
    [campaignCharacters, sceneId],
  );
  const withNames = useCampaignPlayCharacterList({
    campaignCharacters: inScene,
  });

  const entriesByTurnOrder = useMemo(
    () =>
      withNames
        .filter(
          (entry) =>
            entry.cc.active === true || !entry.character?.isNpc,
        )
        .sort((a, b) => (a.cc.turnOrder ?? 0) - (b.cc.turnOrder ?? 0)),
    [withNames],
  );

  return (
    <SceneCharacterAvatarGrid
      headerLabel={`Active · Cycle ${currentTurnCycle}`}
      entries={entriesByTurnOrder}
      currentTurnCampaignCharacterId={currentTurnCampaignCharacterId}
      hoveredCampaignCharacterId={hoveredCampaignCharacterId}
      onAvatarClick={onAvatarClick}
      emptyMessage='No characters in turn order'
    />
  );
}
