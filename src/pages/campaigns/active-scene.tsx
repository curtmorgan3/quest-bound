import { useCampaignCharacters } from '@/lib/compass-api';
import { useMemo } from 'react';
import { useCampaignPlayCharacterList } from './hooks';

interface ActiveSceneProps {
  campaignId: string;
  /** When set, only active NPCs in this scene are shown. */
  sceneId?: string;
  hoveredCampaignCharacterId?: string | null;
  onAvatarClick?: (characterId: string) => void;
}

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
        (cc) =>
          cc.active === true && (!sceneId || cc.campaignSceneId === sceneId),
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

  if (activeNpcs.length === 0) {
    return (
      <div className='flex min-h-0 w-[200px] shrink-0 flex-col border-r bg-muted/20 p-3'>
        <p className='text-sm text-muted-foreground'>Active Scene</p>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-xs text-muted-foreground'>No active NPCs</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 w-[200px] max-w-[400px] shrink-0 flex-col border-r bg-muted/20 p-3 flex-1'>
      <p className='mb-2 text-sm text-muted-foreground'>Active Scene</p>
      <div className='flex flex-wrap gap-2'>
        {activeNpcs.map(({ cc, character }) => (
          <button
            type='button'
            key={cc.id}
            data-active-npc-avatar='true'
            onClick={() => character?.id && onAvatarClick?.(character.id)}
            className={`size-20 shrink-0 overflow-hidden rounded-md border bg-muted transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              hoveredCampaignCharacterId === cc.id
                ? 'ring-2 ring-primary shadow-[0_0_12px] shadow-primary/50'
                : ''
            }`}
            title={character?.name ?? 'Unnamed'}
            aria-label={`Open ${character?.name ?? 'character'} sheet`}>
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
        ))}
      </div>
    </div>
  );
}
