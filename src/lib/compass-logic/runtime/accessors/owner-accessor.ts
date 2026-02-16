import type { Action, Attribute, CharacterAttribute, InventoryItem, Item } from '@/types';
import type Dexie from 'dexie';
import type { ExecuteActionEventFn } from '../proxies';
import {
  ActionProxy,
  AttributeProxy,
  createItemInstanceProxy,
  type ItemInstancePlain,
} from '../proxies';

/**
 * Accessor object representing the character executing the script (Owner).
 * Provides access to the character's attributes, items, and other properties.
 */
export class OwnerAccessor {
  protected characterId: string;
  protected characterName: string;
  protected inventoryId: string;
  protected db: Dexie;
  protected pendingUpdates: Map<string, any>;

  // Cached data
  protected characterAttributesCache: Map<string, CharacterAttribute>;
  protected attributesCache: Map<string, Attribute>;
  protected actionsCache: Map<string, Action>;
  protected itemsCache: Map<string, Item>;
  protected inventoryItems: InventoryItem[];
  protected targetId: string | null;
  protected executeActionEvent: ExecuteActionEventFn | undefined;

  constructor(
    characterId: string,
    characterName: string,
    inventoryId: string,
    db: Dexie,
    pendingUpdates: Map<string, any>,
    characterAttributesCache: Map<string, CharacterAttribute>,
    attributesCache: Map<string, Attribute>,
    actionsCache: Map<string, Action>,
    itemsCache: Map<string, Item>,
    inventoryItems: InventoryItem[],
    targetId: string | null = null,
    executeActionEvent?: ExecuteActionEventFn,
  ) {
    this.characterId = characterId;
    this.characterName = characterName;
    this.inventoryId = inventoryId;
    this.db = db;
    this.pendingUpdates = pendingUpdates;
    this.characterAttributesCache = characterAttributesCache;
    this.attributesCache = attributesCache;
    this.actionsCache = actionsCache;
    this.itemsCache = itemsCache;
    this.inventoryItems = inventoryItems;
    this.targetId = targetId;
    this.executeActionEvent = executeActionEvent;
  }

  /**
   * Get an action reference by title. Returns a proxy with async activate() and deactivate()
   * that run the action's event handlers using the current execution's Owner and Target.
   * @param name - The title/name of the ruleset action
   * @returns ActionProxy for the action
   * @throws Error if action not found
   */
  Action(name: string): ActionProxy {
    const action = Array.from(this.actionsCache.values()).find((a) => a.title === name);
    if (!action) {
      throw new Error(`Action '${name}' not found`);
    }
    return new ActionProxy(
      action.id,
      this.characterId,
      this.targetId,
      this.executeActionEvent,
    );
  }

  /**
   * Get an attribute proxy for the specified attribute.
   * @param name - The title/name of the attribute
   * @returns AttributeProxy for the attribute
   * @throws Error if attribute not found
   */
  Attribute(name: string): AttributeProxy {
    // Find the attribute definition by title
    const attribute = Array.from(this.attributesCache.values()).find((attr) => attr.title === name);

    if (!attribute) {
      throw new Error(`Attribute '${name}' not found`);
    }

    // Find the character's instance of this attribute
    const characterAttribute = Array.from(this.characterAttributesCache.values()).find(
      (charAttr) =>
        charAttr.attributeId === attribute.id && charAttr.characterId === this.characterId,
    );

    if (!characterAttribute) {
      throw new Error(`Character attribute '${name}' not found for this character`);
    }

    return new AttributeProxy(characterAttribute, attribute, this.pendingUpdates);
  }

  /**
   * Get the first inventory item matching the given item name (by ruleset item title).
   * Only matches entries of type 'item' (ruleset items), not actions or attributes.
   * Returns a proxy (like AttributeProxy); serialized at the worker boundary when sent via postMessage.
   * @param name - The title/name of the ruleset item
   * @returns ItemInstanceProxy for the first matching inventory entry, or undefined if none
   */
  Item(name: string): ReturnType<typeof createItemInstanceProxy> | undefined {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) return undefined;

    const inventoryItem = this.inventoryItems.find(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    if (!inventoryItem) return undefined;

    return createItemInstanceProxy(inventoryItem, item);
  }

  /**
   * Get all inventory items matching the given item name (by ruleset item title).
   * Only matches entries of type 'item'. Returns a plain array (cloneable).
   * Use .length, [index], and in the evaluator .count(), .first(), .last() on the result.
   * @param name - The title/name of the ruleset item
   * @returns Array of plain item objects
   */
  Items(name: string): ItemInstancePlain[] {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) return [];

    const matching = this.inventoryItems.filter(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    return matching.map((inv) => createItemInstanceProxy(inv, item));
  }

  /**
   * Get the character's name.
   */
  get name(): string {
    return this.characterName;
  }

  /**
   * Get the character's name/title (alias for name).
   */
  get title(): string {
    return this.characterName;
  }

  /**
   * Check whether the character has at least one of the given item (by ruleset item title).
   */
  hasItem(name: string): boolean {
    return this.Items(name).length > 0;
  }

  /**
   * Add items to the character's inventory.
   * @param name - The title/name of the ruleset item
   * @param quantity - Number to add (default 1)
   */
  addItem(name: string, quantity: number = 1): void {
    if (quantity < 1) return;
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) {
      throw new Error(`Item '${name}' not found`);
    }
    if (!this.inventoryId) {
      throw new Error('Character has no inventory');
    }
    const now = new Date().toISOString();
    const newEntry: InventoryItem = {
      id: crypto.randomUUID(),
      type: 'item',
      entityId: item.id,
      inventoryId: this.inventoryId,
      componentId: '',
      quantity,
      x: 0,
      y: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.inventoryItems.push(newEntry);
    const key = 'inventoryAdd';
    const existing = this.pendingUpdates.get(key) as InventoryItem[] | undefined;
    this.pendingUpdates.set(key, existing ? [...existing, newEntry] : [newEntry]);
  }

  /**
   * Set the total quantity of the given item (by ruleset item title).
   * Consolidates to a single stack. If quantity is 0, removes all.
   * @param name - The title/name of the ruleset item
   * @param quantity - Target total quantity (default 0)
   */
  setItem(name: string, quantity: number = 0): void {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) {
      throw new Error(`Item '${name}' not found`);
    }
    const matching = this.inventoryItems.filter(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    const currentTotal = matching.reduce((sum, inv) => sum + inv.quantity, 0);
    if (currentTotal === quantity) return;

    if (quantity === 0) {
      this.removeItem(name, currentTotal);
      return;
    }

    if (quantity > currentTotal) {
      this.addItem(name, quantity - currentTotal);
      return;
    }

    // quantity < currentTotal: remove all matching, then add one stack of target quantity
    const idsToDelete = new Set(matching.map((inv) => inv.id));
    for (const id of idsToDelete) {
      this.pendingUpdates.set(`inventoryDelete:${id}`, true);
    }
    this.inventoryItems = this.inventoryItems.filter((inv) => !idsToDelete.has(inv.id));
    this.addItem(name, quantity);
  }

  /**
   * Remove items from the character's inventory.
   * @param name - The title/name of the ruleset item
   * @param quantity - Number to remove (default 1). Removes from first matching stacks.
   */
  removeItem(name: string, quantity: number = 1): void {
    if (quantity < 1) return;
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) {
      throw new Error(`Item '${name}' not found`);
    }
    const matching = this.inventoryItems.filter(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    let toRemove = quantity;
    const idsToDelete = new Set<string>();
    for (const inv of matching) {
      if (toRemove <= 0) break;
      if (inv.quantity <= toRemove) {
        toRemove -= inv.quantity;
        idsToDelete.add(inv.id);
        this.pendingUpdates.set(`inventoryDelete:${inv.id}`, true);
      } else {
        inv.quantity -= toRemove;
        inv.updatedAt = new Date().toISOString();
        this.pendingUpdates.set(`inventoryUpdate:${inv.id}`, { quantity: inv.quantity });
        toRemove = 0;
      }
    }
    this.inventoryItems = this.inventoryItems.filter((inv) => !idsToDelete.has(inv.id));
  }
}
