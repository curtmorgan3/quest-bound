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
    await db.attributes.update(id, {
      ...data,
      updatedAt: now,
    });
  };

  const deleteAttribute = async (id: string) => {
    await db.attributes.delete(id);
  };

  return { attributes: attributes ?? [], createAttribute, updateAttribute, deleteAttribute };
};
