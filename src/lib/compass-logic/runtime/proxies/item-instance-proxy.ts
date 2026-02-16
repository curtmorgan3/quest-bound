import type { InventoryItem, Item } from '@/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Callback to persist a custom property change for an inventory item instance.
 * When provided, the proxy returns accessors with .set(value) for custom properties.
 */
export type SetItemCustomPropertyFn = (propName: string, value: string | number | boolean) => void;

/**
 * Wrapper for a custom property so that Owner.Item('x').prop_name.set(value) works in qbscript.
 * Exposes .set(value) and coerces to the underlying value in expressions (valueOf/toString).
 * Implements toStructuredCloneSafe() so when the accessor is in a postMessage payload (e.g. script
 * returns or logs item.prop_name), it is serialized as the primitive value instead of failing clone.
 */
function createCustomPropertyAccessor(
  getValue: () => string | number | boolean | undefined,
  setValue: SetItemCustomPropertyFn | undefined,
  propName: string,
): {
  set: (value: string | number | boolean) => void;
  valueOf: () => string | number | boolean | undefined;
  toString: () => string;
  toStructuredCloneSafe: () => string | number | boolean | undefined;
} {
  return {
    set(value: string | number | boolean) {
      if (!setValue) {
        throw new Error(
          'Cannot set item custom property in this context (e.g. from Items() array); use Owner.Item() for a single item to set properties',
        );
      }
      setValue(propName, value);
    },
    valueOf() {
      return getValue();
    },
    toString() {
      return String(getValue());
    },
    toStructuredCloneSafe() {
      return getValue();
    },
  };
}

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
 * Instance overrides in inventoryItem.customProperties take precedence over item definition defaults.
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
    const instanceVal = this.inventoryItem.customProperties?.[name];
    if (instanceVal !== undefined) return instanceVal;
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
    const definitionCustom = this.item.customProperties ?? {};
    const instanceCustom = this.inventoryItem.customProperties ?? {};
    return { ...base, ...definitionCustom, ...instanceCustom };
  }
}

/**
 * Returns an ItemInstanceProxy wrapped in a Proxy so that property access for
 * unknown keys (e.g. armor_value) returns an accessor with .set(value) for qbscript.
 * Reading uses instance customProperties then item definition defaults.
 * The result is serialized only when sent across the worker boundary via prepareForStructuredClone().
 */
export function createItemInstanceProxy(
  inventoryItem: InventoryItem,
  item: Item,
  onSetCustomProperty?: SetItemCustomPropertyFn,
): ItemInstanceProxy &
  Record<string, string | number | boolean | { set: (v: string | number | boolean) => void }> {
  const proxy = new ItemInstanceProxy(inventoryItem, item);
  return new Proxy(proxy, {
    get(target, prop: string) {
      // Must return the real method so prepareForStructuredClone() can serialize this proxy
      // for postMessage (custom prop accessors contain non-cloneable functions).
      if (prop === 'toStructuredCloneSafe') {
        return (target as unknown as Record<string, unknown>).toStructuredCloneSafe;
      }
      if (prop in target) {
        return (target as unknown as Record<string, unknown>)[prop];
      }
      return createCustomPropertyAccessor(
        () => target.getCustomProperty(prop),
        onSetCustomProperty,
        prop,
      );
    },
  }) as ItemInstanceProxy &
    Record<string, string | number | boolean | { set: (v: string | number | boolean) => void }>;
}
