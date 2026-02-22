import { ArchetypeLookup } from '@/lib/compass-api';
import { useCampaignContext } from '@/stores';
import type { Archetype } from '@/types';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TileMenu, TileMenuPayload } from '../hooks';

interface TileMenuProps {
  onTileMenuRequest: (payload: TileMenuPayload | null) => void;
  tileMenu?: TileMenu;
  lastClickedTileId?: string | null;
}

type MenuOption = { label: string; action: 'move' | 'createCharacter' };

const selectedCharacterOptions: MenuOption[] = [{ label: 'Move', action: 'move' }];
const emptyTileOptions: MenuOption[] = [{ label: 'Create Character', action: 'createCharacter' }];

export function TileMenu({ onTileMenuRequest, tileMenu, lastClickedTileId }: TileMenuProps) {
  const {
    viewingLocationId,
    selectedCharacters,
    moveSelectedCharactersTo,
    rulesetId,
    handleCreateCampaignCharacter,
    currentLocation,
  } = useCampaignContext();

  const [showArchetypeLookup, setShowArchetypeLookup] = useState(false);

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

  const options = selectedCharacters.length > 0 ? selectedCharacterOptions : emptyTileOptions;

  const handleOptionClick = useCallback(
    (action: MenuOption['action']) => {
      if (action === 'move') handleMoveCharacter();
      else if (action === 'createCharacter') handleCreateCharacterClick();
    },
    [handleMoveCharacter, handleCreateCharacterClick],
  );

  const closeMenu = useCallback(() => {
    onTileMenuRequest(null);
    setShowArchetypeLookup(false);
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
