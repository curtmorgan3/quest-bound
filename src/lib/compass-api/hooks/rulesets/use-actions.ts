import { db } from '@/stores';
import type { Action } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useActions = () => {
  const { activeRuleset } = useRulesets();

  const actions = useLiveQuery(
    () =>
      db.actions
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createAction = async (data: Partial<Action>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    await db.actions.add({
      ...data,
      id: crypto.randomUUID(),
      rulesetId: activeRuleset.id,
      createdAt: now,
      updatedAt: now,
    } as Action);
  };

  const updateAction = async (id: string, data: Partial<Action>) => {
    const now = new Date().toISOString();
    await db.actions.update(id, {
      ...data,
      updatedAt: now,
    });
  };

  const deleteAction = async (id: string) => {
    await db.actions.delete(id);
  };

  return { actions: actions ?? [], createAction, updateAction, deleteAction };
};
