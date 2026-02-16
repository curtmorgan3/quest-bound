import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { Page } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useActiveRuleset } from './use-active-ruleset';

/** Page with its ruleset join id (for remove operations). */
export type RulesetPageWithPage = Page & { rulesetPageId: string };

export const useRulesetPages = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const pagesWithJoinId = useLiveQuery(
    async () => {
      if (!activeRuleset?.id) return [];
      const joins = await db.rulesetPages
        .where('rulesetId')
        .equals(activeRuleset.id)
        .toArray();
      const result: RulesetPageWithPage[] = [];
      for (const j of joins) {
        const page = await db.pages.get(j.pageId);
        if (page) result.push({ ...page, rulesetPageId: j.id });
      }
      return result;
    },
    [activeRuleset?.id],
  );

  const pages = pagesWithJoinId ?? [];

  const isLoading = pagesWithJoinId === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('rulesetPages', isLoading);
  }, [isLoading]);

  const addPageToRuleset = async (pageId: string) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const existing = await db.rulesetPages
        .where('[rulesetId+pageId]')
        .equals([activeRuleset.id, pageId])
        .first();
      if (existing) return;
      await db.rulesetPages.add({
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        pageId,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetPages/addPageToRuleset',
        severity: 'medium',
      });
    }
  };

  const createPage = async (
    data: Omit<Page, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    const pageId = crypto.randomUUID();
    try {
      await db.pages.add({
        ...data,
        id: pageId,
        createdAt: now,
        updatedAt: now,
      });
      await db.rulesetPages.add({
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        pageId,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetPages/createPage',
        severity: 'medium',
      });
    }
  };

  const updatePage = async (
    id: string,
    data: Partial<Pick<Page, 'label' | 'category' | 'assetId' | 'assetUrl' | 'backgroundOpacity' | 'backgroundColor' | 'image'>>,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.pages.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetPages/updatePage',
        severity: 'medium',
      });
    }
  };

  const removePageFromRuleset = async (pageId: string) => {
    if (!activeRuleset) return;
    try {
      const join = await db.rulesetPages
        .where('[rulesetId+pageId]')
        .equals([activeRuleset.id, pageId])
        .first();
      if (join) await db.rulesetPages.delete(join.id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetPages/removePageFromRuleset',
        severity: 'medium',
      });
    }
  };

  return {
    pages,
    isLoading,
    addPageToRuleset,
    createPage,
    updatePage,
    removePageFromRuleset,
  };
};
