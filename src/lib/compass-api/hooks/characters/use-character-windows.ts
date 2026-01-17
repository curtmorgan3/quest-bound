import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CharacterWindow } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCharacter } from './use-character';

export type CharacterWindowUpdate = {
  id: string;
  x?: number;
  y?: number;
  isCollapsed?: boolean;
};

export const useCharacterWindows = (characterId?: string) => {
  const { character } = useCharacter(characterId);
  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(
    () =>
      db.characterWindows
        .where('characterId')
        .equals(character?.id ?? 0)
        .toArray(),
    [character],
  );

  const createCharacterWindow = async (
    data: Omit<CharacterWindow, 'id' | 'createdAt' | 'updatedAt' | 'rulesetId'>,
  ) => {
    if (!character) return;
    const now = new Date().toISOString();
    try {
      await db.characterWindows.add({
        ...data,
        id: crypto.randomUUID(),
        characterId: character.id,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/createCharacterWindow',
        severity: 'medium',
      });
    }
  };

  const updateCharacterWindow = async (id: string, data: Partial<CharacterWindow>) => {
    const now = new Date().toISOString();
    try {
      await db.characterWindows.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/updateWindow',
        severity: 'medium',
      });
    }
  };

  const deleteCharacterWindow = async (id: string) => {
    try {
      await db.characterWindows.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/deleteCharacterWindow',
        severity: 'medium',
      });
    }
  };

  return {
    windows: windows ?? [],
    createCharacterWindow,
    updateCharacterWindow,
    deleteCharacterWindow,
  };
};
