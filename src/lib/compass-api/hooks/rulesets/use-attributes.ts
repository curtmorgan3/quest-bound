import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Attribute } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from './use-active-ruleset';

export const useAttributes = () => {
  const { activeRuleset, testCharacter } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const attributes = useLiveQuery(
    () =>
      db.attributes
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createAttribute = async (data: Partial<Attribute>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const id = await db.attributes.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Attribute);

      if (testCharacter) {
        const attr = await db.attributes.get(id);
        if (attr) {
          await db.characterAttributes.add({
            ...attr,
            characterId: testCharacter.id,
            attributeId: id,
            id: crypto.randomUUID(),
            rulesetId: activeRuleset.id,
            createdAt: now,
            updatedAt: now,
            value: attr.defaultValue,
          });
        }
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useAttributes/createAttribute',
        severity: 'medium',
      });
    }
  };

  const updateAttribute = async (id: string, data: Partial<Attribute>) => {
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
      await db.attributes.update(id, {
        ...data,
        updatedAt: now,
      });

      if (testCharacter) {
        const characterAttribute = await db.characterAttributes.get({
          characterId: testCharacter.id,
          attributeId: id,
        });
        if (characterAttribute) {
          await db.characterAttributes.update(characterAttribute.id, {
            defaultValue: data.defaultValue,
            type: data.type,
            description: data.description,
            min: data.min,
            max: data.max,
            options: data.options,
            category: data.category,
            updatedAt: now,
          });
        }
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useAttributes/updateAttribute',
        severity: 'medium',
      });
    }
  };

  const deleteAttribute = async (id: string) => {
    try {
      await db.attributes.delete(id);

      if (testCharacter) {
        const characterAttribute = await db.characterAttributes.get({
          characterId: testCharacter.id,
          attributeId: id,
        });
        if (characterAttribute) {
          await db.characterAttributes.delete(characterAttribute.id);
        }
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useAttributes/deleteAttribute',
        severity: 'medium',
      });
    }
  };

  return { attributes: attributes ?? [], createAttribute, updateAttribute, deleteAttribute };
};
