import type { DB } from './types';

export function registerInventoryDbHooks(db: DB) {
  // Delete associated inventory items when an inventory is deleted
  db.inventories.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const inventoryId = primKey as string;
        await db.inventoryItems.where('inventoryId').equals(inventoryId).delete();
      } catch (error) {
        console.error('Failed to delete inventory items for inventory:', error);
      }
    }, 0);
  });
}

