import { useCallback, useState } from 'react';
import { useCampaignContext } from '../campaign-provider';

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

export function TileMenu({ children }: TileMenuProps) {
  const { viewingLocationId, selectedCharacters, moveSelectedCharactersTo } = useCampaignContext();

  const [tileMenu, setTileMenu] = useState<{
    clientX: number;
    clientY: number;
    tileId: string;
  } | null>(null);

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

  return (
    <>
      {children({ onTileMenuRequest })}
      {tileMenu && (
        <>
          <div className='fixed inset-0 z-10' onClick={() => setTileMenu(null)} aria-hidden />
          <div
            className='fixed z-20 rounded-md border bg-popover px-2 py-1 shadow-md'
            style={{ left: tileMenu.clientX, top: tileMenu.clientY }}>
            <button
              type='button'
              className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
              onClick={handleMoveCharacter}>
              Move Character
            </button>
          </div>
        </>
      )}
    </>
  );
}
