import type { InventoryItem, Item } from '@/types';

/**
 * Proxy for a single character inventory item instance.
 * Wraps an InventoryItem and its ruleset Item definition.
 * Exposes title, quantity, isEquipped, and custom properties from the item definition
 * (e.g. armor.armor_value in scripts).
 */
export class ItemInstanceProxy {
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

  get isEquipped(): boolean {
    return this.inventoryItem.isEquipped ?? false;
  }

  /**
   * Get a custom property from the item definition (for script access like armor.armor_value).
   */
  getCustomProperty(name: string): string | number | boolean | undefined {
    return this.item.customProperties?.[name];
  }
}

/**
 * Returns an ItemInstanceProxy wrapped in a Proxy so that property access for
 * unknown keys (e.g. armor_value) is forwarded to the item's customProperties.
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
