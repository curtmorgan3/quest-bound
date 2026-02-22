import { ArchetypeLookup } from '@/lib/compass-api';
import type { Archetype } from '@/types';
import { useCampaignContext } from '@/stores';
import { useCallback, useState } from 'react';

export type TileMenuPayload = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  tileId: string;
};

interface TileMenuProps {
  children: (props: { onTileMenuRequest: (payload: TileMenuPayload) => void }) => React.ReactNode;
}

type MenuOption = { label: string; action: 'move' | 'createCharacter' };

const selectedCharacterOptions: MenuOption[] = [{ label: 'Move', action: 'move' }];

const emptyTileOptions: MenuOption[] = [{ label: 'Create Character', action: 'createCharacter' }];

export function TileMenu({ children }: TileMenuProps) {
  const { viewingLocationId, selectedCharacters, moveSelectedCharactersTo, rulesetId } =
    useCampaignContext();

  const [tileMenu, setTileMenu] = useState<{
    clientX: number;
    clientY: number;
    tileId: string;
  } | null>(null);
  const [showArchetypeLookup, setShowArchetypeLookup] = useState(false);

  const onTileMenuRequest = useCallback((payload: TileMenuPayload) => {
    setTileMenu({
      clientX: payload.clientX,
      clientY: payload.clientY,
      tileId: payload.tileId,
    });
  }, []);

  const handleMoveCharacter = useCallback(() => {
    if (!tileMenu) return;
    if (viewingLocationId && selectedCharacters.length > 0) {
      moveSelectedCharactersTo(viewingLocationId, tileMenu.tileId);
    }
    setTileMenu(null);
  }, [tileMenu, viewingLocationId, selectedCharacters.length, moveSelectedCharactersTo]);

  const handleCreateCharacterClick = useCallback(() => {
    setShowArchetypeLookup(true);
  }, []);

  const handleArchetypeSelect = useCallback((archetype: Archetype) => {
    // Stub: create character with selected archetype at tile
    void archetype;
    setShowArchetypeLookup(false);
    setTileMenu(null);
  }, []);

  const options = selectedCharacters.length > 0 ? selectedCharacterOptions : emptyTileOptions;

  const handleOptionClick = useCallback(
    (action: MenuOption['action']) => {
      if (action === 'move') handleMoveCharacter();
      else if (action === 'createCharacter') handleCreateCharacterClick();
    },
    [handleMoveCharacter, handleCreateCharacterClick],
  );

  const closeMenu = useCallback(() => {
    setTileMenu(null);
    setShowArchetypeLookup(false);
  }, []);

  return (
    <>
      {children({ onTileMenuRequest })}
      {tileMenu && (
        <>
          <div className='fixed inset-0 z-10' onClick={closeMenu} aria-hidden />
          {showArchetypeLookup ? (
            <div
              className='fixed z-20 rounded-md border bg-popover p-3 shadow-md'
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
              className='fixed z-20 rounded-md border bg-popover px-2 py-1 shadow-md'
              style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
              {options.map((opt) => (
                <button
                  key={opt.action}
                  type='button'
                  className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
                  onClick={() => handleOptionClick(opt.action)}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
