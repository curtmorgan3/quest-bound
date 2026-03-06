import { useCampaign, useCampaignCharacters, useScriptLogs } from '@/lib/compass-api';
import type { ScriptLog } from '@/types';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { CampaignCharacterWithName } from './hooks';
import { useCampaignPlayCharacterList } from './hooks';

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
 * Shows characters in turn order when turn-based mode is on: vertical list with
 * current character on top. On turn change, animates the previous current moving
 * to the bottom and others shifting up.
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
  const campaign = useCampaign(campaignId);
  const rulesetId = campaign?.rulesetId;
  const { logs: scriptLogs } = useScriptLogs(500, rulesetId, campaignId);

  const inScene = useMemo(
    () => campaignCharacters.filter((cc) => cc.campaignSceneId === sceneId),
    [campaignCharacters, sceneId],
  );
  const withNames = useCampaignPlayCharacterList({
    campaignCharacters: inScene,
  });

  const entriesByTurnOrder = useMemo(
    () =>
      withNames
        .filter((entry) => entry.cc.active === true || !entry.character?.isNpc)
        .sort((a, b) => (a.cc.turnOrder ?? 0) - (b.cc.turnOrder ?? 0)),
    [withNames],
  );

  const displayOrder = useMemo(() => {
    if (entriesByTurnOrder.length === 0) return [];
    const idx = entriesByTurnOrder.findIndex((e) => e.cc.id === currentTurnCampaignCharacterId);
    const start = idx >= 0 ? idx : 0;
    return [...entriesByTurnOrder.slice(start), ...entriesByTurnOrder.slice(0, start)];
  }, [entriesByTurnOrder, currentTurnCampaignCharacterId]);

  if (displayOrder.length === 0) {
    return (
      <div className='flex min-h-0 w-[200px] shrink-0 flex-col border-r bg-muted/20 p-3'>
        <p className='text-sm text-muted-foreground'>Turn {currentTurnCycle}</p>
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-xs text-muted-foreground'>No characters in turn order</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col border-r bg-muted/20 p-3'>
      <p className='mb-2 text-sm text-muted-foreground'>Turn {currentTurnCycle}</p>
      <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2'>
        {displayOrder.map((entry) => (
          <TurnOrderPortrait
            key={entry.cc.id}
            entry={entry}
            isCurrentTurn={entry.cc.id === currentTurnCampaignCharacterId}
            isHovered={entry.cc.id === hoveredCampaignCharacterId}
            scriptLogs={scriptLogs}
            onAvatarClick={onAvatarClick}
          />
        ))}
      </div>
    </div>
  );
}

interface TurnOrderPortraitProps {
  entry: CampaignCharacterWithName;
  isCurrentTurn: boolean;
  isHovered: boolean;
  scriptLogs: ScriptLog[];
  onAvatarClick?: (characterId: string) => void;
}

function TurnOrderPortrait({
  entry,
  isCurrentTurn,
  isHovered,
  scriptLogs,
  onAvatarClick,
}: TurnOrderPortraitProps) {
  const { character, cc } = entry;
  const showRing = isCurrentTurn || isHovered;

  const turnLogs = useMemo(() => {
    const start = cc.turnStartTimestamp;
    const end = cc.turnEndTimestamp ?? (isCurrentTurn ? Date.now() : undefined);
    if (start == null || (end == null && !isCurrentTurn)) return [];
    const characterId = cc.characterId;
    return scriptLogs
      .filter(
        (log) =>
          log.characterId === characterId &&
          log.timestamp >= start &&
          (end == null || log.timestamp < end),
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [cc.turnStartTimestamp, cc.turnEndTimestamp, cc.characterId, isCurrentTurn, scriptLogs]);

  const logLines = useMemo(() => {
    return turnLogs.map((l) => {
      try {
        const arr = JSON.parse(l.argsJson) as unknown[];
        return Array.isArray(arr) ? arr.join(', ') : String(arr);
      } catch {
        return l.argsJson;
      }
    });
  }, [turnLogs]);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className={`flex items-stretch gap-2 ${isCurrentTurn ? 'mb-8' : ''}`}>
      <div className='flex shrink-0 flex-col items-start gap-1'>
        <button
          type='button'
          data-active-npc-avatar='true'
          data-current-turn={isCurrentTurn ? 'true' : undefined}
          onClick={() => character?.id && onAvatarClick?.(character.id)}
          className={`size-26 shrink-0 overflow-hidden rounded-md border bg-muted transition-shadow duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
            <div className='flex size-full items-center justify-center text-xl font-medium text-muted-foreground'>
              {(character?.name ?? '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </button>
        <span className='text-xs text-muted-foreground truncate max-w-[5rem]'>
          {character?.name ?? 'Unnamed'}
        </span>
      </div>
      <div
        className='h-26 min-w-0 flex-1 overflow-y-auto rounded border bg-background/80 px-2 py-1 font-mono text-xs'
        aria-label={`Log for ${character?.name ?? 'character'}'s turn`}>
        {logLines.length === 0 ? (
          <span className='text-muted-foreground'>Waiting for turn</span>
        ) : (
          <div className='flex flex-col gap-0.5 break-words text-muted-foreground'>
            {logLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
