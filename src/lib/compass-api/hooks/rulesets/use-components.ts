import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Component } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

type ComponentUpdate = { id: string } & Partial<Component>;

export const useComponents = (windowId?: string) => {
  const { handleError } = useErrorHandler();

  const components = useLiveQuery(
    () =>
      db.components
        .where('windowId')
        .equals(windowId ?? '')
        .toArray(),
    [windowId],
  );

  const createComponent = async (data: Partial<Component>) => {
    if (!windowId) return;
    const now = new Date().toISOString();
    try {
      await db.components.add({
        ...data,
        id: data.id || crypto.randomUUID(),
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
    const now = new Date().toISOString();
    try {
      await db.components.bulkAdd(
        data.map(
          (comp) =>
            ({
              ...comp,
              id: comp.id || crypto.randomUUID(),
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
        updates.map((u) => ({
          key: u.id,
          changes: u,
          updatedAt: now,
        })),
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
    } catch (e) {
      handleError(e as Error, {
        component: 'useComponents/deleteComponent',
        severity: 'medium',
      });
    }
  };

  return {
    components: components ?? [],
    createComponent,
    createComponents,
    updateComponent,
    updateComponents,
    deleteComponent,
  };
};
