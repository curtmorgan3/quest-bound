import type { CustomProperty, InventoryItem, Item } from '@/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Callback to persist a custom property change for an inventory item instance.
 * Receives customPropertyId and value. When provided, the proxy returns accessors with .set(value) for qbscript.
 */
export type SetItemCustomPropertyFn = (
  customPropertyId: string,
  value: string | number | boolean,
) => void;

/** Lookup to resolve label -> customPropertyId and customPropertyId -> label for script runtime. */
export type CustomPropertyLookup = {
  resolveLabelToId: (label: string) => string | undefined;
  resolveIdToLabel: (id: string) => string | undefined;
};

function createCustomPropertyLookup(customProperties: CustomProperty[]): CustomPropertyLookup {
  const labelToId = new Map<string, string>();
  const idToLabel = new Map<string, string>();
  for (const cp of customProperties) {
    labelToId.set(cp.label, cp.id);
    idToLabel.set(cp.id, cp.label);
  }
  return {
    resolveLabelToId: (label) => labelToId.get(label),
    resolveIdToLabel: (id) => idToLabel.get(id),
  };
}

/**
 * Wrapper for a custom property so that Owner.Item('x').prop_name.set(value) works in qbscript.
 * Exposes .set(value) and coerces to the underlying value in expressions (valueOf/toString).
 * Implements toStructuredCloneSafe() so when the accessor is in a postMessage payload (e.g. script
 * returns or logs item.prop_name), it is serialized as the primitive value instead of failing clone.
 */
function createCustomPropertyAccessor(
  getValue: () => string | number | boolean | undefined,
  setValue: SetItemCustomPropertyFn | undefined,
  label: string,
  lookup: CustomPropertyLookup,
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
      const customPropertyId = lookup.resolveLabelToId(label);
      if (customPropertyId) setValue(customPropertyId, value);
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
  private readonly customPropertyLookup: CustomPropertyLookup;

  constructor(
    inventoryItem: InventoryItem,
    item: Item,
    customPropertyLookup: CustomPropertyLookup,
  ) {
    this.inventoryItem = inventoryItem;
    this.item = item;
    this.customPropertyLookup = customPropertyLookup;
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
    const customPropertyId = this.customPropertyLookup.resolveLabelToId(name);
    if (!customPropertyId) return undefined;
    return this.inventoryItem.customProperties?.[customPropertyId];
  }

  /**
   * Return a plain object for postMessage (structured clone).
   * Called at the worker boundary so the main thread receives cloneable data.
   * Resolves customProperties (keyed by customPropertyId) to label-keyed for readability.
   */
  toStructuredCloneSafe(): ItemInstancePlain {
    const base: ItemInstancePlain = {
      title: this.item.title,
      description: this.item.description,
      quantity: this.inventoryItem.quantity,
      isEquipped: this.inventoryItem.isEquipped ?? false,
    };
    const instanceCustom = this.inventoryItem.customProperties ?? {};
    const byLabel: Record<string, string | number | boolean> = {};
    for (const [id, value] of Object.entries(instanceCustom)) {
      const label = this.customPropertyLookup.resolveIdToLabel(id);
      if (label) byLabel[label] = value;
    }
    return { ...base, ...byLabel };
  }
}

/**
 * Returns an ItemInstanceProxy wrapped in a Proxy so that property access for
 * unknown keys (e.g. armor_value) returns an accessor with .set(value) for qbscript.
 * Reading uses instance customProperties (keyed by customPropertyId) via label lookup.
 * The result is serialized only when sent across the worker boundary via prepareForStructuredClone().
 */
export function createItemInstanceProxy(
  inventoryItem: InventoryItem,
  item: Item,
  customProperties: CustomProperty[],
  onSetCustomProperty?: SetItemCustomPropertyFn,
): ItemInstanceProxy &
  Record<string, string | number | boolean | { set: (v: string | number | boolean) => void }> {
  const lookup = createCustomPropertyLookup(customProperties);
  const proxy = new ItemInstanceProxy(inventoryItem, item, lookup);
  return new Proxy(proxy, {
    get(target, prop: string) {
      // Must return the real method so prepareForStructuredClone() can serialize this proxy
      // for postMessage (custom prop accessors contain non-cloneable functions).
      if (prop === 'toStructuredCloneSafe') {
        return (target as unknown as Record<string, unknown>).toStructuredCloneSafe;
      }
      // Owner.Item('item').property('custom prop') – access custom prop by label (e.g. names with spaces).
      if (prop === 'property') {
        return (name: string) =>
          createCustomPropertyAccessor(
            () => target.getCustomProperty(name),
            onSetCustomProperty,
            name,
            lookup,
          );
      }
      if (prop in target) {
        return (target as unknown as Record<string, unknown>)[prop];
      }
      return createCustomPropertyAccessor(
        () => target.getCustomProperty(prop),
        onSetCustomProperty,
        prop,
        lookup,
      );
    },
  }) as ItemInstanceProxy &
    Record<string, string | number | boolean | { set: (v: string | number | boolean) => void }>;
}
