import type { Attribute, CharacterAttribute, InventoryItem, Item } from '@/types';
import type Dexie from 'dexie';
import { AttributeProxy, createItemInstanceProxy, type ItemInstancePlain } from '../proxies';

/**
 * Accessor object representing the character executing the script (Owner).
 * Provides access to the character's attributes, items, and other properties.
 */
export class OwnerAccessor {
  protected characterId: string;
  protected db: Dexie;
  protected pendingUpdates: Map<string, any>;

  // Cached data
  protected characterAttributesCache: Map<string, CharacterAttribute>;
  protected attributesCache: Map<string, Attribute>;
  protected itemsCache: Map<string, Item>;
  protected inventoryItems: InventoryItem[];

  constructor(
    characterId: string,
    db: Dexie,
    pendingUpdates: Map<string, any>,
    characterAttributesCache: Map<string, CharacterAttribute>,
    attributesCache: Map<string, Attribute>,
    itemsCache: Map<string, Item>,
    inventoryItems: InventoryItem[],
  ) {
    this.characterId = characterId;
    this.db = db;
    this.pendingUpdates = pendingUpdates;
    this.characterAttributesCache = characterAttributesCache;
    this.attributesCache = attributesCache;
    this.itemsCache = itemsCache;
    this.inventoryItems = inventoryItems;
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
   * Returns a plain object so it can be passed across the worker boundary (postMessage).
   * @param name - The title/name of the ruleset item
   * @returns Plain item object for the first matching inventory entry, or undefined if none
   */
  Item(name: string): ItemInstancePlain | null {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) return null;

    const inventoryItem = this.inventoryItems.find(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    if (!inventoryItem) return null;

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
   * Get the character's name/title.
   */
  get title(): string {
    // This will be implemented when we add character data to the cache
    // For now, return a placeholder
    return 'Character';
  }
}
