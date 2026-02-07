import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CharacterPage } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCharacter } from './use-character';

export const useCharacterPages = (characterId?: string) => {
  const { character } = useCharacter(characterId);
  const { handleError } = useErrorHandler();

  const characterPages = useLiveQuery(
    () =>
      db.characterPages
        .where('characterId')
        .equals(character?.id ?? '')
        .toArray(),
    [character?.id],
  );

  const createCharacterPage = async (data: { label: string }) => {
    if (!character) return;
    const now = new Date().toISOString();
    try {
      await db.characterPages.add({
        id: crypto.randomUUID(),
        characterId: character.id,
        label: data.label,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/createCharacterPage',
        severity: 'medium',
      });
    }
  };

  const updateCharacterPage = async (
    id: string,
    data: Partial<Pick<CharacterPage, 'label'>>,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.characterPages.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/updateCharacterPage',
        severity: 'medium',
      });
    }
  };

  const deleteCharacterPage = async (id: string) => {
    try {
      await db.characterPages.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/deleteCharacterPage',
        severity: 'medium',
      });
    }
  };

  return {
    characterPages: characterPages ?? [],
    createCharacterPage,
    updateCharacterPage,
    deleteCharacterPage,
  };
};
