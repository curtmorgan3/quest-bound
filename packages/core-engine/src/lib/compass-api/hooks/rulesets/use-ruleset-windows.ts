import { useErrorHandler } from '@/hooks';
import { syncCharacterWindowsFromRulesetWindowRow } from '@/lib/compass-api/utils/sync-character-windows-from-ruleset-window';
import { db, useApiLoadingStore } from '@/stores';
import type { RulesetWindow } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useRulesets } from './use-rulesets';

export const useRulesetWindows = (pageId?: string | null) => {
  const { activeRuleset } = useRulesets();
  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(async () => {
    if (!activeRuleset?.id) return [];
    if (!pageId) return [];
    const collection = db.rulesetWindows.where('rulesetId').equals(activeRuleset.id);
    const all = await collection.toArray();
    if (!pageId) return all;
    return all.filter((w) => w.pageId === pageId);
  }, [activeRuleset?.id, pageId]);

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
      let nextLayer = data.layer;
      if (nextLayer == null && data.pageId) {
        const siblings = await db.rulesetWindows.where('pageId').equals(data.pageId).toArray();
        const maxLayer = siblings.reduce(
          (m, r) =>
            Math.max(m, typeof r.layer === 'number' && Number.isFinite(r.layer) ? r.layer : -1),
          -1,
        );
        nextLayer = maxLayer + 1;
      }
      await db.rulesetWindows.add({
        ...data,
        layer: nextLayer,
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
      await syncCharacterWindowsFromRulesetWindowRow(id);
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
