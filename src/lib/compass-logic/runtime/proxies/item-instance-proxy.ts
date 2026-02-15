import type { InventoryItem, Item } from '@/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Plain object shape for serialization across the worker boundary.
 * Used by toStructuredCloneSafe() so script results can be postMessage'd.
 */
export type ItemInstancePlain = {
  title: string;
  description: string;
  quantity: number;
  isEquipped: boolean;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Proxy for a single character inventory item instance (like AttributeProxy).
 * Wraps an InventoryItem and its ruleset Item definition. Exposes title, quantity,
 * isEquipped, and custom properties from the item definition (e.g. armor.armor_value).
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread.
 */
export class ItemInstanceProxy implements StructuredCloneSafe {
  readonly inventoryItem: InventoryItem;
  readonly item: Item;

  constructor(inventoryItem: InventoryItem, item: Item) {
    this.inventoryItem = inventoryItem;
    this.item = item;
  }

  get title(): string {
    return this.item.title;
  }

  get description(): string {
    return this.item.description;
  }

  get quantity(): number {
    return this.inventoryItem.quantity;
  }

  count(): number {
    return this.quantity;
  }

  get isEquipped(): boolean {
    return this.inventoryItem.isEquipped ?? false;
  }

  getCustomProperty(name: string): string | number | boolean | undefined {
    return this.item.customProperties?.[name];
  }

  /**
   * Return a plain object for postMessage (structured clone).
   * Called at the worker boundary so the main thread receives cloneable data.
   */
  toStructuredCloneSafe(): ItemInstancePlain {
    const base: ItemInstancePlain = {
      title: this.item.title,
      description: this.item.description,
      quantity: this.inventoryItem.quantity,
      isEquipped: this.inventoryItem.isEquipped ?? false,
    };
    const custom = this.item.customProperties ?? {};
    return { ...base, ...custom };
  }
}

/**
 * Returns an ItemInstanceProxy wrapped in a Proxy so that property access for
 * unknown keys (e.g. armor_value) is forwarded to the item's customProperties.
 * The result is a real proxy like AttributeProxy; it is serialized only when
 * sent across the worker boundary via prepareForStructuredClone().
 */
export function createItemInstanceProxy(
  inventoryItem: InventoryItem,
  item: Item,
): ItemInstanceProxy & Record<string, string | number | boolean | undefined> {
  const proxy = new ItemInstanceProxy(inventoryItem, item);
  return new Proxy(proxy, {
    get(target, prop: string) {
      if (prop in target) {
        return (target as unknown as Record<string, unknown>)[prop];
      }
      return target.getCustomProperty(prop);
    },
  }) as ItemInstanceProxy & Record<string, string | number | boolean | undefined>;
}
