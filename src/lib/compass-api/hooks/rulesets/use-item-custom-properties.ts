import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CustomProperty, ItemCustomProperty } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useItemCustomProperties = (itemId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const itemCustomProperties: ItemCustomProperty[] =
    useLiveQuery(
      () =>
        itemId
          ? db.itemCustomProperties.where('itemId').equals(itemId).toArray()
          : Promise.resolve([] as ItemCustomProperty[]),
      [itemId],
    ) ?? [];

  const customProperties: CustomProperty[] = useLiveQuery(
    async () => {
      if (!itemId || itemCustomProperties.length === 0) return [];
      const cps = await Promise.all(
        itemCustomProperties.map((icp) =>
          db.customProperties.get(icp.customPropertyId),
        ),
      );
      return cps.filter((cp): cp is CustomProperty => cp != null);
    },
    [itemId, itemCustomProperties],
  ) ?? [];

  const addItemCustomProperty = async (customPropertyId: string) => {
    if (!itemId) return;
    const now = new Date().toISOString();
    try {
      const existing = await db.itemCustomProperties
        .where('[itemId+customPropertyId]')
        .equals([itemId, customPropertyId])
        .first();
      if (existing) return;

      await db.itemCustomProperties.add({
        id: crypto.randomUUID(),
        itemId,
        customPropertyId,
        createdAt: now,
        updatedAt: now,
      } as ItemCustomProperty);
    } catch (e) {
      handleError(e as Error, {
        component: 'useItemCustomProperties/addItemCustomProperty',
        severity: 'medium',
      });
    }
  };

  const removeItemCustomProperty = async (id: string) => {
    try {
      await db.itemCustomProperties.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useItemCustomProperties/removeItemCustomProperty',
        severity: 'medium',
      });
    }
  };

  return {
    itemCustomProperties,
    customProperties,
    addItemCustomProperty,
    removeItemCustomProperty,
  };
};
