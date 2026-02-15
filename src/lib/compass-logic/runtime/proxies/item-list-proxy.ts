import type { ItemInstanceProxy } from './item-instance-proxy';

/**
 * Array-like proxy for a list of character inventory item instances.
 * Exposes count(), first(), last(), length, and index access (items[0]) for QBScript.
 */
export class ItemListProxy {
  private items: (ItemInstanceProxy & Record<string, string | number | boolean | undefined>)[];

  constructor(
    items: (ItemInstanceProxy & Record<string, string | number | boolean | undefined>)[],
  ) {
    this.items = items;
    // Expose numeric indices for items[0], items[1], etc.
    for (let i = 0; i < items.length; i++) {
      (this as Record<string, unknown>)[i] = items[i];
    }
  }

  get length(): number {
    return this.items.length;
  }

  count(): number {
    return this.items.length;
  }

  first(): (ItemInstanceProxy & Record<string, string | number | boolean | undefined>) | undefined {
    return this.items[0];
  }

  last(): (ItemInstanceProxy & Record<string, string | number | boolean | undefined>) | undefined {
    return this.items[this.items.length - 1];
  }

  [Symbol.iterator](): Iterator<ItemInstanceProxy & Record<string, string | number | boolean | undefined>> {
    return this.items[Symbol.iterator]();
  }
}
