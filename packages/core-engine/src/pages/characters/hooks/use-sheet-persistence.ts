import { useCharacter } from '@/lib/compass-api';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Persists last viewed character sheet page id from the URL. */
export const useSheetPersistence = (characterId?: string) => {
  const { character, updateCharacter } = useCharacter(characterId);
  const [searchParams] = useSearchParams();

  const pageId = searchParams.get('pageId');

  useEffect(() => {
    if (!character?.id) return;
    if (character.lastViewedPageId === pageId) return;
    updateCharacter(character.id, { lastViewedPageId: pageId });
  }, [pageId, character?.id, character?.lastViewedPageId, updateCharacter]);

  return {};
};
