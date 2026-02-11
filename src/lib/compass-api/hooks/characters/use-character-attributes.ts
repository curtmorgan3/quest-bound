import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CharacterAttribute } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCharacter } from './use-character';

export const useCharacterAttributes = (characterId?: string) => {
  const { character } = useCharacter(characterId);
  const { handleError } = useErrorHandler();

  const characterAttributes = useLiveQuery(
    () =>
      db.characterAttributes
        .where('characterId')
        .equals(character?.id ?? 0)
        .toArray(),
    [character],
  );

  const createCharacterAttribute = async (
    data: Omit<CharacterAttribute, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!character) return;
    const now = new Date().toISOString();
    try {
      await db.characterAttributes.add({
        ...data,
        id: crypto.randomUUID(),
        characterId: character.id,
        createdAt: now,
        updatedAt: now,
      } as CharacterAttribute);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterAttributes/createCharacterAttribute',
        severity: 'medium',
      });
    }
  };

  const updateCharacterAttribute = async (id: string, data: Partial<CharacterAttribute>) => {
    const now = new Date().toISOString();

    const newMin = data.min;
    const newMax = data.max;
    const newDefaultValue = data.defaultValue;

    // Ensure min is not greater than max
    if (newMin !== undefined && newMax !== undefined && newMin > newMax) {
      console.warn('Min cannot be greater than Max. Adjusting Max to match Min.');
      data.max = newMin;
    }

    // Ensure defaultValue is within the new min and max bounds
    if (newDefaultValue !== undefined) {
      if (newMin !== undefined && typeof newDefaultValue === 'number' && newDefaultValue < newMin) {
        console.warn('Default value is less than Min. Adjusting Default value to match Min.');
        data.defaultValue = newMin;
      } else if (
        newMax !== undefined &&
        typeof newDefaultValue === 'number' &&
        newDefaultValue > newMax
      ) {
        console.warn('Default value is greater than Max. Adjusting Default value to match Max.');
        data.max = newDefaultValue;
      }
    }

    try {
      await db.characterAttributes.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterAttributes/updateCharacterAttribute',
        severity: 'medium',
      });
    }
  };

  const deleteCharacterAttribute = async (id: string) => {
    try {
      await db.characterAttributes.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterAttributes/deleteCharacterAttribute',
        severity: 'medium',
      });
    }
  };

  const syncWithRuleset = async (): Promise<number> => {
    if (!character?.rulesetId) return 0;

    try {
      const rulesetAttributes = await db.attributes
        .where({ rulesetId: character.rulesetId })
        .toArray();
      const existingAttributeIds = new Set((characterAttributes ?? []).map((ca) => ca.attributeId));

      const missingAttributes = rulesetAttributes.filter(
        (attr) => !existingAttributeIds.has(attr.id),
      );

      if (missingAttributes.length === 0) return 0;

      const now = new Date().toISOString();

      // Should handle edits as well

      await db.characterAttributes.bulkAdd(
        missingAttributes.map((attr) => ({
          ...attr,
          id: crypto.randomUUID(),
          characterId: character.id,
          attributeId: attr.id,
          value: attr.defaultValue,
          createdAt: now,
          updatedAt: now,
        })),
      );

      return missingAttributes.length;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterAttributes/syncWithRuleset',
        severity: 'medium',
      });
      return 0;
    }
  };

  return {
    characterAttributes: characterAttributes ?? [],
    createCharacterAttribute,
    updateCharacterAttribute,
    deleteCharacterAttribute,
    syncWithRuleset,
  };
};
