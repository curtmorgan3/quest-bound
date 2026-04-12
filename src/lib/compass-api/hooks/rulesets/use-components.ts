import { useErrorHandler } from '@/hooks';
import { repairCompositesAfterComponentDeletes } from '@/lib/compass-api/utils/composite-db';
import {
  expandDeleteIds,
  sortComponentIdsForDeletion,
} from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import { db, useApiLoadingStore } from '@/stores';
import type { Component } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { useActiveRuleset } from './use-active-ruleset';

export type ComponentUpdate = { id: string } & Partial<Component>;

export const useComponents = (windowId?: string) => {
  const { handleError } = useErrorHandler();
  const { activeRuleset } = useActiveRuleset();

  const components = useLiveQuery(
    () =>
      db.components
        .where('windowId')
        .equals(windowId ?? '')
        .toArray(),
    [windowId],
  );

  const isLoading = components === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('components', isLoading);
  }, [isLoading]);

  /** Re-run orphan prune only when this window’s component ids / parent links change. */
  const windowComponentStructureKey = useMemo(() => {
    if (!windowId || components === undefined) return null;
    if (components.length === 0) return `${windowId}:empty`;
    return (
      windowId +
      ':' +
      components
        .map((c) => `${c.id}\0${c.parentComponentId ?? ''}`)
        .sort()
        .join('\n')
    );
  }, [windowId, components]);

  useEffect(() => {
    if (!windowId || isLoading || windowComponentStructureKey === null || components === undefined) {
      return;
    }
    const inWindow = components;
    let cancelled = false;

    void (async () => {
      const withParent = inWindow.filter((c) => c.parentComponentId);
      if (withParent.length === 0) return;

      const parentIds = [...new Set(withParent.map((c) => c.parentComponentId!))];
      let parents: (Component | undefined)[];
      try {
        parents = await db.components.bulkGet(parentIds);
      } catch (e) {
        handleError(e as Error, {
          component: 'useComponents/pruneCrossWindowParents',
          severity: 'medium',
        });
        return;
      }
      if (cancelled) return;

      const parentById = new Map(
        parents.filter((p): p is Component => p != null).map((p) => [p.id, p]),
      );
      const invalidRoots: string[] = [];
      for (const c of withParent) {
        const pid = c.parentComponentId!;
        const p = parentById.get(pid);
        if (!p || p.windowId !== windowId) invalidRoots.push(c.id);
      }
      if (invalidRoots.length === 0 || cancelled) return;

      const expanded = expandDeleteIds(inWindow, invalidRoots);
      const ordered = sortComponentIdsForDeletion(inWindow, expanded);
      try {
        await db.transaction('rw', db.components, async () => {
          for (const id of ordered) {
            await db.components.delete(id);
          }
        });
        await repairCompositesAfterComponentDeletes(ordered);
      } catch (e) {
        handleError(e as Error, {
          component: 'useComponents/pruneCrossWindowParents',
          severity: 'medium',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [windowId, isLoading, windowComponentStructureKey, handleError]);

  const createComponent = async (data: Partial<Component>) => {
    if (!windowId || !activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.components.add({
        ...data,
        id: data.id ?? crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        windowId,
        createdAt: now,
        updatedAt: now,
      } as Component);
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/createComponent',
        severity: 'medium',
      });
    }
  };

  const createComponents = async (data: Array<Partial<Component>>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.components.bulkAdd(
        data.map(
          (comp) =>
            ({
              ...comp,
              id: comp.id ?? crypto.randomUUID(),
              rulesetId: activeRuleset.id,
              createdAt: now,
              updatedAt: now,
            }) as Component,
        ),
      );
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/createComponent',
        severity: 'medium',
      });
    }
  };

  const updateComponent = async (id: string, data: Partial<Component>) => {
    const now = new Date().toISOString();
    try {
      await db.components.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/updateComponent',
        severity: 'medium',
      });
    }
  };

  const updateComponents = async (updates: Array<ComponentUpdate>) => {
    const now = new Date().toISOString();
    try {
      await db.components.bulkUpdate(
        updates.map((u) => {
          const { id, ...rest } = u;
          return {
            key: id,
            changes: { ...rest, updatedAt: now },
          };
        }),
      );
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/updateComponents',
        severity: 'medium',
      });
    }
  };

  const deleteComponent = async (id: string) => {
    try {
      await db.components.delete(id);
      void repairCompositesAfterComponentDeletes([id]);
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/deleteComponent',
        severity: 'medium',
      });
    }
  };

  /** Deletes in depth order inside one transaction, then composite repair once (avoids orphan flash at 0,0). */
  const deleteManyComponents = async (expandedIds: string[]) => {
    if (expandedIds.length === 0) return;
    const snapshot = components ?? [];
    const ordered = sortComponentIdsForDeletion(snapshot, expandedIds);
    try {
      await db.transaction('rw', db.components, async () => {
        for (const id of ordered) {
          await db.components.delete(id);
        }
      });
      await repairCompositesAfterComponentDeletes(ordered);
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/deleteManyComponents',
        severity: 'medium',
      });
    }
  };

  const replaceComponents = async (newComponents: Component[]) => {
    if (!windowId) return;
    const now = new Date().toISOString();
    try {
      const current = await db.components
        .where('windowId')
        .equals(windowId)
        .toArray();
      const currentIds = new Set(current.map((c) => c.id));
      const newIds = new Set(newComponents.map((c) => c.id));

      const toDelete = current.filter((c) => !newIds.has(c.id));
      const toUpdate = newComponents.filter((c) => currentIds.has(c.id));
      const toAdd = newComponents.filter((c) => !currentIds.has(c.id));

      if (toDelete.length > 0) {
        const deleteIds = sortComponentIdsForDeletion(
          current,
          toDelete.map((c) => c.id),
        );
        await db.transaction('rw', db.components, async () => {
          for (const id of deleteIds) {
            await db.components.delete(id);
          }
        });
        await repairCompositesAfterComponentDeletes(deleteIds);
      }

      if (toUpdate.length > 0) {
        await db.components.bulkUpdate(
          toUpdate.map((comp) => ({
            key: comp.id,
            changes: { ...comp, updatedAt: now },
          })),
        );
      }

      if (toAdd.length > 0) {
        await db.components.bulkAdd(
          toAdd.map(
            (comp) =>
              ({
                ...comp,
                rulesetId: comp.rulesetId ?? activeRuleset?.id,
                windowId: comp.windowId ?? windowId,
                createdAt: comp.createdAt ?? now,
                updatedAt: now,
              }) as Component,
          ),
        );
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/replaceComponents',
        severity: 'medium',
      });
    }
  };

  return {
    components: components ?? [],
    isLoading,
    createComponent,
    createComponents,
    updateComponent,
    updateComponents,
    deleteComponent,
    deleteManyComponents,
    replaceComponents,
  };
};
