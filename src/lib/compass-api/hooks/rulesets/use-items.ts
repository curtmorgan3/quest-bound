import { useErrorHandler } from '@/hooks';
import { db, useApiLoadingStore } from '@/stores';
import type { Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useAssets } from '../assets';
import { useActiveRuleset } from './use-active-ruleset';

export const useItems = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();
  const { deleteAsset } = useAssets();

  const items = useLiveQuery(
    () =>
      db.items
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const isLoading = items === undefined;

  useEffect(() => {
    useApiLoadingStore.getState().setLoading('items', isLoading);
  }, [isLoading]);

  const createItem = async (data: Partial<Item>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.items.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Item);
    } catch (e) {
      handleError(e as Error, {
        component: 'useItems/createItem',
        severity: 'medium',
      });
    }
  };

  const updateItem = async (id: string, data: Partial<Item>) => {
    const now = new Date().toISOString();

    try {
      if (data.assetId === null) {
        const original = await db.items.get(id);
        if (original?.assetId) {
          await deleteAsset(original.assetId);
        }

        if (!data.image) {
          data.image = null;
        }
      }

      await db.items.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useItems/updateItem',
        severity: 'medium',
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await db.items.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useItems/deleteItem',
        severity: 'medium',
      });
    }
  };

  return {
    items: items ?? [],
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
};
