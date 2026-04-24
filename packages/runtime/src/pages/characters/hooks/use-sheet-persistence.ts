import { useCharacter } from '@/lib/compass-api';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Persists last viewed character sheet page id from the URL. */
export const useSheetPersistence = (characterId?: string) => {
  const { character, updateCharacter } = useCharacter(characterId);
  const [searchParams] = useSearchParams();

  const pageId = searchParams.get('pageId');
  const hasPageIdInUrl = searchParams.has('pageId');

  const updateCharacterRef = useRef(updateCharacter);
  updateCharacterRef.current = updateCharacter;

  useEffect(() => {
    if (!character?.id) return;
    if (!hasPageIdInUrl) return;
    if (character.lastViewedPageId === pageId) return;
    updateCharacterRef.current(character.id, { lastViewedPageId: pageId });
  }, [hasPageIdInUrl, pageId, character?.id, character?.lastViewedPageId]);

  return {};
};
