import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Inventory, InventoryItem } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useInventory = (inventoryId: string) => {
  const { handleError } = useErrorHandler();

  const inventory = useLiveQuery(() => db.inventories.get(inventoryId), [inventoryId]);

  const inventoryItems = useLiveQuery(
    () =>
      db.inventoryItems
        .where('inventoryId')
        .equals(inventory?.id ?? '')
        .toArray(),
    [inventory],
  );

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
    inventoryItems: inventoryItems ?? [],
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    updateInventory,
  };
};
