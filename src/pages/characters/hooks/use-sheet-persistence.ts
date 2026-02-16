import { useCharacter } from '@/lib/compass-api';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useSheetPersistence = (characterId?: string) => {
  const { character, updateCharacter } = useCharacter(characterId);
  const [searchParams] = useSearchParams();

  const pageId = searchParams.get('pageId');

  useEffect(() => {
    if (!character) return;
    if (character.lastViewedPageId === pageId) return;
    updateCharacter(character.id, { lastViewedPageId: pageId });
  }, [pageId]);

  const sheetViewerPersistence = useMemo(() => {
    if (!character) return undefined;
    return {
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
