import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Composite } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useComposites = () => {
  const { activeRuleset } = useRulesets();
  const { handleError } = useErrorHandler();

  const composites = useLiveQuery(
    () =>
      db.composites
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createComposite = async (data: Partial<Composite>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.composites.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Composite);
    } catch (e) {
      handleError(e as Error, {
        component: 'useComposites/createComposite',
        severity: 'medium',
      });
    }
  };

  const updateComposite = async (id: string, data: Partial<Composite>) => {
    const now = new Date().toISOString();
    try {
      await db.composites.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useComposites/updateComposite',
        severity: 'medium',
      });
    }
  };

  const deleteComposite = async (id: string) => {
    try {
      const components = await db.components.where({ compositeId: id }).toArray();
      await db.components.bulkDelete(components.map((c) => c.id));
      await db.composites.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useComposites/deleteComposite',
        severity: 'medium',
      });
    }
  };

  return { composites: composites ?? [], createComposite, updateComposite, deleteComposite };
};
