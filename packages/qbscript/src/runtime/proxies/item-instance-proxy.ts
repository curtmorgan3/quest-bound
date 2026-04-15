import type { CustomProperty, InventoryItem, Item } from '@quest-bound/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';
import type { ExecuteActionEventResult, ExecuteItemEventFn } from './action-proxy';

/**
 * Callback to persist a custom property change for an inventory item instance.
 * Receives customPropertyId and value. When provided, setProperty() on the item instance will persist changes.
 */
export type SetItemCustomPropertyFn = (
  customPropertyId: string,
  value: string | number | boolean,
) => void;

/** Callback to remove this item instance from the character's inventory (e.g. when Self.destroy() is called in an item script). */
export type DestroyItemInstanceFn = () => void;

/** Callback to persist a label (display name) change for an inventory item instance. */
export type SetItemLabelFn = (label: string) => void;

/** Callback to persist a description change for an inventory item instance. */
export type SetItemDescriptionFn = (description: string) => void;

/** Callback to persist actionIds change for an inventory item instance. */
export type SetItemActionIdsFn = (actionIds: string[]) => void;

/** Callback to persist equipped flag after a successful on_equip / on_unequip run. */
export type SetItemEquippedFn = (isEquipped: boolean) => void;

/** Lookup to resolve action name -> action id for addAction/removeAction. */
export type GetActionIdByNameFn = (name: string) => string | undefined;

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
  originalTitle: string;
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
 * Keys are ruleset customPropertyIds for defined properties; unknown labels from scripts are stored under the label string.
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread.
 */
export class ItemInstanceProxy implements StructuredCloneSafe {
  readonly inventoryItem: InventoryItem;
  readonly item: Item;
  /** Character that owns this inventory row (Owner when using Owner.Item / Items). */
  readonly ownerCharacterId: string;
  private readonly customPropertyLookup: CustomPropertyLookup;
  private readonly customProperties: CustomProperty[];
  private readonly onSetCustomProperty?: SetItemCustomPropertyFn;
  private readonly onSetLabel?: SetItemLabelFn;
  private readonly onSetDescription?: SetItemDescriptionFn;
  private readonly onSetActionIds?: SetItemActionIdsFn;
  private readonly onSetEquipped?: SetItemEquippedFn;
  private readonly getActionIdByName?: GetActionIdByNameFn;
  private readonly onDestroy?: DestroyItemInstanceFn;
  private readonly executeItemEvent?: ExecuteItemEventFn;

  constructor(
    inventoryItem: InventoryItem,
    item: Item,
    ownerCharacterId: string,
    customPropertyLookup: CustomPropertyLookup,
    customProperties: CustomProperty[],
    onSetCustomProperty?: SetItemCustomPropertyFn,
    onDestroy?: DestroyItemInstanceFn,
    onSetLabel?: SetItemLabelFn,
    onSetDescription?: SetItemDescriptionFn,
    onSetActionIds?: SetItemActionIdsFn,
    getActionIdByName?: GetActionIdByNameFn,
    onSetEquipped?: SetItemEquippedFn,
    executeItemEvent?: ExecuteItemEventFn,
  ) {
    this.inventoryItem = inventoryItem;
    this.item = item;
    this.ownerCharacterId = ownerCharacterId;
    this.customPropertyLookup = customPropertyLookup;
    this.customProperties = customProperties;
    this.onSetCustomProperty = onSetCustomProperty;
    this.onDestroy = onDestroy;
    this.onSetLabel = onSetLabel;
    this.onSetDescription = onSetDescription;
    this.onSetActionIds = onSetActionIds;
    this.onSetEquipped = onSetEquipped;
    this.getActionIdByName = getActionIdByName;
    this.executeItemEvent = executeItemEvent;
  }

  /**
   * Remove this item instance from the character's inventory.
   * Only available when Self is an item instance (e.g. in item event scripts). Calls Owner.removeItem for this stack.
   */
  destroy(): void {
    this.onDestroy?.();
  }

  get title(): string {
    return this.inventoryItem.label ?? this.item.title;
  }

  /** Ruleset definition title; not affected by inventory `label` / `setTitle`. */
  get originalTitle(): string {
    return this.item.title;
  }

  setTitle(value: string) {
    this.inventoryItem.label = value;
    this.onSetLabel?.(value);
  }

  get description(): string {
    return this.inventoryItem.description ?? this.item.description;
  }

  setDescription(value: string): void {
    this.inventoryItem.description = value;
    this.onSetDescription?.(value);
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

  private emptyItemEventResult(): ExecuteActionEventResult {
    return { success: true, value: null, announceMessages: [], logMessages: [] };
  }

  /**
   * Mark equipped, run the item's on_equip handler (if any), then persist isEquipped.
   * Matches inventory UI order: event first, then stored flag.
   */
  async equip(): Promise<ExecuteActionEventResult> {
    if (!this.executeItemEvent) {
      throw new Error('Item equip is not available in this context');
    }
    if (!this.item.isEquippable) {
      throw new Error(`Item '${this.title}' is not equippable`);
    }
    if (this.inventoryItem.isEquipped) {
      return this.emptyItemEventResult();
    }
    const result = await this.executeItemEvent(
      this.item.id,
      this.ownerCharacterId,
      'on_equip',
      this.inventoryItem.id,
    );
    if (!result.success) {
      throw result.error ?? new Error('on_equip failed');
    }
    this.onSetEquipped?.(true);
    return result;
  }

  /**
   * Run on_unequip (if any), then clear isEquipped. No-op when already unequipped.
   */
  async unequip(): Promise<ExecuteActionEventResult> {
    if (!this.executeItemEvent) {
      throw new Error('Item unequip is not available in this context');
    }
    if (!this.item.isEquippable) {
      throw new Error(`Item '${this.title}' is not equippable`);
    }
    if (!this.inventoryItem.isEquipped) {
      return this.emptyItemEventResult();
    }
    const result = await this.executeItemEvent(
      this.item.id,
      this.ownerCharacterId,
      'on_unequip',
      this.inventoryItem.id,
    );
    if (!result.success) {
      throw result.error ?? new Error('on_unequip failed');
    }
    this.onSetEquipped?.(false);
    return result;
  }

  /**
   * Run the item script's on_add handler (if any). Same pipeline as inventory `on_add` when a row is created.
   * Async — use await (e.g. await Owner.Item('Potion').added()).
   */
  async added(): Promise<ExecuteActionEventResult> {
    if (!this.executeItemEvent) {
      throw new Error('Item added event is not available in this context');
    }
    const result = await this.executeItemEvent(
      this.item.id,
      this.ownerCharacterId,
      'on_add',
      this.inventoryItem.id,
    );
    if (!result.success) {
      throw result.error ?? new Error('on_add failed');
    }
    return result;
  }

  /**
   * Run the item script's on_remove handler (if any). Same pipeline as inventory `on_remove` before a row is removed.
   */
  async removed(): Promise<ExecuteActionEventResult> {
    if (!this.executeItemEvent) {
      throw new Error('Item remove event is not available in this context');
    }
    const result = await this.executeItemEvent(
      this.item.id,
      this.ownerCharacterId,
      'on_remove',
      this.inventoryItem.id,
    );
    if (!result.success) {
      throw result.error ?? new Error('on_remove failed');
    }
    return result;
  }

  private getDefaultValueForCustomProperty(
    customProperty: CustomProperty,
  ): string | number | boolean {
    if (customProperty.defaultValue !== undefined) {
      return customProperty.defaultValue;
    }
    switch (customProperty.type) {
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'string':
      case 'color':
      default:
        return '';
    }
  }

  /**
   * Get an item instance custom property by label (e.g. item.getProperty('Armor Value')).
   * Returns null if the property is not defined on the item (and has no instance-only value) or has no value.
   */
  getProperty(name: string): string | number | boolean | null {
    const customPropertyId = this.customPropertyLookup.resolveLabelToId(name);
    if (!customPropertyId) {
      const adHoc = this.inventoryItem.customProperties?.[name];
      return adHoc !== undefined ? (adHoc as string | number | boolean) : null;
    }
    const current = this.inventoryItem.customProperties?.[customPropertyId];
    if (current !== undefined) {
      return current as string | number | boolean;
    }

    const definition = this.customProperties.find((cp) => cp.id === customPropertyId);
    if (!definition) return null;
    const defaultValue = this.getDefaultValueForCustomProperty(definition);

    if (this.onSetCustomProperty) {
      this.onSetCustomProperty(customPropertyId, defaultValue);
    } else {
      if (!this.inventoryItem.customProperties) {
        this.inventoryItem.customProperties = {};
      }
      this.inventoryItem.customProperties[customPropertyId] = defaultValue;
    }

    return defaultValue;
  }

  /**
   * Set an item instance custom property by label (e.g. item.setProperty('Armor Value', 15)).
   * Labels not defined on the ruleset item are still written to this instance's `customProperties` under the label string.
   * Throws if no setter was provided (e.g. read-only context).
   */
  setProperty(name: string, value: string | number | boolean): void {
    if (!this.onSetCustomProperty) {
      throw new Error(
        'Cannot set item custom property in this context (e.g. from Items() array); use Owner.Item() for a single item to set properties',
      );
    }
    const customPropertyId = this.customPropertyLookup.resolveLabelToId(name);
    const storageKey = customPropertyId ?? name;
    this.onSetCustomProperty(storageKey, value);
  }

  /**
   * Add an associated action to this item instance by name (e.g. item.addAction('Heal')).
   * The action appears as a button in the item context menu.
   */
  addAction(name: string): void {
    if (!this.getActionIdByName) {
      throw new Error('addAction is not available in this context');
    }
    const actionId = this.getActionIdByName(name.trim());
    if (!actionId) {
      console.warn(`[QBScript] Action '${name}' not found`);
      throw new Error(`Action '${name}' not found`);
    }
    const current = this.inventoryItem.actionIds ?? [];
    if (current.includes(actionId)) return;
    const next = [...current, actionId];
    this.inventoryItem.actionIds = next;
    this.onSetActionIds?.(next);
  }

  /**
   * Remove an associated action from this item instance by name (e.g. item.removeAction('Heal')).
   */
  removeAction(name: string): void {
    if (!this.getActionIdByName) {
      throw new Error('removeAction is not available in this context');
    }
    const actionId = this.getActionIdByName(name);
    if (!actionId) {
      throw new Error(`Action '${name}' not found`);
    }
    const current = this.inventoryItem.actionIds ?? [];
    const next = current.filter((id) => id !== actionId);
    if (next.length === current.length) return;
    this.inventoryItem.actionIds = next;
    this.onSetActionIds?.(next);
  }

  /**
   * Return a plain object for postMessage (structured clone).
   * Called at the worker boundary so the main thread receives cloneable data.
   * Resolves customProperties (keyed by customPropertyId) to label-keyed for readability.
   */
  toStructuredCloneSafe(): ItemInstancePlain {
    const base: ItemInstancePlain = {
      title: this.title,
      originalTitle: this.originalTitle,
      description: this.description,
      quantity: this.inventoryItem.quantity,
      isEquipped: this.inventoryItem.isEquipped ?? false,
    };
    const instanceCustom = this.inventoryItem.customProperties ?? {};
    const byLabel: Record<string, string | number | boolean> = {};
    for (const [id, value] of Object.entries(instanceCustom)) {
      const label = this.customPropertyLookup.resolveIdToLabel(id);
      byLabel[label ?? id] = value;
    }
    return { ...base, ...byLabel };
  }
}

/**
 * Creates an ItemInstanceProxy for a single character inventory item instance.
 * Use getProperty(name) and setProperty(name, value) for custom properties (aligned with CharacterAccessor).
 * When onDestroy is provided (e.g. from CharacterAccessor.Item()), Self.destroy() in item scripts will remove that item from the character.
 * The result is serialized when sent across the worker boundary via prepareForStructuredClone().
 */
export function createItemInstanceProxy(
  inventoryItem: InventoryItem,
  item: Item,
  ownerCharacterId: string,
  customProperties: CustomProperty[],
  onSetCustomProperty?: SetItemCustomPropertyFn,
  onDestroy?: DestroyItemInstanceFn,
  onSetLabel?: SetItemLabelFn,
  onSetDescription?: SetItemDescriptionFn,
  onSetActionIds?: SetItemActionIdsFn,
  getActionIdByName?: GetActionIdByNameFn,
  onSetEquipped?: SetItemEquippedFn,
  executeItemEvent?: ExecuteItemEventFn,
): ItemInstanceProxy {
  const lookup = createCustomPropertyLookup(customProperties);
  return new ItemInstanceProxy(
    inventoryItem,
    item,
    ownerCharacterId,
    lookup,
    customProperties,
    onSetCustomProperty,
    onDestroy,
    onSetLabel,
    onSetDescription,
    onSetActionIds,
    getActionIdByName,
    onSetEquipped,
    executeItemEvent,
  );
}
