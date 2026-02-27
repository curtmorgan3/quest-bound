import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CharacterPage, Page } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesetPages } from '../rulesets';

export const useCharacterPages = (characterId?: string) => {
  const { handleError } = useErrorHandler();
  const { pages } = useRulesetPages();

  const _characterPages = useLiveQuery(async (): Promise<CharacterPage[]> => {
    if (!characterId) return [];
    return db.characterPages.where('characterId').equals(characterId).sortBy('createdAt');
  }, [characterId]);

  console.log('P: ', pages);

  const characterPages = _characterPages?.map((cPage) => {
    // Backwards compatability
    const page = pages.find((p) => p.id === cPage.pageId);
    return {
      ...cPage,
      label: page?.label ?? '',
    };
  });

  const createCharacterPage = async (
    data: { label: string } | { fromPageId: string },
  ): Promise<string | undefined> => {
    if (!characterId) return undefined;
    const now = new Date().toISOString();
    try {
      let newRow: Omit<CharacterPage, 'id' | 'createdAt' | 'updatedAt'>;
      if ('fromPageId' in data) {
        const sourcePage = await db.pages.get(data.fromPageId);
        if (!sourcePage) return undefined;
        const { id: _id, createdAt: _c, updatedAt: _u, ...pageRest } = sourcePage;
        newRow = {
          ...pageRest,
          characterId,
          pageId: data.fromPageId,
        };
      } else {
        const character = await db.characters.get(characterId);
        newRow = {
          rulesetId: character?.rulesetId ?? '',
          label: data.label,
          characterId,
          pageId: '',
        };
      }
      const id = crypto.randomUUID();
      await db.characterPages.add({
        ...newRow,
        id,
        createdAt: now,
        updatedAt: now,
      } as CharacterPage);
      if ('fromPageId' in data) {
        const character = await db.characters.get(characterId);
        if (character) {
          await db.characterPages.update(id, { rulesetId: character.rulesetId });
        }
        const rulesetWindows = await db.rulesetWindows
          .where('pageId')
          .equals(data.fromPageId)
          .toArray();
        for (const rw of rulesetWindows) {
          await db.characterWindows.add({
            id: crypto.randomUUID(),
            characterId,
            characterPageId: id,
            windowId: rw.windowId,
            title: rw.title,
            x: rw.x,
            y: rw.y,
            isCollapsed: rw.isCollapsed,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterPages/createCharacterPage',
        severity: 'medium',
      });
      return undefined;
    }
  };

  const updateCharacterPage = async (
    characterPageId: string,
    data: Partial<
      Pick<
        Page,
        'label' | 'assetId' | 'assetUrl' | 'backgroundOpacity' | 'backgroundColor' | 'image'
      >
    >,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.characterPages.update(characterPageId, {
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
      await db.characterWindows.where('characterPageId').equals(characterPageId).delete();
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
