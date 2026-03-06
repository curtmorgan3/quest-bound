import { useCampaignCharacters } from '@/lib/compass-api';
import { useMemo } from 'react';
import { useCampaignPlayCharacterList } from './hooks';

interface ActiveSceneProps {
  campaignId: string;
  /** When set, only active NPCs in this scene are shown. */
  sceneId?: string;
  hoveredCampaignCharacterId?: string | null;
  /** When in turn-based mode, the campaign character id whose turn it is (for highlight). */
  currentTurnCampaignCharacterId?: string | null;
  /** When in turn-based mode, the current cycle number to show in the header. */
  currentTurnCycle?: number;
  onAvatarClick?: (characterId: string) => void;
}

export function ActiveScene({
  campaignId,
  sceneId,
  hoveredCampaignCharacterId,
  currentTurnCampaignCharacterId,
  currentTurnCycle,
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

  const activeNpcs = useMemo(() => {
    const npcs = withNames.filter((entry) => entry.character?.isNpc === true);
    if (currentTurnCycle != null && currentTurnCycle > 0) {
      return [...npcs].sort(
        (a, b) => (a.cc.turnOrder ?? 0) - (b.cc.turnOrder ?? 0),
      );
    }
    return npcs;
  }, [withNames, currentTurnCycle]);

  const headerLabel =
    currentTurnCycle != null && currentTurnCycle > 0
      ? `Active · Cycle ${currentTurnCycle}`
      : 'Active';

  if (activeNpcs.length === 0) {
    return (
      <div className='flex min-h-0 w-[200px] shrink-0 flex-col border-r bg-muted/20 p-3'>
        <p className='text-sm text-muted-foreground'>{headerLabel}</p>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-xs text-muted-foreground'>No active NPCs</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 w-[200px] max-w-[400px] shrink-0 flex-col border-r bg-muted/20 p-3 flex-1'>
      <p className='mb-2 text-sm text-muted-foreground'>{headerLabel}</p>
      <div className='flex flex-wrap gap-2'>
        {activeNpcs.map(({ cc, character }) => {
          const isCurrentTurn = currentTurnCampaignCharacterId === cc.id;
          const isHovered = hoveredCampaignCharacterId === cc.id;
          const showRing = isCurrentTurn || isHovered;
          return (
          <button
            type='button'
            key={cc.id}
            data-active-npc-avatar='true'
            data-current-turn={isCurrentTurn ? 'true' : undefined}
            onClick={() => character?.id && onAvatarClick?.(character.id)}
            className={`size-20 shrink-0 overflow-hidden rounded-md border bg-muted transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              showRing
                ? 'ring-2 ring-primary shadow-[0_0_12px] shadow-primary/50'
                : ''
            }`}
            title={character?.name ?? 'Unnamed'}
            aria-label={`Open ${character?.name ?? 'character'} sheet${isCurrentTurn ? ' (current turn)' : ''}`}>
            {character?.image ? (
              <img
                src={character.image}
                alt={character?.name ?? ''}
                className='size-full object-cover'
              />
            ) : (
              <div className='flex size-full items-center justify-center text-xl font-medium text-muted-foreground'>
                {(character?.name ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
          </button>
          );
        })}
      </div>
    </div>
  );
}
