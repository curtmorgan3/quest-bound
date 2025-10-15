import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Window } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useWindows = () => {
  const { activeRuleset } = useRulesets();
  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(
    () =>
      db.windows
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createWindow = async (
    data: Omit<Window, 'id' | 'createdAt' | 'updatedAt' | 'rulesetId'>,
  ) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.windows.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useWindows/createWindow',
        severity: 'medium',
      });
    }
  };

  const updateWindow = async (id: string, data: Partial<Window>) => {
    const now = new Date().toISOString();
    try {
      await db.windows.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useWindows/updateWindow',
        severity: 'medium',
      });
    }
  };

  const deleteWindow = async (id: string) => {
    try {
      const components = await db.components.where({ windowId: id }).toArray();
      await db.components.bulkDelete(components.map((c) => c.id));

      await db.windows.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useWindows/deleteWindow',
        severity: 'medium',
      });
    }
  };

  return { windows: windows ?? [], createWindow, updateWindow, deleteWindow };
};
