import type {
  Action,
  Attribute,
  CharacterAttribute,
  CustomProperty,
  InventoryItem,
  Item,
} from '@/types';
import type Dexie from 'dexie';
import type { ExecuteActionEventFn } from '../proxies';
import { ActionProxy, AttributeProxy, createItemInstanceProxy } from '../proxies';
import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Base accessor for any character (Owner or a character in a location).
 * Provides access to the character's attributes, items, Tile, actions, etc.
 * OwnerAccessor extends this; Character instances from Tile.characters use this directly.
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
  /** Archetype name -> variant, for getVariant(name). First entry in insertion order is the "primary" for the variant getter. */
  protected archetypeVariantByName: Map<string, string | undefined>;
  protected customProperties: CustomProperty[];
  /** Character's custom property values (keyed by customPropertyId). Mutable reference for setProperty. */
  protected characterCustomProperties: Record<string, string | number | boolean>;
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
    archetypeNamesCache: Set<string> = new Set(),
    archetypeVariantByName: Map<string, string | undefined> = new Map(),
    targetId: string | null = null,
    executeActionEvent?: ExecuteActionEventFn,
    customProperties: CustomProperty[] = [],
    characterCustomProperties: Record<string, string | number | boolean> = {},
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
    this.archetypeVariantByName = archetypeVariantByName;
    this.targetId = targetId;
    this.executeActionEvent = executeActionEvent;
    this.customProperties = customProperties;
    this.characterCustomProperties = characterCustomProperties;
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
   * Get a character custom property by label (e.g. Owner.getProperty('Level')).
   * Returns the first matching CustomProperty value; null if not found.
   */
  getProperty(name: string): string | number | boolean | null {
    const cp = this.customProperties.find((c) => c.label === name);
    if (!cp) return null;
    const current = this.characterCustomProperties[cp.id];
    if (current !== undefined && current != null) {
      return current as string | number | boolean;
    }

    const defaultValue = this.getDefaultValueForCustomProperty(cp);
    console.log('def: ', defaultValue);
    this.characterCustomProperties[cp.id] = defaultValue;
    this.pendingUpdates.set(`characterUpdate:${this.id}`, {
      customProperties: this.characterCustomProperties,
    });

    return defaultValue;
  }

  /**
   * Set a character custom property by label (e.g. Owner.setProperty('Level', 5)).
   * Persists via pendingUpdates on flush.
   */
  setProperty(name: string, value: string | number | boolean): void {
    const cp = this.customProperties.find((c) => c.label === name);
    if (!cp) return;
    this.characterCustomProperties[cp.id] = value;
    this.pendingUpdates.set(`characterUpdate:${this.id}`, {
      customProperties: this.characterCustomProperties,
    });
  }

  /**
   * Set the character's image to either:
   * - a direct URL (e.g. Owner.setImage('https://example.com/portrait.png')), or
   * - the filename of an asset in the current ruleset (e.g. Owner.setImage('portrait.png')).
   *
   * The exact storage (assetId vs raw image URL) is resolved in ScriptRunner.flushCache.
   * Persists via pendingUpdates on flush.
   */
  setImage(value: string | null): void {
    const existing = this.pendingUpdates.get(`characterUpdate:${this.id}`) as
      | { customProperties?: Record<string, string | number | boolean>; image?: string | null }
      | undefined;
    this.pendingUpdates.set(`characterUpdate:${this.id}`, {
      ...existing,
      customProperties: existing?.customProperties ?? this.characterCustomProperties,
      image: value,
    });
  }

  hasArchetype(name: string): boolean {
    return this.archetypeNamesCache.has(name);
  }

  get archetypes(): string[] {
    return Array.from(this.archetypeNamesCache);
  }

  /**
   * The archetype variant for this character (first archetype's variant by load order).
   * When the character has a single archetype with a variant, this is that variant.
   */
  get variant(): string | null {
    const first = this.archetypeVariantByName.entries().next();
    if (first.done) return null;
    const v = first.value[1];
    return v !== undefined ? v : null;
  }

  /**
   * Get the variant for a specific archetype by name (e.g. Owner.getVariant('Fighter')).
   */
  getVariant(archetypeName: string): string | null {
    const v = this.archetypeVariantByName.get(archetypeName);
    return v !== undefined ? v : null;
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

  Action(nameOrId: string): ActionProxy {
    let action = this.actionsCache.get(nameOrId);
    if (!action) {
      action = Array.from(this.actionsCache.values()).find((a) => a.title === nameOrId);
    }
    if (!action) {
      throw new Error(`Action '${nameOrId}' not found`);
    }
    return new ActionProxy(action.id, this.id, this.targetId, this.executeActionEvent);
  }

  Attribute(name: string): AttributeProxy | null {
    const attribute = Array.from(this.attributesCache.values()).find((attr) => attr.title === name);
    if (!attribute) {
      return null;
    }
    const characterAttribute = Array.from(this.characterAttributesCache.values()).find(
      (charAttr) => charAttr.attributeId === attribute.id && charAttr.characterId === this.id,
    );
    if (!characterAttribute) {
      return null;
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
    return this.createItemInstanceProxyFor(inventoryItem, item);
  }

  /**
   * Resolve a specific inventory item instance by id (used by script-runner so Self refers to the correct instance in item event scripts).
   */
  getItemByInstanceId(
    inventoryItemInstanceId: string,
  ): ReturnType<typeof createItemInstanceProxy> | undefined {
    const inventoryItem = this.inventoryItems.find(
      (inv) => inv.id === inventoryItemInstanceId && inv.type === 'item',
    );
    if (!inventoryItem) return undefined;
    const item = this.itemsCache.get(inventoryItem.entityId);
    if (!item) return undefined;
    return this.createItemInstanceProxyFor(inventoryItem, item);
  }

  private createItemInstanceProxyFor(
    inventoryItem: InventoryItem,
    item: Item,
  ): ReturnType<typeof createItemInstanceProxy> {
    const getMergedUpdate = (patch: Partial<InventoryItem>) => {
      const existing = this.pendingUpdates.get(`inventoryUpdate:${inventoryItem.id}`) as
        | Partial<InventoryItem>
        | undefined;
      return { ...existing, ...patch, updatedAt: new Date().toISOString() };
    };
    const onSetCustomProperty = (customPropertyId: string, value: string | number | boolean) => {
      if (!inventoryItem.customProperties) inventoryItem.customProperties = {};
      inventoryItem.customProperties[customPropertyId] = value;
      this.pendingUpdates.set(
        `inventoryUpdate:${inventoryItem.id}`,
        getMergedUpdate({ customProperties: inventoryItem.customProperties }),
      );
    };
    const onSetLabel = (label: string) => {
      inventoryItem.label = label;
      this.pendingUpdates.set(`inventoryUpdate:${inventoryItem.id}`, getMergedUpdate({ label }));
    };
    const onSetDescription = (description: string) => {
      inventoryItem.description = description;
      this.pendingUpdates.set(
        `inventoryUpdate:${inventoryItem.id}`,
        getMergedUpdate({ description }),
      );
    };
    const onSetActionIds = (actionIds: string[]) => {
      inventoryItem.actionIds = actionIds;
      this.pendingUpdates.set(
        `inventoryUpdate:${inventoryItem.id}`,
        getMergedUpdate({ actionIds }),
      );
    };
    const getActionIdByName = (actionName: string) =>
      Array.from(this.actionsCache.values()).find((a) => a.title === actionName)?.id;
    const onDestroy = () => this.removeItemByInstanceId(inventoryItem.id);
    return createItemInstanceProxy(
      inventoryItem,
      item,
      this.customProperties,
      onSetCustomProperty,
      onDestroy,
      onSetLabel,
      onSetDescription,
      onSetActionIds,
      getActionIdByName,
    );
  }

  Items(name: string): ReturnType<typeof createItemInstanceProxy>[] {
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) return [];
    const matching = this.inventoryItems.filter(
      (inv) => inv.entityId === item.id && inv.type === 'item',
    );
    return matching.map((inv) => {
      const getMergedUpdate = (patch: Partial<InventoryItem>) => {
        const existing = this.pendingUpdates.get(`inventoryUpdate:${inv.id}`) as
          | Partial<InventoryItem>
          | undefined;
        return { ...existing, ...patch, updatedAt: new Date().toISOString() };
      };
      const onSetCustomProperty = (customPropertyId: string, value: string | number | boolean) => {
        if (!inv.customProperties) inv.customProperties = {};
        inv.customProperties[customPropertyId] = value;
        this.pendingUpdates.set(
          `inventoryUpdate:${inv.id}`,
          getMergedUpdate({ customProperties: inv.customProperties }),
        );
      };
      const onSetLabel = (label: string) => {
        inv.label = label;
        this.pendingUpdates.set(`inventoryUpdate:${inv.id}`, getMergedUpdate({ label }));
      };
      const onSetDescription = (description: string) => {
        inv.description = description;
        this.pendingUpdates.set(`inventoryUpdate:${inv.id}`, getMergedUpdate({ description }));
      };
      const onSetActionIds = (actionIds: string[]) => {
        inv.actionIds = actionIds;
        this.pendingUpdates.set(`inventoryUpdate:${inv.id}`, getMergedUpdate({ actionIds }));
      };
      const getActionIdByName = (actionName: string) =>
        Array.from(this.actionsCache.values()).find((a) => a.title === actionName)?.id;
      const onDestroy = () => this.removeItemByInstanceId(inv.id);
      return createItemInstanceProxy(
        inv,
        item,
        this.customProperties,
        onSetCustomProperty,
        onDestroy,
        onSetLabel,
        onSetDescription,
        onSetActionIds,
        getActionIdByName,
      );
    });
  }

  get name(): string {
    return this.characterName;
  }

  get title(): string {
    return this.characterName;
  }

  hasItem(name: string): boolean {
    return this.Items(name).length > 0;
  }

  addItem(
    name: string,
    quantity: number = 1,
    inventoryCompId?: string,
    x?: number,
    y?: number,
  ): ReturnType<typeof createItemInstanceProxy> {
    if (quantity < 1) {
      throw new Error('addItem quantity must be at least 1');
    }
    const item = Array.from(this.itemsCache.values()).find((i) => i.title === name);
    if (!item) {
      throw new Error(`Item '${name}' not found`);
    }
    if (!this.inventoryId) {
      throw new Error('Character has no inventory');
    }
    const now = new Date().toISOString();
    const newEntry = {
      id: crypto.randomUUID(),
      type: 'item' as const,
      entityId: item.id,
      inventoryId: this.inventoryId,
      componentId: '',
      quantity,
      x: x ?? -1,
      y: y ?? -1,
      createdAt: now,
      updatedAt: now,
      ...(inventoryCompId != null && inventoryCompId !== ''
        ? { _inventoryComponentIdRef: inventoryCompId }
        : {}),
    };
    this.inventoryItems.push(newEntry as InventoryItem);
    const key = 'inventoryAdd';
    const existing = this.pendingUpdates.get(key) as InventoryItem[] | undefined;
    this.pendingUpdates.set(key, existing ? [...existing, newEntry] : [newEntry]);
    return this.createItemInstanceProxyFor(newEntry, item);
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

  /**
   * Remove a specific inventory item instance by id. Used by item-instance destroy() so Self.destroy() removes this instance only.
   */
  removeItemByInstanceId(inventoryItemInstanceId: string): void {
    const inv = this.inventoryItems.find(
      (i) => i.id === inventoryItemInstanceId && i.type === 'item',
    );
    if (!inv) return;
    this.pendingUpdates.set(`inventoryDelete:${inv.id}`, true);
    this.inventoryItems = this.inventoryItems.filter((i) => i.id !== inv.id);
  }

  /**
   * Add a character sheet page for this character from a ruleset page template, by label or id.
   * Examples:
   * - Owner.addPage('Spells')
   * - Owner.addPage('<page-uuid>')
   *
   * The actual DB work is performed in ScriptRunner.flushCache via 'characterPageAdd'.
   */
  addPage(labelOrId: string): void {
    const key = 'characterPageAdd';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; label: string }[]
      | undefined;
    const entry = { characterId: this.id, label: labelOrId };
    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  /**
   * Navigate this character's sheet to a page by label or id.
   * Examples:
   * - Owner.navigateToPage('Spells')
   * - Owner.navigateToPage('<page-uuid>')
   *
   * The actual DB work (ensuring the CharacterPage exists and updating lastViewedPageId)
   * is performed in ScriptRunner.flushCache via 'characterPageNavigate'.
   */
  navigateToPage(labelOrId: string): void {
    const key = 'characterPageNavigate';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; label: string }[]
      | undefined;
    const entry = { characterId: this.id, label: labelOrId };

    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  /**
   * Open a character sheet window on the current page by title or id.
   * Examples:
   * - Owner.openWindow('Inventory')
   * - Owner.openWindow('<window-uuid>')
   *
   * The actual DB work (finding/creating CharacterWindow on the current page and uncollapsing it)
   * is performed in ScriptRunner.flushCache via 'characterWindowOpen'.
   */
  openWindow(labelOrId: string): void {
    const key = 'characterWindowOpen';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; label: string }[]
      | undefined;
    const entry = { characterId: this.id, label: labelOrId };
    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  /**
   * Remove this character's page that was created from a ruleset page with the given label or id.
   * Examples:
   * - Owner.removePage('Spells')
   * - Owner.removePage('<page-uuid>')
   *
   * The actual DB work (deleting CharacterPage + its CharacterWindows and updating
   * lastViewedPageId when needed) is performed in ScriptRunner.flushCache via 'characterPageRemove'.
   */
  removePage(labelOrId: string): void {
    const key = 'characterPageRemove';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; label: string }[]
      | undefined;
    const entry = { characterId: this.id, label: labelOrId };
    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  /**
   * Close and remove a character sheet window on the current page by title or id.
   * Examples:
   * - Owner.closeWindow('Inventory')
   * - Owner.closeWindow('<window-uuid>')
   *
   * The actual DB work (finding CharacterWindow on the current page and deleting it)
   * is performed in ScriptRunner.flushCache via 'characterWindowClose'.
   */
  closeWindow(labelOrId: string): void {
    const key = 'characterWindowClose';
    const existing = this.pendingUpdates.get(key) as
      | { characterId: string; label: string }[]
      | undefined;
    const entry = { characterId: this.id, label: labelOrId };
    this.pendingUpdates.set(key, existing ? [...existing, entry] : [entry]);
  }

  /** Public id for script-runner (e.g. to find Owner in location list). */
  get characterId(): string {
    return this.id;
  }

  toStructuredCloneSafe(): unknown {
    return { __type: 'Character', name: this.characterName };
  }
}
