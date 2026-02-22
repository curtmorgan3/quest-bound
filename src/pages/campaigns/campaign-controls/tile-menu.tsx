import { ArchetypeLookup, EventLookup, type EventLocationWithEvent } from '@/lib/compass-api';
import { useCampaignContext } from '@/stores';
import type { Archetype, CampaignEvent, ITileMenu, TileMenuPayload } from '@/types';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface TileMenuProps {
  onTileMenuRequest: (payload: TileMenuPayload | null) => void;
  tileMenu?: ITileMenu;
  lastClickedTileId?: string | null;
  /** When the clicked tile has an event, pass it so the menu can show "Remove Event". */
  eventAtClickedTile?: EventLocationWithEvent | null;
  campaignId?: string;
}

type MenuOption = {
  label: string;
  action: 'move' | 'createCharacter' | 'addEvent' | 'removeEvent';
};

const selectedCharacterOptions: MenuOption[] = [{ label: 'Move', action: 'move' }];
const emptyTileOptionsBase: MenuOption[] = [
  { label: 'Create Character', action: 'createCharacter' },
  { label: 'Add Event', action: 'addEvent' },
];
const emptyTileOptionsWithEvent: MenuOption[] = [
  { label: 'Create Character', action: 'createCharacter' },
  { label: 'Remove Event', action: 'removeEvent' },
];

export function TileMenu({
  onTileMenuRequest,
  tileMenu,
  lastClickedTileId,
  eventAtClickedTile,
  campaignId,
}: TileMenuProps) {
  const {
    viewingLocationId,
    selectedCharacters,
    moveSelectedCharactersTo,
    rulesetId,
    handleCreateCampaignCharacter,
    handleAddEventToTile,
    handleRemoveEventFromTile,
    currentLocation,
  } = useCampaignContext();

  const [showArchetypeLookup, setShowArchetypeLookup] = useState(false);
  const [showEventLookup, setShowEventLookup] = useState(false);
  const [pendingEventTile, setPendingEventTile] = useState<{
    locationId: string;
    tileId: string;
  } | null>(null);

  const handleMoveCharacter = useCallback(() => {
    if (!tileMenu) return;
    if (viewingLocationId && selectedCharacters.length > 0) {
      moveSelectedCharactersTo(viewingLocationId, tileMenu.tileId);
    }
    onTileMenuRequest(null);
  }, [tileMenu, viewingLocationId, selectedCharacters.length, moveSelectedCharactersTo]);

  const handleCreateCharacterClick = useCallback(() => {
    setShowArchetypeLookup(true);
  }, []);

  const handleArchetypeSelect = useCallback(
    (archetype: Archetype) => {
      handleCreateCampaignCharacter(archetype.id, lastClickedTileId ?? undefined);
      setShowArchetypeLookup(false);
      onTileMenuRequest(null);
    },
    [lastClickedTileId],
  );

  const handleAddEventClick = useCallback(() => {
    if (!tileMenu || !viewingLocationId) return;
    setPendingEventTile({ locationId: viewingLocationId, tileId: tileMenu.tileId });
    setShowEventLookup(true);
  }, [tileMenu, viewingLocationId]);

  const handleEventSelect = useCallback(
    async (event: CampaignEvent) => {
      console.log('event: ', event);
      if (!pendingEventTile) return;
      await handleAddEventToTile(pendingEventTile, event.id);
      setShowEventLookup(false);
      setPendingEventTile(null);
      onTileMenuRequest(null);
    },
    [pendingEventTile, handleAddEventToTile, onTileMenuRequest],
  );

  const handleRemoveEventClick = useCallback(async () => {
    if (!eventAtClickedTile) return;
    await handleRemoveEventFromTile(eventAtClickedTile.id);
    onTileMenuRequest(null);
  }, [eventAtClickedTile, handleRemoveEventFromTile]);

  const emptyTileOptions =
    eventAtClickedTile != null ? emptyTileOptionsWithEvent : emptyTileOptionsBase;
  const options = selectedCharacters.length > 0 ? selectedCharacterOptions : emptyTileOptions;

  const handleOptionClick = useCallback(
    (action: MenuOption['action']) => {
      if (action === 'move') handleMoveCharacter();
      else if (action === 'createCharacter') handleCreateCharacterClick();
      else if (action === 'addEvent') handleAddEventClick();
      else if (action === 'removeEvent') handleRemoveEventClick();
    },
    [handleMoveCharacter, handleCreateCharacterClick, handleAddEventClick, handleRemoveEventClick],
  );

  const closeMenu = useCallback(() => {
    onTileMenuRequest(null);
    setShowArchetypeLookup(false);
    setShowEventLookup(false);
    setPendingEventTile(null);
  }, []);

  const clickedTile = tileMenu
    ? (currentLocation?.tiles ?? []).find((t) => t.id === tileMenu.tileId)
    : undefined;
  const isNotPassable = clickedTile ? !clickedTile.isPassable : false;

  const menuContent =
    tileMenu &&
    createPortal(
      <>
        <div className='fixed inset-0 z-[100]' onClick={closeMenu} aria-hidden />
        {showArchetypeLookup ? (
          <div
            className='fixed z-[101] rounded-md border bg-popover p-3 shadow-md'
            style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
            <ArchetypeLookup
              rulesetId={rulesetId}
              label='Choose archetype'
              placeholder='Search archetypes...'
              onSelect={handleArchetypeSelect}
              allowDefault
            />
          </div>
        ) : showEventLookup ? (
          <div
            className='fixed z-[101] rounded-md border bg-popover p-3 shadow-md'
            style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
            <EventLookup
              campaignId={campaignId}
              label='Choose event'
              placeholder='Search events...'
              onSelect={handleEventSelect}
            />
          </div>
        ) : (
          <div
            className='fixed z-[101] rounded-md border bg-popover px-2 py-1 shadow-md'
            style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
            {isNotPassable ? (
              <p className='px-2 py-1.5 text-sm text-muted-foreground border-b'>
                This tile is impassable.
              </p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.action}
                  type='button'
                  className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
                  onClick={() => {
                    handleOptionClick(opt.action);
                  }}>
                  {opt.label}
                </button>
              ))
            )}
          </div>
        )}
      </>,
      document.body,
    );

  return <>{menuContent}</>;
}
