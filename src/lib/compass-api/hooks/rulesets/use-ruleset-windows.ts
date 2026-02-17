import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { RulesetWindow } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useRulesets } from './use-rulesets';

export const useRulesetWindows = (rulesetPageId?: string | null) => {
  const { activeRuleset } = useRulesets();
  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(async () => {
    if (!activeRuleset?.id) return [];
    if (!rulesetPageId) return [];
    const collection = db.rulesetWindows.where('rulesetId').equals(activeRuleset.id);
    const all = await collection.toArray();
    if (!rulesetPageId) return all;
    return all.filter((w) => w.rulesetPageId === rulesetPageId);
  }, [activeRuleset?.id, rulesetPageId]);

  const isLoading = windows === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('windows', isLoading);
  }, [isLoading]);

  const createRulesetWindow = async (
    data: Omit<RulesetWindow, 'id' | 'createdAt' | 'updatedAt' | 'rulesetId'>,
  ) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.rulesetWindows.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as RulesetWindow);
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetWindows/createRulesetWindow',
        severity: 'medium',
      });
    }
  };

  const updateRulesetWindow = async (id: string, data: Partial<RulesetWindow>) => {
    const now = new Date().toISOString();
    try {
      await db.rulesetWindows.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetWindows/updateRulesetWindow',
        severity: 'medium',
      });
    }
  };

  const deleteRulesetWindow = async (id: string) => {
    try {
      await db.rulesetWindows.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetWindows/deleteRulesetWindow',
        severity: 'medium',
      });
    }
  };

  return {
    windows: windows ?? [],
    isLoading,
    createRulesetWindow,
    updateRulesetWindow,
    deleteRulesetWindow,
  };
};
