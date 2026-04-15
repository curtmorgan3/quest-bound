import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { Page } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useActiveRuleset } from './use-active-ruleset';

/** Returns ruleset pages (templates) for a given ruleset id. Use when not in active-ruleset context (e.g. character sheet). */
export const useRulesetPagesForRuleset = (rulesetId?: string) => {
  const pages = useLiveQuery(async (): Promise<Page[]> => {
    if (!rulesetId) return [];
    return db.pages.where('rulesetId').equals(rulesetId).toArray();
  }, [rulesetId]);
  return pages ?? [];
};

export const useRulesetPages = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const pages = useLiveQuery(async () => {
    if (!activeRuleset?.id) return [];
    return db.pages.where('rulesetId').equals(activeRuleset.id).toArray();
  }, [activeRuleset?.id]);

  const list = pages ?? [];
  const isLoading = pages === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('rulesetPages', isLoading);
  }, [isLoading]);

  const createPage = async (data: Omit<Page, 'id' | 'createdAt' | 'updatedAt' | 'rulesetId'>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const trimmedLabel = data.label?.trim();

      if (trimmedLabel) {
        const existingWithSameLabel = await db.pages
          .where('rulesetId')
          .equals(activeRuleset.id)
          .filter(
            (p) => p.label?.trim().toLowerCase() === trimmedLabel.toLowerCase(),
          )
          .first();

        if (existingWithSameLabel) {
          await handleError(
            new Error(
              `A page named "${trimmedLabel}" already exists in this ruleset. Use a different name.`,
            ),
            {
              component: 'useRulesetPages/createPage',
              severity: 'medium',
            },
          );
          return;
        }
      }

      await db.pages.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
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
    data: Partial<
      Pick<
        Page,
        | 'label'
        | 'category'
        | 'assetId'
        | 'assetUrl'
        | 'backgroundOpacity'
        | 'backgroundColor'
        | 'image'
        | 'hideFromPlayerView'
      >
    >,
  ) => {
    const now = new Date().toISOString();
    try {
      const trimmedLabel = data.label?.trim();

      if (trimmedLabel) {
        const existingPage = await db.pages.get(id);

        if (existingPage?.rulesetId) {
          const duplicate = await db.pages
            .where('rulesetId')
            .equals(existingPage.rulesetId)
            .filter(
              (p) =>
                p.id !== id &&
                p.label?.trim().toLowerCase() === trimmedLabel.toLowerCase(),
            )
            .first();

          if (duplicate) {
            await handleError(
              new Error(
                `A page named "${trimmedLabel}" already exists in this ruleset. Use a different name.`,
              ),
              {
                component: 'useRulesetPages/updatePage',
                severity: 'medium',
              },
            );
            return;
          }
        }
      }

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
    try {
      await db.rulesetWindows.where('pageId').equals(pageId).delete();
      await db.pages.delete(pageId);
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesetPages/removePageFromRuleset',
        severity: 'medium',
      });
    }
  };

  return {
    pages: list,
    isLoading,
    createPage,
    updatePage,
    removePageFromRuleset,
  };
};
