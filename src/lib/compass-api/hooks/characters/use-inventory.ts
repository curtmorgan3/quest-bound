import { useErrorHandler } from '@/hooks';
import { db, type InventoryItemWithData } from '@/stores';
import type { Inventory, InventoryItem } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActions, useItems } from '../rulesets';

export const useInventory = (inventoryId: string) => {
  const { handleError } = useErrorHandler();
  const { actions } = useActions();
  const { items } = useItems();

  const inventory = useLiveQuery(() => db.inventories.get(inventoryId), [inventoryId]);

  const inventoryItems = useLiveQuery(
    () =>
      db.inventoryItems
        .where('inventoryId')
        .equals(inventory?.id ?? '')
        .toArray(),
    [inventory],
  );

  const inventoryItemsWithImages: InventoryItemWithData[] = (inventoryItems ?? []).map((entity) => {
    const itemRef = items.find((item) => item.id === entity.entityId);
    const actionRef = actions.find((action) => action.id === entity.entityId);

    return {
      ...entity,
      title: itemRef?.title ?? actionRef?.title ?? '',
      description: itemRef?.description ?? actionRef?.description ?? '',
      image: itemRef?.image ?? actionRef?.image,
      inventoryWidth: itemRef?.inventoryWidth ?? 2,
      inventoryHeight: itemRef?.inventoryHeight ?? 2,
      stackSize: itemRef?.stackSize ?? 1,
    };
  });

  const addInventoryItem = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'inventoryId'>,
  ) => {
    if (!inventory) return;
    const now = new Date().toISOString();
    try {
      await db.inventoryItems.add({
        ...data,
        id: crypto.randomUUID(),
        inventoryId: inventory.id,
        createdAt: now,
        updatedAt: now,
      } as InventoryItem);
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/addInventoryItem',
        severity: 'medium',
      });
    }
  };

  const updateInventoryItem = async (id: string, data: Partial<InventoryItem>) => {
    const now = new Date().toISOString();
    try {
      await db.inventoryItems.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/updateInventoryItem',
        severity: 'medium',
      });
    }
  };

  const removeInventoryItem = async (id: string) => {
    try {
      await db.inventoryItems.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/removeInventoryItem',
        severity: 'medium',
      });
    }
  };

  const updateInventory = async (data: Partial<Inventory>) => {
    if (!inventory) return;
    const now = new Date().toISOString();
    try {
      await db.inventories.update(inventory.id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/updateInventory',
        severity: 'medium',
      });
    }
  };

  return {
    inventory: inventory ?? null,
    inventoryItems: inventoryItemsWithImages ?? [],
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    updateInventory,
  };
};
