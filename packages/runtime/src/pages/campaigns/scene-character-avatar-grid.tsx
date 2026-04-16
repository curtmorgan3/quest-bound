import type { CampaignCharacterWithName } from './hooks';

export interface SceneCharacterAvatarGridProps {
  /** Panel header, e.g. "Active" or "Active · Cycle 2". */
  headerLabel: string;
  /** Entries to show (cc + character with name). */
  entries: CampaignCharacterWithName[];
  /** When set, the matching campaign character avatar shows current-turn highlight. */
  currentTurnCampaignCharacterId?: string | null;
  /** When set, the matching campaign character avatar shows hover highlight. */
  hoveredCampaignCharacterId?: string | null;
  onAvatarClick?: (characterId: string) => void;
  /** Message when entries are empty. */
  emptyMessage?: string;
}

/**
 * Presentational panel: header + grid of character avatars with optional
 * current-turn and hover highlight. Used by ActiveScene and TurnOrderScene.
 */
export function SceneCharacterAvatarGrid({
  headerLabel,
  entries,
  currentTurnCampaignCharacterId,
  hoveredCampaignCharacterId,
  onAvatarClick,
  emptyMessage = 'No characters',
}: SceneCharacterAvatarGridProps) {
  if (entries.length === 0) {
    return (
      <div className='flex min-h-0 w-[200px] shrink-0 flex-col border-r bg-muted/20 p-3'>
        <p className='text-sm text-muted-foreground'>{headerLabel}</p>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-xs text-muted-foreground'>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 w-[100%] shrink-0 flex-col border-r bg-muted/20 p-3 flex-1'>
      <p className='mb-2 text-sm text-muted-foreground'>{headerLabel}</p>
      <div className='flex flex-wrap gap-2'>
        {entries.map(({ cc, character }) => {
          const isCurrentTurn = currentTurnCampaignCharacterId === cc.id;
          const isHovered = hoveredCampaignCharacterId === cc.id;
          const showRing = isCurrentTurn || isHovered;
          return (
            <div key={cc.id} className='flex shrink-0 flex-col items-start gap-1'>
              <button
                type='button'
                data-active-npc-avatar='true'
                data-current-turn={isCurrentTurn ? 'true' : undefined}
                onClick={() => character?.id && onAvatarClick?.(character.id)}
                className={`size-[100px] shrink-0 overflow-hidden rounded-md border bg-muted transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  showRing ? 'ring-2 ring-primary shadow-[0_0_12px] shadow-primary/50' : ''
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
                  <div className='flex size-full items-center justify-center text-3xl font-medium text-muted-foreground'>
                    {(character?.name ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
              </button>
              <span className='max-w-[5rem] truncate text-xs text-muted-foreground'>
                {character?.name ?? 'Unnamed'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
