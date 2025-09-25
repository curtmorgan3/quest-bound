import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Action } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useActions = () => {
  const { activeRuleset } = useRulesets();
  const { handleError } = useErrorHandler();

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
    try {
      await db.actions.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Action);
    } catch (e) {
      handleError(e as Error, {
        component: 'useActions/createAction',
        severity: 'medium',
      });
    }
  };

  const updateAction = async (id: string, data: Partial<Action>) => {
    const now = new Date().toISOString();
    try {
      await db.actions.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useActions/updateAction',
        severity: 'medium',
      });
    }
  };

  const deleteAction = async (id: string) => {
    try {
      await db.actions.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useActions/deleteAction',
        severity: 'medium',
      });
    }
  };

  return { actions: actions ?? [], createAction, updateAction, deleteAction };
};
