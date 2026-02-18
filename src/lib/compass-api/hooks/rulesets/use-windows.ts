import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { Window } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useRulesets } from './use-rulesets';

export const useWindows = () => {
  const { activeRuleset, testCharacter } = useRulesets();
  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(
    () =>
      db.windows
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const isLoading = windows === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('windows', isLoading);
  }, [isLoading]);

  const createWindow = async (
    data: Omit<Window, 'id' | 'createdAt' | 'updatedAt' | 'rulesetId'>,
  ) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const id = await db.windows.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      });

      // Add all new windows to test character
      if (testCharacter) {
        await db.characterWindows.add({
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          characterId: testCharacter.id,
          windowId: id,
          title: data.title,
          x: 100,
          y: 100,
          isCollapsed: true,
        });
      }
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

      const characterWindows = await db.characterWindows.where({ windowId: id }).toArray();
      await db.characterWindows.bulkDelete(characterWindows.map((c) => c.id));

      await db.windows.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useWindows/deleteWindow',
        severity: 'medium',
      });
    }
  };

  return {
    windows: windows ?? [],
    isLoading,
    createWindow,
    updateWindow,
    deleteWindow,
  };
};
