import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Component } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

type ComponentUpdate = { id: string } & Partial<Component>;

export const useComponents = (compositeId?: string) => {
  const { handleError } = useErrorHandler();

  const components = useLiveQuery(
    () =>
      db.components
        .where('compositeId')
        .equals(compositeId ?? '')
        .toArray(),
    [compositeId],
  );

  const createComponent = async (data: Partial<Component>) => {
    if (!compositeId) return;
    const now = new Date().toISOString();
    try {
      await db.components.add({
        ...data,
        id: data.id ?? crypto.randomUUID(),
        compositeId: compositeId,
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
    await Promise.all(updates.map((u) => updateComponent(u.id, u)));
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
    updateComponent,
    updateComponents,
    deleteComponent,
  };
};
