import type { CustomProperty, InventoryItem, Item } from '@/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Callback to persist a custom property change for an inventory item instance.
 * Receives customPropertyId and value. When provided, setProperty() on the item instance will persist changes.
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
 * isEquipped, and getProperty/setProperty for custom properties (aligned with CharacterAccessor).
 * Instance overrides in inventoryItem.customProperties take precedence over item definition defaults.
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread.
 */
export class ItemInstanceProxy implements StructuredCloneSafe {
  readonly inventoryItem: InventoryItem;
  readonly item: Item;
  private readonly customPropertyLookup: CustomPropertyLookup;
  private readonly onSetCustomProperty?: SetItemCustomPropertyFn;

  constructor(
    inventoryItem: InventoryItem,
    item: Item,
    customPropertyLookup: CustomPropertyLookup,
    onSetCustomProperty?: SetItemCustomPropertyFn,
  ) {
    this.inventoryItem = inventoryItem;
    this.item = item;
    this.customPropertyLookup = customPropertyLookup;
    this.onSetCustomProperty = onSetCustomProperty;
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

  /**
   * Get an item instance custom property by label (e.g. item.getProperty('Armor Value')).
   * Returns null if the property is not defined on the item or has no value.
   */
  getProperty(name: string): string | number | boolean | null {
    const customPropertyId = this.customPropertyLookup.resolveLabelToId(name);
    if (!customPropertyId) return null;
    const value = this.inventoryItem.customProperties?.[customPropertyId];
    return (value ?? null) as string | number | boolean | null;
  }

  /**
   * Set an item instance custom property by label (e.g. item.setProperty('Armor Value', 15)).
   * Throws if no setter was provided (e.g. read-only context).
   */
  setProperty(name: string, value: string | number | boolean): void {
    if (!this.onSetCustomProperty) {
      throw new Error(
        'Cannot set item custom property in this context (e.g. from Items() array); use Owner.Item() for a single item to set properties',
      );
    }
    const customPropertyId = this.customPropertyLookup.resolveLabelToId(name);
    if (customPropertyId) this.onSetCustomProperty(customPropertyId, value);
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
 * Creates an ItemInstanceProxy for a single character inventory item instance.
 * Use getProperty(name) and setProperty(name, value) for custom properties (aligned with CharacterAccessor).
 * The result is serialized when sent across the worker boundary via prepareForStructuredClone().
 */
export function createItemInstanceProxy(
  inventoryItem: InventoryItem,
  item: Item,
  customProperties: CustomProperty[],
  onSetCustomProperty?: SetItemCustomPropertyFn,
): ItemInstanceProxy {
  const lookup = createCustomPropertyLookup(customProperties);
  return new ItemInstanceProxy(inventoryItem, item, lookup, onSetCustomProperty);
}
