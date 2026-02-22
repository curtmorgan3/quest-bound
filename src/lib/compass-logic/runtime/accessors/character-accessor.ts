import type { Action, Attribute, CharacterAttribute, InventoryItem, Item } from '@/types';
import type Dexie from 'dexie';
import type { ExecuteActionEventFn } from '../proxies';
import { ActionProxy, AttributeProxy, createItemInstanceProxy, TileProxy } from '../proxies';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Base accessor for any character (Owner, Target, or a character in a location).
 * Provides access to the character's attributes, items, Tile, actions, etc.
 * OwnerAccessor and TargetAccessor extend this; Character instances from Tile.characters use this directly.
 */
export class CharacterAccessor implements StructuredCloneSafe {
  protected id: string;
  protected characterName: string;
  protected inventoryId: string;
  protected db: Dexie;
  protected pendingUpdates: Map<string, any>;

  protected characterAttributesCache: Map<string, CharacterAttribute>;
  protected attributesCache: Map<string, Attribute>;
  protected actionsCache: Map<string, Action>;
  protected itemsCache: Map<string, Item>;
  protected inventoryItems: InventoryItem[];
  protected archetypeNamesCache: Set<string>;
  protected targetId: string | null;
  protected executeActionEvent: ExecuteActionEventFn | undefined;
  protected locationName: string;
  protected currentTile: { x: number; y: number } | null;

  /** When set, this character's Tile getter returns this proxy (e.g. Owner.Tile with character/characters). Otherwise returns TileProxy(x, y) only. */
  protected tileWithContext: TileProxy | null = null;

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
    archetypeNamesCache: Set<string> = new Set(),
    targetId: string | null = null,
    executeActionEvent?: ExecuteActionEventFn,
    locationName: string = '',
    currentTile: { x: number; y: number } | null = null,
    tileWithContext: TileProxy | null = null,
  ) {
    this.id = characterId;
    this.characterName = characterName;
    this.inventoryId = inventoryId;
    this.db = db;
    this.pendingUpdates = pendingUpdates;
    this.characterAttributesCache = characterAttributesCache;
    this.attributesCache = attributesCache;
    this.actionsCache = actionsCache;
    this.itemsCache = itemsCache;
    this.inventoryItems = inventoryItems;
    this.archetypeNamesCache = archetypeNamesCache;
    this.targetId = targetId;
    this.executeActionEvent = executeActionEvent;
    this.locationName = locationName;
    this.currentTile = currentTile;
    this.tileWithContext = tileWithContext ?? null;
  }

  /**
   * The character's current tile. When tileWithContext is set (e.g. Owner in campaign with location), returns that Tile (with character/characters). Otherwise x, y only.
   */
  get Tile(): TileProxy {
    return this.tileWithContext ?? new TileProxy(this.currentTile?.x ?? 0, this.currentTile?.y ?? 0);
  }

  /** Set by ScriptRunner when building Owner.Tile with character/characters. */
  setTileWithContext(tile: TileProxy): void {
    this.tileWithContext = tile;
  }

  hasArchetype(name: string): boolean {
    return this.archetypeNamesCache.has(name);
  }

  get archetypes(): string[] {
    return Array.from(this.archetypeNamesCache);
  }

  addArchetype(archetypeName: string): void {
    this.archetypeNamesCache.add(archetypeName);
    const key = 'archetypeAdd';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; archetypeName: string }[]
      | undefined;
    const entry = { characterId: this.id, archetypeName };
    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  removeArchetype(archetypeName: string): void {
    this.archetypeNamesCache.delete(archetypeName);
    const key = 'archetypeRemove';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; archetypeName: string }[]
      | undefined;
    const entry = { characterId: this.id, archetypeName };
    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  Action(name: string): ActionProxy {
    const action = Array.from(this.actionsCache.values()).find((a) => a.title === name);
    if (!action) {
      throw new Error(`Action '${name}' not found`);
    }
    return new ActionProxy(action.id, this.id, this.targetId, this.executeActionEvent);
  }

  Attribute(name: string): AttributeProxy {
    const attribute = Array.from(this.attributesCache.values()).find((attr) => attr.title === name);
    if (!attribute) {
      throw new Error(`Attribute '${name}' not found`);
    }
    const characterAttribute = Array.from(this.characterAttributesCache.values()).find(
      (charAttr) =>
        charAttr.attributeId === attribute.id && charAttr.characterId === this.id,
    );
    if (!characterAttribute) {
      throw new Error(`Character attribute '${name}' not found for this character`);
    }
    return new AttributeProxy(characterAttribute, attribute, this.pendingUpdates);
  }

  Item(name: string): ReturnType<typeof createItemInstanceProxy> | undefined {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) return undefined;
    const inventoryItem = this.inventoryItems.find(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    if (!inventoryItem) return undefined;
    const onSetCustomProperty = (propName: string, value: string | number | boolean) => {
      if (!inventoryItem.customProperties) inventoryItem.customProperties = {};
      inventoryItem.customProperties[propName] = value;
      this.pendingUpdates.set(`inventoryUpdate:${inventoryItem.id}`, {
        customProperties: inventoryItem.customProperties,
      });
    };
    return createItemInstanceProxy(inventoryItem, item, onSetCustomProperty);
  }

  Items(name: string): ReturnType<typeof createItemInstanceProxy>[] {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) return [];
    const matching = this.inventoryItems.filter(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    return matching.map((inv) => {
      const onSetCustomProperty = (propName: string, value: string | number | boolean) => {
        if (!inv.customProperties) inv.customProperties = {};
        inv.customProperties[propName] = value;
        this.pendingUpdates.set(`inventoryUpdate:${inv.id}`, {
          customProperties: inv.customProperties,
        });
      };
      return createItemInstanceProxy(inv, item, onSetCustomProperty);
    });
  }

  get name(): string {
    return this.characterName;
  }

  get location(): string {
    return this.locationName;
  }

  get title(): string {
    return this.characterName;
  }

  hasItem(name: string): boolean {
    return this.Items(name).length > 0;
  }

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
    const idsToDelete = new Set(matching.map((inv) => inv.id));
    for (const id of idsToDelete) {
      this.pendingUpdates.set(`inventoryDelete:${id}`, true);
    }
    this.inventoryItems = this.inventoryItems.filter((inv) => !idsToDelete.has(inv.id));
    this.addItem(name, quantity);
  }

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

  /** Public id for script-runner (e.g. to find Owner in location list). */
  get characterId(): string {
    return this.id;
  }

  toStructuredCloneSafe(): unknown {
    return { __type: 'Character', name: this.characterName, location: this.locationName };
  }
}
