import { useErrorHandler } from '@/hooks';
import { repairCompositesAfterComponentDeletes } from '@/utils/composite-db';
import { db } from '../../db';
import { useApiLoadingStore } from '@/stores/api-loading-store';
import type { Component, Window } from '@/types';
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
      const componentIds = components.map((c) => c.id);
      await db.components.bulkDelete(componentIds);
      void repairCompositesAfterComponentDeletes(componentIds);

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

  const duplicateWindow = async (id: string) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const source = await db.windows.get(id);
      if (!source) return;
      const sourceComponents = await db.components.where({ windowId: id }).toArray();

      const newWindowId = crypto.randomUUID();
      const componentIdMap = new Map<string, string>();
      for (const c of sourceComponents) {
        componentIdMap.set(c.id, crypto.randomUUID());
      }

      await db.windows.add({
        id: newWindowId,
        rulesetId: activeRuleset.id,
        title: `${source.title} (copy)`,
        category: source.category,
        hideFromPlayerView: source.hideFromPlayerView,
        createdAt: now,
        updatedAt: now,
      });

      const newComponents: Component[] = sourceComponents.map((c) => {
        const newId = componentIdMap.get(c.id)!;
        const newGroupId =
          c.groupId && componentIdMap.has(c.groupId) ? componentIdMap.get(c.groupId)! : c.groupId;
        const newParentId =
          c.parentComponentId && componentIdMap.has(c.parentComponentId)
            ? componentIdMap.get(c.parentComponentId)!
            : c.parentComponentId;
        const newChildWindowId =
          c.childWindowId === id ? newWindowId : (c.childWindowId ?? undefined);
        return {
          ...c,
          id: newId,
          windowId: newWindowId,
          groupId: newGroupId ?? null,
          parentComponentId: newParentId ?? null,
          childWindowId: newChildWindowId,
          createdAt: now,
          updatedAt: now,
        };
      });
      await db.components.bulkAdd(newComponents);

      if (testCharacter) {
        await db.characterWindows.add({
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          characterId: testCharacter.id,
          windowId: newWindowId,
          title: `${source.title} (copy)`,
          x: 100,
          y: 100,
          isCollapsed: true,
        });
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useWindows/duplicateWindow',
        severity: 'medium',
      });
    }
  };

  const getWindow = (id?: string) => {
    if (!id) return null;
    return windows?.find((w) => w.id === id);
  };

  return {
    windows: windows ?? [],
    isLoading,
    getWindow,
    createWindow,
    updateWindow,
    deleteWindow,
    duplicateWindow,
  };
};
