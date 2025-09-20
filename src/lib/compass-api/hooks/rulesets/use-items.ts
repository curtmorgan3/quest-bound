import { db } from '@/stores';
import type { Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useItems = () => {
  const { activeRuleset } = useRulesets();

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
    await db.items.add({
      ...data,
      id: crypto.randomUUID(),
      rulesetId: activeRuleset.id,
      createdAt: now,
      updatedAt: now,
    } as Item);
  };

  const updateItem = async (id: string, data: Partial<Item>) => {
    const now = new Date().toISOString();
    await db.items.update(id, {
      ...data,
      updatedAt: now,
    });
  };

  const deleteItem = async (id: string) => {
    await db.items.delete(id);
  };

  return { items: items ?? [], createItem, updateItem, deleteItem };
};
