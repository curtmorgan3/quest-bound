import { useCharacter } from '@/lib/compass-api';
import { useMemo } from 'react';

export const useSheetPersistence = (characterId?: string) => {
  const { character, updateCharacter } = useCharacter(characterId);

  const sheetViewerPersistence = useMemo(() => {
    if (!character) return undefined;
    return {
      onCurrentPageChange: (pageId: string | null) => {
        updateCharacter(character.id, { lastViewedPageId: pageId });
      },
      onLockedChange: (locked: boolean) => {
        updateCharacter(character.id, { sheetLocked: locked });
      },
    };
  }, [
    character?.id,
    character?.lastViewedPageId,
    character?.sheetLocked,
    character,
    updateCharacter,
  ]);

  return {
    sheetViewerPersistence,
  };
};
