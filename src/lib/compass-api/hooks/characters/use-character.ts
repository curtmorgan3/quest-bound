import { useErrorHandler } from '@/hooks';
import { db, useCurrentUser } from '@/stores';
import type { Character, CharacterAttribute, Inventory } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { useAssets } from '../assets';
import { useAttributes } from '../rulesets';

export type CharacterWithInventories = Character & {
  inventories: Inventory[];
};

export const useCharacter = (_id?: string) => {
  const { characterId } = useParams();
  const { attributes } = useAttributes();
  const { currentUser } = useCurrentUser();
  const { handleError } = useErrorHandler();
  const { deleteAsset } = useAssets();

  const characters = useLiveQuery(
    () =>
      db.characters
        .where('userId')
        .equals(currentUser?.id ?? 0)
        .toArray(),
    [currentUser],
  );

  const id = _id ?? characterId;

  const character = characters?.find((c) => c.id === id);

  const bootstrapCharacterAttributes = async (characterId: string) => {
    const characterAttributes: CharacterAttribute[] = [];
    for (const attribute of attributes) {
      characterAttributes.push({
        ...attribute,
        characterId,
        attributeId: attribute.id,
        value: attribute.defaultValue,
      });
    }

    const now = new Date().toISOString();

    await db.characterAttributes.bulkAdd(
      characterAttributes.map((ca) => ({
        ...ca,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })),
    );
  };

  const createCharacter = async (data: Partial<Character>) => {
    if (!data.rulesetId || !currentUser) return;
    const now = new Date().toISOString();
    try {
      const id = await db.characters.add({
        ...data,
        id: crypto.randomUUID(),
        userId: currentUser.id,
        createdAt: now,
        updatedAt: now,
        isTestCharacter: data.isTestCharacter ?? false,
      } as Character);

      await bootstrapCharacterAttributes(id);
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
      if (data.assetId === null) {
        const original = await db.characters.get(id);
        if (original?.assetId) {
          await deleteAsset(original.assetId);
        }
        data.image = null;
      }

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
      const character = await db.characters.get(id);
      if (!character) return;

      if (character.assetId) {
        await deleteAsset(character.assetId);
      }

      const characterAttributes = await db.characterAttributes
        .where({ characterId: character.id })
        .toArray();
      await db.characterAttributes.bulkDelete(characterAttributes.map((ca) => ca.id));

      await db.characters.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/deleteCharacter',
        severity: 'medium',
      });
    }
  };

  const getCharacter = async (id: string): Promise<CharacterWithInventories | null> => {
    try {
      const character = await db.characters.get(id);
      if (!character) return null;

      const characterInventories = await db.characterInventories
        .where('characterId')
        .equals(id)
        .toArray();

      const inventoryIds = characterInventories.map((ci) => ci.inventoryId);
      const inventories = await db.inventories.where('id').anyOf(inventoryIds).toArray();

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
    character,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
  };
};
