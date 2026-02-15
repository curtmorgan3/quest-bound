import type { InventoryItem, Item } from '@/types';

/**
 * Plain object shape for a character inventory item instance.
 * Used so script results can be passed across the worker boundary (postMessage
 * structured clone). Exposes title, quantity, isEquipped, and custom properties
 * from the item definition (e.g. armor.armor_value in scripts).
 */
export type ItemInstancePlain = {
  title: string;
  description: string;
  quantity: number;
  isEquipped: boolean;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Returns a plain object for a single inventory item instance.
 * Plain objects are structured-cloneable, so they can be sent via postMessage
 * from the script worker to the main thread (e.g. in SCRIPT_RESULT or CONSOLE_LOG).
 */
export function createItemInstanceProxy(
  inventoryItem: InventoryItem,
  item: Item,
): ItemInstancePlain {
  const base: ItemInstancePlain = {
    title: item.title,
    description: item.description,
    quantity: inventoryItem.quantity,
    isEquipped: inventoryItem.isEquipped ?? false,
  };
  const custom = item.customProperties ?? {};
  return { ...base, ...custom };
}
