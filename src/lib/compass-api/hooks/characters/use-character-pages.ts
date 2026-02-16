import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CharacterPage, Page } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

/** Character page join row with Page data merged. `id` is the join row id (for characterPageId, lastViewedPageId). */
export type CharacterPageWithPage = Omit<Page, 'id'> & {
  id: string;
  pageId: string;
};

export const useCharacterPages = (characterId?: string) => {
  const { handleError } = useErrorHandler();

  const characterPages = useLiveQuery(
    async (): Promise<CharacterPageWithPage[]> => {
      if (!characterId) return [];
      const joins = await db.characterPages
        .where('characterId')
        .equals(characterId)
        .sortBy('createdAt');
      const result: CharacterPageWithPage[] = [];
      for (const j of joins) {
        const page = await db.pages.get(j.pageId);
        if (page) {
          const { id: _pageId, ...pageRest } = page;
          result.push({
            ...pageRest,
            id: j.id,
            pageId: page.id,
          });
        }
      }
      return result;
    },
    [characterId],
  );

  const createCharacterPage = async (data: { label: string }) => {
    if (!characterId) return;
    const now = new Date().toISOString();
    try {
      const pageId = crypto.randomUUID();
      await db.pages.add({
        id: pageId,
        label: data.label,
        createdAt: now,
        updatedAt: now,
      });
      await db.characterPages.add({
        id: crypto.randomUUID(),
        characterId,
        pageId,
        createdAt: now,
        updatedAt: now,
      } as CharacterPage);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/createCharacterPage',
        severity: 'medium',
      });
    }
  };

  const updateCharacterPage = async (
    characterPageId: string,
    data: Partial<Pick<Page, 'label' | 'assetId' | 'assetUrl' | 'backgroundOpacity' | 'backgroundColor' | 'image'>>,
  ) => {
    const join = await db.characterPages.get(characterPageId);
    if (!join) return;
    const now = new Date().toISOString();
    try {
      await db.pages.update(join.pageId, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/updateCharacterPage',
        severity: 'medium',
      });
    }
  };

  const deleteCharacterPage = async (characterPageId: string) => {
    try {
      await db.characterPages.delete(characterPageId);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/deleteCharacterPage',
        severity: 'medium',
      });
    }
  };

  return {
    characterPages: characterPages ?? [],
    createCharacterPage,
    updateCharacterPage,
    deleteCharacterPage,
  };
};
