import { useErrorHandler } from '@/hooks/use-error-handler';
import { db } from '@/stores';
import type { Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useItems = () => {
  const { activeRuleset } = useRulesets();
  const { handleError } = useErrorHandler();

  const items = useLiveQuery(
    () =>
      db.items
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createItem = async (data: Partial<Item>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.items.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Item);
    } catch (e) {
      handleError(e as Error, {
        component: 'useItems/createItem',
        severity: 'medium',
      });
    }
  };

  const updateItem = async (id: string, data: Partial<Item>) => {
    const now = new Date().toISOString();

    try {
      await db.items.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useItems/updateItem',
        severity: 'medium',
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await db.items.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useItems/deleteItem',
        severity: 'medium',
      });
    }
  };

  return { items: items ?? [], createItem, updateItem, deleteItem };
};
