import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { Action } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useAssets } from '../assets';
import { useActiveRuleset } from './use-active-ruleset';

export const useActions = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();
  const { deleteAsset } = useAssets();

  const actions = useLiveQuery(
    () =>
      db.actions
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const isLoading = actions === undefined;

  useEffect(() => {
    useApiLoadingStore.getState().setLoading('actions', isLoading);
  }, [isLoading]);

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
      if (data.assetId === null) {
        const original = await db.actions.get(id);
        if (original?.assetId) {
          await deleteAsset(original.assetId);
        }

        if (!data.image) {
          data.image = null;
        }
      }
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

  return {
    actions: actions ?? [],
    isLoading,
    createAction,
    updateAction,
    deleteAction,
  };
};
