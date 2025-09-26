import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Attribute } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useAttributes = () => {
  const { activeRuleset } = useRulesets();
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
      await db.attributes.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Attribute);
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
    } catch (e) {
      handleError(e as Error, {
        component: 'useAttributes/deleteAttribute',
        severity: 'medium',
      });
    }
  };

  return { attributes: attributes ?? [], createAttribute, updateAttribute, deleteAttribute };
};
