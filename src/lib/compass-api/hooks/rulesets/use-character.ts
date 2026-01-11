import { useErrorHandler } from '@/hooks';
import { db, useCurrentUser } from '@/stores';
import type { Character, Inventory } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export type CharacterWithInventories = Character & {
  inventories: Inventory[];
};

export const useCharacter = () => {
  const { currentUser } = useCurrentUser();
  const { handleError } = useErrorHandler();

  const characters = useLiveQuery(
    () =>
      db.characters
        .where('userId')
        .equals(currentUser?.id ?? 0)
        .toArray(),
    [currentUser],
  );

  const createCharacter = async (data: Partial<Character>) => {
    if (!data.rulesetId) return;
    const now = new Date().toISOString();
    try {
      await db.characters.add({
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as Character);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/createCharacter',
        severity: 'medium',
      });
    }
  };

  const updateCharacter = async (id: string, data: Partial<Character>) => {
    const now = new Date().toISOString();
    try {
      await db.characters.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/updateCharacter',
        severity: 'medium',
      });
    }
  };

  const deleteCharacter = async (id: string) => {
    try {
      await db.characters.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/deleteCharacter',
        severity: 'medium',
      });
    }
  };

  const getCharacter = async (
    id: string,
  ): Promise<CharacterWithInventories | null> => {
    try {
      const character = await db.characters.get(id);
      if (!character) return null;

      const characterInventories = await db.characterInventories
        .where('characterId')
        .equals(id)
        .toArray();

      const inventoryIds = characterInventories.map((ci) => ci.inventoryId);
      const inventories = await db.inventories
        .where('id')
        .anyOf(inventoryIds)
        .toArray();

      return {
        ...character,
        inventories,
      };
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/getCharacter',
        severity: 'medium',
      });
      return null;
    }
  };

  return {
    characters: characters ?? [],
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
  };
};
