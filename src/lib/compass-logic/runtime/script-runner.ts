import type { DB } from '@/stores/db/hooks/types';
import type {
  Action,
  Attribute,
  CampaignCharacter,
  CampaignEvent,
  CharacterAttribute,
  Chart,
  CustomProperty,
  InventoryItem,
  Item,
  PromptFn,
  RollFn,
  RollSplitFn,
  Script,
  SelectCharacterFn,
  SelectCharactersFn,
} from '@/types';
import { buildItemCustomProperties } from '@/utils/custom-property-utils';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { executeArchetypeEvent } from '../reactive/event-handler-executor';
import {
  CampaignEventAccessor,
  CampaignSceneAccessor,
  CharacterAccessor,
  OwnerAccessor,
  RulesetAccessor,
} from './accessors';
import type { ExecuteActionEventFn } from './proxies';

const INVENTORY_COMPONENT_TYPE = 'inventory';
const CELL_SIZE_PX = 20;

/**
 * Resolve _inventoryComponentIdRef (data.inventoryComponentId from script) to component.id.
 * If x or y is -1, find the first available slot in the target inventory component.
 * Returns the item with componentId set and _inventoryComponentIdRef omitted for persistence.
 */
async function resolveInventoryComponentIdRef(
  db: DB,
  item: InventoryItem & { _inventoryComponentIdRef?: string },
): Promise<InventoryItem> {
  const ref = item._inventoryComponentIdRef;
  const { _inventoryComponentIdRef: _, ...rest } = item;
  const out: InventoryItem = { ...rest };

  if (ref == null || ref === '') return out;

  const inventory = await db.inventories.get(item.inventoryId);
  const rulesetId = (inventory as { rulesetId?: string } | undefined)?.rulesetId;
  if (!rulesetId) return out;

  const components = await db.components
    .where('rulesetId')
    .equals(rulesetId)
    .filter((c) => (c as { type?: string }).type === INVENTORY_COMPONENT_TYPE)
    .toArray();

  const match = components.find((c) => {
    const data = JSON.parse((c as { data?: string }).data ?? '{}');
    return data.inventoryComponentId === ref;
  });

  if (!match) return out;

  const comp = match as { id: string; width: number; height: number; data?: string };
  out.componentId = comp.id;

  const needsSlot = item.x === -1 || item.y === -1;
  if (!needsSlot) return out;

  const compData = JSON.parse(comp.data ?? '{}') as { cellWidth?: number; cellHeight?: number };
  const cellWidthPx = (compData.cellWidth ?? 1) * CELL_SIZE_PX;
  const cellHeightPx = (compData.cellHeight ?? 1) * CELL_SIZE_PX;
  const gridCols = Math.floor((comp.width ?? 0) / cellWidthPx);
  const gridRows = Math.floor((comp.height ?? 0) / cellHeightPx);
  if (gridCols < 1 || gridRows < 1) return out;

  const entity =
    item.type === 'item'
      ? await db.items.get(item.entityId)
      : item.type === 'action'
        ? await db.actions.get(item.entityId)
        : await db.attributes.get(item.entityId);
  const entityData = entity as { inventoryWidth?: number; inventoryHeight?: number } | undefined;
  const itemW = entityData?.inventoryWidth ?? 1;
  const itemH = entityData?.inventoryHeight ?? 1;
  const itemWidthInCells = Math.ceil((itemW * CELL_SIZE_PX) / cellWidthPx);
  const itemHeightInCells = Math.ceil((itemH * CELL_SIZE_PX) / cellHeightPx);

  const existingItems = await db.inventoryItems
    .where('inventoryId')
    .equals(item.inventoryId)
    .filter((i) => (i as { componentId?: string }).componentId === comp.id)
    .toArray();

  const existingDims = await Promise.all(
    existingItems.map(async (invItem) => {
      const e =
        (invItem as { type: string }).type === 'item'
          ? await db.items.get((invItem as { entityId: string }).entityId)
          : (invItem as { type: string }).type === 'action'
            ? await db.actions.get((invItem as { entityId: string }).entityId)
            : await db.attributes.get((invItem as { entityId: string }).entityId);
      const d = e as { inventoryWidth?: number; inventoryHeight?: number } | undefined;
      const w = d?.inventoryWidth ?? 1;
      const h = d?.inventoryHeight ?? 1;
      return {
        x: (invItem as { x: number }).x,
        y: (invItem as { y: number }).y,
        widthInCells: Math.ceil((w * CELL_SIZE_PX) / cellWidthPx),
        heightInCells: Math.ceil((h * CELL_SIZE_PX) / cellHeightPx),
      };
    }),
  );

  const hasCollision = (x: number, y: number): boolean => {
    for (const other of existingDims) {
      const noOverlap =
        x >= other.x + other.widthInCells ||
        x + itemWidthInCells <= other.x ||
        y >= other.y + other.heightInCells ||
        y + itemHeightInCells <= other.y;
      if (!noOverlap) return true;
    }
    return false;
  };

  for (let y = 0; y <= gridRows - itemHeightInCells; y++) {
    for (let x = 0; x <= gridCols - itemWidthInCells; x++) {
      if (!hasCollision(x, y)) {
        out.x = x;
        out.y = y;
        return out;
      }
    }
  }

  out.x = 0;
  out.y = 0;
  return out;
}

/**
 * Context for script execution.
 */
export interface ScriptExecutionContext {
  /**
   * Character executing the script.
   * Required for character-scoped scripts (attributes, items, actions, archetypes, character loader).
   * May be omitted for some campaign/system scripts that do not have an owning character.
   */
  ownerId?: string;
  rulesetId: string; // Current ruleset
  db: DB; // Database access
  scriptId?: string; // Which script is executing (for error logging)
  triggerType?:
    | 'load'
    | 'attribute_change'
    | 'action_click'
    | 'item_event'
    | 'archetype_event'
    | 'character_load';
  /** When script is attached to an entity (attribute, action, item), the entity type. Enables 'Self'. */
  entityType?: string;
  /** When script is attached to an entity, the entity id. Self = Owner.Attribute/Action/Item as appropriate. */
  entityId?: string;
  /** When script is for an item (entityType 'item'), the inventory item instance id. Self then refers to this instance instead of the first match by name. */
  inventoryItemInstanceId?: string;
  /** When set (e.g. action fired from item context menu), Caller = itemInstanceProxy of this inventory item. When unset, Caller = Owner. */
  callerInventoryItemInstanceId?: string;
  /** Optional roll function for script built-in roll(). When set, used instead of default local roll (e.g. from useDiceState). */
  roll?: RollFn;
  /** Optional rollSplit function for script built-in rollSplit(). When set, used instead of default local roll. */
  rollSplit?: RollSplitFn;
  /** Optional prompt function for script built-in prompt(msg, choices). When set, used to show modal and return selected choice. */
  prompt?: PromptFn;
  /** Optional character picker for selectCharacter(title?, description?). When set, used to show UI and return a single character accessor or null. */
  selectCharacter?: SelectCharacterFn;
  /** Optional character picker for selectCharacters(title?, description?). When set, used to show UI and return an array of character accessors. */
  selectCharacters?: SelectCharactersFn;
  /** When set, Owner.Action('name').activate() / .deactivate() can run action event handlers (e.g. from worker or EventHandlerExecutor). */
  executeActionEvent?: ExecuteActionEventFn;
  /** Optional campaign id for associating script execution with a campaign (logging, context). */
  campaignId?: string;
  /** When set, called after roll/rollSplit with an auto-generated log message for the game log. */
  onRollComplete?: (message: string) => Promise<void>;
  /** When set (e.g. campaign scene events), identifies the CampaignScene whose active characters should be loaded into context. */
  campaignSceneId?: string;
  /** When set (campaign event scripts), the CampaignEvent this script is attached to. */
  campaignEvent?: CampaignEvent;
}

/**
 * Result of script execution.
 */
export interface ScriptExecutionResult {
  value: any;
  announceMessages: string[];
  logMessages: any[][];
  error?: Error;
  /** Attribute IDs (ruleset attribute ids) whose character values were updated. Used to trigger reactive scripts in the worker. */
  modifiedAttributeIds?: string[];
}

/**
 * ScriptRunner handles execution of QBScript code with game entity integration.
 * It pre-loads entity data, executes the script with accessor objects, and flushes changes.
 */
export class ScriptRunner {
  private context: ScriptExecutionContext;
  private evaluator: Evaluator;
  private pendingUpdates: Map<string, any>;

  // Cached data loaded before execution
  private characterAttributesCache: Map<string, CharacterAttribute>;
  private attributesCache: Map<string, Attribute>;
  private actionsCache: Map<string, Action>;
  private chartsCache: Map<string, Chart>;
  private itemsCache: Map<string, Item>;
  private customPropertiesCache: CustomProperty[] = [];
  private ownerCharacterCustomProperties: Record<string, string | number | boolean> = {};
  private ownerInventoryItems: InventoryItem[];
  private ownerCharacterName: string;
  private ownerInventoryId: string;
  private ownerArchetypeNames: Set<string>;
  /** Cached Owner accessor instance (set in setupAccessors). */
  private ownerAccessor: OwnerAccessor | null = null;

  /** Cached character ids that are active in the current campaign scene (for campaign event scripts). */
  private sceneCharacterIds: Set<string> | null = null;

  /** Lazily-created accessors for characters selected via selectCharacter(s). */
  private otherCharacterAccessors: Map<string, CharacterAccessor | OwnerAccessor> = new Map();

  constructor(context: ScriptExecutionContext) {
    this.context = context;
    const selectCharacterHost =
      context.selectCharacter != null
        ? async (title?: string, description?: string): Promise<any | null> => {
            const id = await context.selectCharacter!(title, description);
            if (!id) return null;
            return this.getCharacterAccessorById(String(id));
          }
        : undefined;

    const selectCharactersHost =
      context.selectCharacters != null
        ? async (title?: string, description?: string): Promise<any[]> => {
            const ids = await context.selectCharacters!(title, description);
            const results: any[] = [];
            for (const rawId of ids ?? []) {
              const acc = await this.getCharacterAccessorById(String(rawId));
              if (acc) results.push(acc);
            }
            return results;
          }
        : undefined;

    this.evaluator = new Evaluator({
      roll: context.roll,
      rollSplit: context.rollSplit,
      prompt: context.prompt,
      selectCharacter: selectCharacterHost,
      selectCharacters: selectCharactersHost,
      onRollComplete: context.onRollComplete,
    });
    this.pendingUpdates = new Map();
    this.characterAttributesCache = new Map();
    this.attributesCache = new Map();
    this.actionsCache = new Map();
    this.chartsCache = new Map();
    this.itemsCache = new Map();
    this.ownerInventoryItems = [];
    this.ownerCharacterName = 'Character';
    this.ownerInventoryId = '';
    this.ownerArchetypeNames = new Set();
  }

  /**
   * Load all necessary data from the database before script execution.
   * This allows accessor methods to work synchronously.
   */
  async loadCache(): Promise<void> {
    const { db, rulesetId, ownerId } = this.context;

    // Load all attributes for this ruleset
    const attributes = await db.attributes.where({ rulesetId }).toArray();
    for (const attr of attributes) {
      this.attributesCache.set(attr.id, attr);
    }

    // Load all charts for this ruleset
    const charts = await db.charts.where({ rulesetId }).toArray();
    for (const chart of charts) {
      this.chartsCache.set(chart.id, chart);
    }

    // Load all items for this ruleset
    const items = await db.items.where({ rulesetId }).toArray();
    for (const item of items) {
      this.itemsCache.set(item.id, item);
    }

    // Load all actions for this ruleset (for Owner.Action('name'))
    const actions = await db.actions.where({ rulesetId }).toArray();
    for (const action of actions) {
      this.actionsCache.set(action.id, action);
    }

    // Load custom properties for this ruleset (for item/character custom property lookup)
    this.customPropertiesCache = await db.customProperties
      .where('rulesetId')
      .equals(rulesetId)
      .toArray();

    // Load owner character and inventory items (when an owner is present)
    if (ownerId) {
      const ownerCharacter = await db.characters.get(ownerId);
      this.ownerCharacterName = ownerCharacter?.name ?? 'Character';
      this.ownerInventoryId = ownerCharacter?.inventoryId ?? '';
      this.ownerCharacterCustomProperties = ownerCharacter?.customProperties ?? {};
      if (ownerCharacter?.inventoryId) {
        this.ownerInventoryItems = await db.inventoryItems
          .where('inventoryId')
          .equals(ownerCharacter.inventoryId)
          .toArray();
      }

      // Load character attributes for owner
      const ownerAttributes = await db.characterAttributes
        .where({ characterId: ownerId })
        .toArray();
      for (const charAttr of ownerAttributes) {
        this.characterAttributesCache.set(charAttr.id, charAttr);
      }

      // Load archetype names for owner (CharacterArchetype join Archetype)
      const ownerCharArchetypes = await db.characterArchetypes
        .where('characterId')
        .equals(ownerId)
        .toArray();
      for (const ca of ownerCharArchetypes) {
        const archetype = await db.archetypes.get(ca.archetypeId);
        if (archetype?.name) this.ownerArchetypeNames.add(archetype.name);
      }
    }

    // Load active characters for the current campaign scene (for campaign scene events).
    // Includes both player characters and NPCs whose CampaignCharacter.active === true.
    if (this.context.campaignId && this.context.campaignSceneId) {
      const sceneCampaignCharacters = (await db.campaignCharacters
        .where('campaignId')
        .equals(this.context.campaignId)
        .filter(
          (cc: CampaignCharacter) =>
            cc.campaignSceneId === this.context.campaignSceneId && cc.active === true,
        )
        .toArray()) as CampaignCharacter[];

      const ids = new Set<string>();
      for (const cc of sceneCampaignCharacters) {
        const characterId = cc.characterId;
        ids.add(characterId);
        // Owner is already loaded above; skip here to avoid duplicate accessor creation.
        if (characterId === ownerId) continue;

        // Preload accessor by id so scene characters are available synchronously in scripts.
        // getCharacterAccessorById merges character attributes into shared caches.
        await this.getCharacterAccessorById(characterId);
      }

      this.sceneCharacterIds = ids;
    }

  }

  /**
   * Resolve a character accessor by characterId.
   * Reuses Owner or location characters when possible; otherwise lazily creates
   * a new CharacterAccessor wired to this ScriptRunner's caches and pendingUpdates.
   */
  async getCharacterAccessorById(
    characterId: string,
  ): Promise<CharacterAccessor | OwnerAccessor | null> {
    // Owner
    if (characterId === this.context.ownerId && this.ownerAccessor) {
      return this.ownerAccessor;
    }

    // Previously created via selection
    const fromCache = this.otherCharacterAccessors.get(characterId);
    if (fromCache) return fromCache;

    // Fallback: load character data on demand
    const { db } = this.context;
    const character = await db.characters.get(characterId);
    if (!character) return null;

    const characterName = character.name ?? 'Character';
    const inventoryId = character.inventoryId ?? '';

    let inventoryItems: InventoryItem[] = [];
    if (inventoryId) {
      inventoryItems = await db.inventoryItems.where('inventoryId').equals(inventoryId).toArray();
    }

    const charAttrs = await db.characterAttributes.where({ characterId }).toArray();
    for (const charAttr of charAttrs) {
      this.characterAttributesCache.set(charAttr.id, charAttr);
    }

    const archetypeNames = new Set<string>();
    const charArchetypes = await db.characterArchetypes.where('characterId').equals(characterId).toArray();
    for (const ca of charArchetypes) {
      const archetype = await db.archetypes.get(ca.archetypeId);
      if (archetype?.name) archetypeNames.add(archetype.name);
    }

    const accessor = new CharacterAccessor(
      characterId,
      characterName,
      inventoryId,
      db,
      this.pendingUpdates,
      this.characterAttributesCache,
      this.attributesCache,
      this.actionsCache,
      this.itemsCache,
      inventoryItems,
      archetypeNames,
      null,
      this.context.executeActionEvent,
      this.customPropertiesCache,
      character.customProperties ?? {},
    );

    this.otherCharacterAccessors.set(characterId, accessor);
    return accessor;
  }

  /**
   * Collect attribute IDs (ruleset attribute ids) that have pending value updates.
   * Must be called before flushCache() since flush clears pendingUpdates.
   */
  getModifiedAttributeIds(): string[] {
    const ids = new Set<string>();
    for (const key of this.pendingUpdates.keys()) {
      const match =
        key.startsWith('characterAttribute:') ||
        key.startsWith('characterAttributeMax:') ||
        key.startsWith('characterAttributeMin:') ||
        key.startsWith('characterAttributeOptions:');
      if (match) {
        const characterAttributeId = key.split(':')[1];
        const charAttr = this.characterAttributesCache.get(characterAttributeId);
        if (charAttr?.attributeId) {
          ids.add(charAttr.attributeId);
        }
      }
    }
    return Array.from(ids);
  }

  /**
   * Write all pending changes back to the database.
   */
  async flushCache(): Promise<void> {
    const { db, rulesetId } = this.context;

    // Process all pending updates
    for (const [key, value] of this.pendingUpdates.entries()) {
      const [type, id] = key.split(':');

      if (type === 'characterAttribute') {
        await db.characterAttributes.update(id, { value });
      } else if (type === 'characterUpdate') {
        const { customProperties } = value as {
          customProperties: Record<string, string | number | boolean>;
        };
        await db.characters.update(id, { customProperties, updatedAt: new Date().toISOString() });
      } else if (type === 'characterAttributeMax') {
        await db.characterAttributes.update(id, { max: value });
      } else if (type === 'characterAttributeMin') {
        await db.characterAttributes.update(id, { min: value });
      } else if (type === 'characterAttributeOptions') {
        await db.characterAttributes.update(id, { options: value });
      } else if (type === 'inventoryAdd') {
        const items = value as (InventoryItem & { _inventoryComponentIdRef?: string })[];
        for (const item of items) {
          let itemToAdd = item;
          if (item.type === 'item' && item.entityId) {
            const rulesetItem = await db.items.get(item.entityId);
            const customProperties = await buildItemCustomProperties(db, item.entityId);
            const actionIds = item.actionIds ?? rulesetItem?.actionIds ?? [];
            itemToAdd = { ...item, customProperties, actionIds };
          } else {
            itemToAdd = { ...item, customProperties: item.customProperties ?? {} };
          }
          const resolved = await resolveInventoryComponentIdRef(db, itemToAdd);
          await db.inventoryItems.add(resolved);
        }
      } else if (type === 'inventoryUpdate') {
        const now = new Date().toISOString();
        await db.inventoryItems.update(id, { ...value, updatedAt: now });
      } else if (type === 'inventoryDelete') {
        await db.inventoryItems.delete(id);
      } else if (type === 'archetypeAdd') {
        const entries = value as { characterId: string; archetypeName: string }[];
        for (const { characterId, archetypeName } of entries) {
          const archetype = await db.archetypes.where({ rulesetId, name: archetypeName }).first();
          if (!archetype) continue;
          const existing = await db.characterArchetypes
            .where('[characterId+archetypeId]')
            .equals([characterId, archetype.id])
            .first();
          if (existing) continue;
          const maxOrder =
            (
              await db.characterArchetypes
                .where('characterId')
                .equals(characterId)
                .sortBy('loadOrder')
            ).pop()?.loadOrder ?? -1;
          const now = new Date().toISOString();
          await db.characterArchetypes.add({
            id: crypto.randomUUID(),
            characterId,
            archetypeId: archetype.id,
            loadOrder: maxOrder + 1,
            createdAt: now,
            updatedAt: now,
          });
          const result = await executeArchetypeEvent(db, archetype.id, characterId, 'on_add');
          if (result.error) {
            console.warn('Archetype on_add script failed:', result.error);
          }
        }
      } else if (type === 'archetypeRemove') {
        const entries = value as { characterId: string; archetypeName: string }[];
        for (const { characterId, archetypeName } of entries) {
          const archetype = await db.archetypes.where({ rulesetId, name: archetypeName }).first();
          if (!archetype) continue;
          const ca = await db.characterArchetypes
            .where('[characterId+archetypeId]')
            .equals([characterId, archetype.id])
            .first();
          if (!ca) continue;
          const result = await executeArchetypeEvent(db, archetype.id, characterId, 'on_remove');
          if (result.error) {
            console.warn('Archetype on_remove script failed:', result.error);
          }
          await db.characterArchetypes.delete(ca.id);
        }
      }
    }

    // Clear pending updates
    this.pendingUpdates.clear();
  }

  /**
   * Set up accessor objects in the interpreter environment.
   */
  private setupAccessors(): void {
    const { ownerId, rulesetId, db } = this.context;

    // Create Ruleset accessor (available in both owner and ownerless contexts)
    const ruleset = new RulesetAccessor(
      rulesetId,
      this.attributesCache,
      this.chartsCache,
      this.itemsCache,
    );

    // When there is no owner (e.g. some campaign/system scripts), only Ruleset is injected
    // except for campaign event scripts, which still get Self and Scene() via CampaignEventAccessor.
    if (!ownerId) {
      this.evaluator.globalEnv.define('Ruleset', ruleset);

      if (this.context.entityType === 'campaignEvent' && this.context.entityId) {
        const dbTyped = db as DB;
        const campaignEvent = this.context.campaignEvent;

        if (!campaignEvent) {
          this.evaluator.globalEnv.define('Self', null);
        } else {
          const sceneAccessor =
            this.context.campaignId && this.context.campaignSceneId
              ? new CampaignSceneAccessor(
                  dbTyped,
                  this.context.campaignId,
                  this.context.campaignSceneId,
                  rulesetId,
                  (id: string) => this.getCharacterAccessorById(id),
                  this.sceneCharacterIds ? Array.from(this.sceneCharacterIds) : undefined,
                  (id: string) => {
                    if (!this.sceneCharacterIds) {
                      this.sceneCharacterIds = new Set();
                    }
                    this.sceneCharacterIds.add(id);
                  },
                )
              : null;

          const eventAccessor = new CampaignEventAccessor(
            dbTyped,
            campaignEvent,
            rulesetId,
            this.context.campaignSceneId ?? null,
            () => sceneAccessor,
          );

          this.evaluator.globalEnv.define('Self', eventAccessor);
        }
      }

      return;
    }

    const owner = new OwnerAccessor(
      ownerId,
      this.ownerCharacterName,
      this.ownerInventoryId,
      db,
      this.pendingUpdates,
      this.characterAttributesCache,
      this.attributesCache,
      this.actionsCache,
      this.itemsCache,
      this.ownerInventoryItems,
      this.ownerArchetypeNames,
      null,
      this.context.executeActionEvent,
      this.customPropertiesCache,
      this.ownerCharacterCustomProperties,
    );

    this.ownerAccessor = owner;

    // Caller: entity that fired the action. When action fired from item context menu, Caller = that item instance; else Caller = Owner.
    const caller =
      this.context.callerInventoryItemInstanceId != null
        ? owner.getItemByInstanceId(this.context.callerInventoryItemInstanceId)
        : owner;
    this.evaluator.globalEnv.define('Caller', caller ?? owner);

    // Inject into interpreter environment
    this.evaluator.globalEnv.define('Owner', owner);
    this.evaluator.globalEnv.define('Ruleset', ruleset);

    // 'Self' refers to the entity this script is attached to (attribute, action, item, or campaignEvent).
    if (this.context.entityType === 'attribute' && this.context.entityId) {
      const attribute = this.attributesCache.get(this.context.entityId);
      if (attribute) {
        const attrRef = owner.Attribute(attribute.title);
        if (attrRef !== null) {
          this.evaluator.globalEnv.define('Self', attrRef);
        }
      }
    } else if (this.context.entityType === 'action' && this.context.entityId) {
      const action = this.actionsCache.get(this.context.entityId);
      if (action) {
        this.evaluator.globalEnv.define('Self', owner.Action(action.title));
      }
    } else if (this.context.entityType === 'item' && this.context.entityId) {
      const item = this.itemsCache.get(this.context.entityId);
      if (item) {
        const itemRef = this.context.inventoryItemInstanceId
          ? owner.getItemByInstanceId(this.context.inventoryItemInstanceId)
          : owner.Item(item.title);
        this.evaluator.globalEnv.define('Self', itemRef ?? null);
      }
    } else if (this.context.entityType === 'campaignEvent' && this.context.entityId) {
      // For campaign event scripts, Self refers to the CampaignEvent accessor and exposes Scene().
      const dbTyped = db as DB;
      const campaignEvent = this.context.campaignEvent;

      if (!campaignEvent) {
        this.evaluator.globalEnv.define('Self', null);
      } else {
        const sceneAccessor =
          this.context.campaignId && this.context.campaignSceneId
            ? new CampaignSceneAccessor(
                dbTyped,
                this.context.campaignId,
                this.context.campaignSceneId,
                rulesetId,
                (id: string) => this.getCharacterAccessorById(id),
                this.sceneCharacterIds ? Array.from(this.sceneCharacterIds) : undefined,
                (id: string) => {
                  if (!this.sceneCharacterIds) {
                    this.sceneCharacterIds = new Set();
                  }
                  this.sceneCharacterIds.add(id);
                },
              )
            : null;

        const eventAccessor = new CampaignEventAccessor(
          dbTyped,
          campaignEvent,
          rulesetId,
          this.context.campaignSceneId ?? null,
          () => sceneAccessor,
        );

        this.evaluator.globalEnv.define('Self', eventAccessor);
      }
    }
    // entityType 'location' | 'tile' | 'archetype' | 'global' | 'characterLoader' (or unknown): no Self
  }

  /**
   * Load and execute all enabled global scripts for the ruleset so their
   * functions and variables are available in the environment for the main script.
   * Excludes the script with context.scriptId when it is a global (avoids running it twice).
   */
  private async loadAndRunGlobalScripts(): Promise<void> {
    const { db, rulesetId, scriptId } = this.context;

    const globalScripts = (await db.scripts
      .where({ rulesetId })
      // Dexie can't use booleans in a query key
      .filter((script) => script.enabled && script.isGlobal)
      .toArray()) as Script[];

    // Exclude the current script if it's a global (we'll run it as the main script)
    const toRun = scriptId ? globalScripts.filter((s) => s.id !== scriptId) : globalScripts;

    // Deterministic order so global scripts can depend on earlier ones by name
    toRun.sort((a, b) => a.name.localeCompare(b.name, 'en'));

    for (const script of toRun) {
      const tokens = new Lexer(script.sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      await this.evaluator.eval(ast);
    }
  }

  /**
   * Execute a script with full game entity integration.
   * Global scripts are run first so their functions and variables are in scope.
   * @param sourceCode - The QBScript source code to execute
   * @returns ScriptExecutionResult with the result value, messages, and any error
   */
  async run(sourceCode: string): Promise<ScriptExecutionResult> {
    try {
      // Load all data first
      await this.loadCache();

      // Set up accessor objects
      this.setupAccessors();

      // Run global scripts so their definitions are in the environment
      await this.loadAndRunGlobalScripts();

      // Parse and execute the main script
      const tokens = new Lexer(sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      const value = await this.evaluator.eval(ast);

      // Collect modified attribute IDs before flush (flush clears pendingUpdates)
      const modifiedAttributeIds = this.getModifiedAttributeIds();

      // Flush changes to database
      await this.flushCache();

      return {
        value,
        announceMessages: this.evaluator.getAnnounceMessages(),
        logMessages: this.evaluator.getLogMessages(),
        modifiedAttributeIds,
      };
    } catch (error) {
      return {
        value: null,
        announceMessages: this.evaluator.getAnnounceMessages(),
        logMessages: this.evaluator.getLogMessages(),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
