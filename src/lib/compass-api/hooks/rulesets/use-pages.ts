import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Page } from '@/types';

/**
 * Direct CRUD for Page entities. For ruleset-scoped pages use useRulesetPages.
 */
export const usePages = () => {
  const { handleError } = useErrorHandler();

  const getPage = async (id: string): Promise<Page | undefined> => {
    return db.pages.get(id);
  };

  const createPage = async (
    data: Omit<Page, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.pages.add({
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      });
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'usePages/createPage',
        severity: 'medium',
      });
      throw e;
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
        component: 'usePages/updatePage',
        severity: 'medium',
      });
    }
  };

  const deletePage = async (id: string) => {
    try {
      const rulesetPage = await db.rulesetPages.where('pageId').equals(id).first();
      if (rulesetPage) await db.rulesetPages.delete(rulesetPage.id);
      const characterPages = await db.characterPages.where('pageId').equals(id).toArray();
      for (const cp of characterPages) await db.characterPages.delete(cp.id);
      await db.pages.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'usePages/deletePage',
        severity: 'medium',
      });
    }
  };

  return {
    getPage,
    createPage,
    updatePage,
    deletePage,
  };
};
