import {
  useCampaign,
  useCampaignCharacters,
  useCharacterAttributes,
  useScriptLogs,
} from '@/lib/compass-api';
import type { ScriptLog } from '@/types';
import { motion } from 'framer-motion';
import { GripVertical, Pin } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { CampaignCharacterWithName } from './hooks';
import { useCampaignPlayCharacterList } from './hooks';

const DRAG_DATA_KEY = 'application/x-quest-bound-turn-order-index';

export interface TurnOrderSceneProps {
  campaignId: string;
  sceneId: string;
  /** Current cycle number (1-based). */
  currentTurnCycle: number;
  /** Campaign character id whose turn it is (for highlight). */
  currentTurnCampaignCharacterId: string | null;
  hoveredCampaignCharacterId?: string | null;
  onAvatarClick?: (characterId: string) => void;
  /** Called with campaign character ids in new order after drag reorder. */
  onReorderTurnOrder?: (orderedCampaignCharacterIds: string[]) => void | Promise<void>;
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
  onReorderTurnOrder,
}: TurnOrderSceneProps) {
  const { campaignCharacters, updateCampaignCharacter } = useCampaignCharacters(campaignId);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropDisplayIndex: number) => {
    e.preventDefault();
    const dragDisplayIndexJson = e.dataTransfer.getData(DRAG_DATA_KEY);
    if (dragDisplayIndexJson === '' || !onReorderTurnOrder) return;
    const dragDisplayIndex = Number(JSON.parse(dragDisplayIndexJson));
    if (Number.isNaN(dragDisplayIndex) || dragDisplayIndex === dropDisplayIndex) return;
    const reordered = [...displayOrder];
    const [removed] = reordered.splice(dragDisplayIndex, 1);
    reordered.splice(dropDisplayIndex, 0, removed);
    const orderedIds = reordered.map((entry) => entry.cc.id);
    void onReorderTurnOrder(orderedIds);
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col border-r bg-muted/20 p-3'>
      <p className='mb-2 text-sm text-muted-foreground'>Turn {currentTurnCycle}</p>
      <div className='flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2'>
        {displayOrder.map((entry, displayIndex) => (
          <TurnOrderPortrait
            key={entry.cc.id}
            entry={entry}
            displayIndex={displayIndex}
            isCurrentTurn={entry.cc.id === currentTurnCampaignCharacterId}
            isHovered={entry.cc.id === hoveredCampaignCharacterId}
            scriptLogs={scriptLogs}
            pinnedAttributeIds={entry.cc.pinnedTurnOrderAttributeIds ?? []}
            onPinAttributesChange={(pinnedIds) =>
              void updateCampaignCharacter(entry.cc.id, { pinnedTurnOrderAttributeIds: pinnedIds })
            }
            onAvatarClick={onAvatarClick}
            onDragStart={
              onReorderTurnOrder
                ? (e) => {
                    e.dataTransfer.setData(DRAG_DATA_KEY, JSON.stringify(displayIndex));
                    e.dataTransfer.effectAllowed = 'move';
                  }
                : undefined
            }
            onDragOver={onReorderTurnOrder ? handleDragOver : undefined}
            onDrop={onReorderTurnOrder ? (e) => handleDrop(e, displayIndex) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface TurnOrderPortraitProps {
  entry: CampaignCharacterWithName;
  displayIndex: number;
  isCurrentTurn: boolean;
  isHovered: boolean;
  scriptLogs: ScriptLog[];
  /** Pinned character attribute ids (stored on campaign character). */
  pinnedAttributeIds: string[];
  onPinAttributesChange: (pinnedIds: string[]) => void;
  onAvatarClick?: (characterId: string) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

type PortraitView = 'log' | 'attributes';

function TurnOrderPortrait({
  entry,
  displayIndex,
  isCurrentTurn,
  isHovered,
  scriptLogs,
  pinnedAttributeIds: pinnedIdsFromCc,
  onPinAttributesChange,
  onAvatarClick,
  onDragStart,
  onDragOver,
  onDrop,
}: TurnOrderPortraitProps) {
  const { character, cc } = entry;
  const showRing = isCurrentTurn || isHovered;
  const [view, setView] = useState<PortraitView>('log');
  const { characterAttributes } = useCharacterAttributes(character?.id);
  const pinnedSet = useMemo(() => new Set(pinnedIdsFromCc), [pinnedIdsFromCc]);

  const sortedAttributes = useMemo(() => {
    return [...characterAttributes].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  }, [characterAttributes]);

  const togglePinAttribute = useCallback(
    (attrId: string) => {
      const next = new Set(pinnedSet);
      if (next.has(attrId)) next.delete(attrId);
      else next.add(attrId);
      onPinAttributesChange(Array.from(next));
    },
    [pinnedSet, onPinAttributesChange],
  );

  const { pinnedAttributes, unpinnedAttributes } = useMemo(() => {
    const pinned: typeof sortedAttributes = [];
    const unpinned: typeof sortedAttributes = [];
    for (const attr of sortedAttributes) {
      if (pinnedSet.has(attr.id)) pinned.push(attr);
      else unpinned.push(attr);
    }
    return { pinnedAttributes: pinned, unpinnedAttributes: unpinned };
  }, [sortedAttributes, pinnedSet]);

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
      className={`flex items-stretch gap-2 ${isCurrentTurn ? 'mb-8' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}>
      {onDragStart && (
        <div
          role='button'
          tabIndex={0}
          draggable
          onDragStart={onDragStart}
          className='flex shrink-0 cursor-grab touch-none flex-col items-center justify-center self-stretch rounded border-0 bg-transparent px-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing'
          aria-label='Drag to reorder turn'>
          <GripVertical className='size-4' />
        </div>
      )}
      <div className='flex shrink-0 flex-col items-center gap-1'>
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
      <div className='flex min-h-0 min-w-0 flex-1 flex-col gap-0.5'>
        <div
          className='h-26 min-h-0 min-w-0 flex-1 overflow-y-auto rounded border bg-background/80 px-2 py-1 font-mono text-xs'
          aria-label={
            view === 'log'
              ? `Log for ${character?.name ?? 'character'}'s turn`
              : `Attributes for ${character?.name ?? 'character'}`
          }>
          {view === 'log' ? (
            logLines.length === 0 ? (
              <span className='text-muted-foreground'>Waiting for turn</span>
            ) : (
              <div className='flex flex-col gap-0.5 break-words text-muted-foreground'>
                {logLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )
          ) : sortedAttributes.length === 0 ? (
            <span className='text-muted-foreground'>No attributes</span>
          ) : (
            <div className='flex flex-col gap-0.5 break-words text-muted-foreground max-h-[100px] overflow-auto'>
              {pinnedAttributes.map((attr) => (
                <button
                  key={attr.id}
                  type='button'
                  onClick={() => togglePinAttribute(attr.id)}
                  className='flex w-full cursor-pointer items-center gap-1 rounded text-left text-[12px] hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                  title='Click to unpin from top'
                  aria-label={`Unpin ${attr.title ?? 'attribute'} from top`}>
                  <Pin className='size-2.5 shrink-0 fill-current' aria-hidden />
                  <span>
                    {attr.title ?? 'Unnamed'}: {String(attr.value)}
                  </span>
                </button>
              ))}
              {pinnedAttributes.length > 0 && unpinnedAttributes.length > 0 && (
                <div className='my-0.5 border-t border-border' role='separator' />
              )}
              {unpinnedAttributes.map((attr) => (
                <button
                  key={attr.id}
                  type='button'
                  onClick={() => togglePinAttribute(attr.id)}
                  className='flex w-full cursor-pointer items-center gap-1 rounded text-left text-[12px] text-muted-foreground/80 hover:bg-muted/80 hover:text-muted-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                  title='Click to pin to top'
                  aria-label={`Pin ${attr.title ?? 'attribute'} to top`}>
                  <Pin className='size-2.5 shrink-0 opacity-50' aria-hidden />
                  <span>
                    {attr.title ?? 'Unnamed'}: {String(attr.value)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className='flex shrink-0 gap-1.5'>
          <button
            type='button'
            onClick={() => setView('log')}
            className={`text-[10px] font-medium transition-colors ${
              view === 'log' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={view === 'log'}
            aria-label='Show game log'>
            Log
          </button>
          <button
            type='button'
            onClick={() => setView('attributes')}
            className={`text-[10px] font-medium transition-colors ${
              view === 'attributes'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-pressed={view === 'attributes'}
            aria-label='Show attributes'>
            Attributes
          </button>
        </div>
      </div>
    </motion.div>
  );
}
