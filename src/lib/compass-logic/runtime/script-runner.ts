import type { DB } from '@/stores/db/hooks/types';
import type {
  Action,
  Attribute,
  CharacterAttribute,
  Chart,
  InventoryItem,
  Item,
  RollFn,
  Script,
} from '@/types';
import { executeArchetypeEvent } from '../reactive/event-handler-executor';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { OwnerAccessor, RulesetAccessor, TargetAccessor } from './accessors';
import type { ExecuteActionEventFn } from './proxies';

/**
 * Context for script execution.
 */
export interface ScriptExecutionContext {
  ownerId: string; // Character executing the script
  targetId?: string | null; // Optional target character
  rulesetId: string; // Current ruleset
  db: DB; // Database access
  scriptId?: string; // Which script is executing (for error logging)
  triggerType?: 'load' | 'attribute_change' | 'action_click' | 'item_event' | 'archetype_event' | 'character_load';
  /** When script is attached to an entity (attribute, action, item), the entity type. Enables 'Self'. */
  entityType?: string;
  /** When script is attached to an entity, the entity id. Self = Owner.Attribute/Action/Item as appropriate. */
  entityId?: string;
  /** Optional roll function for script built-in roll(). When set, used instead of default local roll (e.g. from useDiceState). */
  roll?: RollFn;
  /** When set, Owner.Action('name').activate() / .deactivate() can run action event handlers (e.g. from worker or EventHandlerExecutor). */
  executeActionEvent?: ExecuteActionEventFn;
  /** When set (e.g. campaign event scripts), used to resolve Owner.location from the character's current location in the campaign. */
  campaignId?: string;
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
  private ownerInventoryItems: InventoryItem[];
  private targetInventoryItems: InventoryItem[] | null;
  private ownerCharacterName: string;
  private ownerInventoryId: string;
  private targetCharacterName: string;
  private targetInventoryId: string;
  private ownerArchetypeNames: Set<string>;
  private targetArchetypeNames: Set<string>;
  private campaignEventLocationCache: {
    id: string;
    campaignEventId: string;
    locationId: string;
    tileId: string | null;
  } | null = null;
  private ownerLocationName: string = '';
  /** Owner's current tile coordinates (from campaign character's currentTileId); null when not in campaign or no tile. */
  private ownerCurrentTile: { x: number; y: number } | null = null;

  constructor(context: ScriptExecutionContext) {
    this.context = context;
    this.evaluator = new Evaluator({ roll: context.roll });
    this.pendingUpdates = new Map();
    this.characterAttributesCache = new Map();
    this.attributesCache = new Map();
    this.actionsCache = new Map();
    this.chartsCache = new Map();
    this.itemsCache = new Map();
    this.ownerInventoryItems = [];
    this.targetInventoryItems = null;
    this.ownerCharacterName = 'Character';
    this.ownerInventoryId = '';
    this.targetCharacterName = 'Character';
    this.targetInventoryId = '';
    this.ownerArchetypeNames = new Set();
    this.targetArchetypeNames = new Set();
  }

  /**
   * Load all necessary data from the database before script execution.
   * This allows accessor methods to work synchronously.
   */
  async loadCache(): Promise<void> {
    const { db, rulesetId, ownerId, targetId } = this.context;

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

    // Load owner character and inventory items
    const ownerCharacter = await db.characters.get(ownerId);
    this.ownerCharacterName = ownerCharacter?.name ?? 'Character';
    this.ownerInventoryId = ownerCharacter?.inventoryId ?? '';
    if (ownerCharacter?.inventoryId) {
      this.ownerInventoryItems = await db.inventoryItems
        .where('inventoryId')
        .equals(ownerCharacter.inventoryId)
        .toArray();
    }

    // Load target character and inventory items (if any)
    if (targetId) {
      const targetCharacter = await db.characters.get(targetId);
      this.targetCharacterName = targetCharacter?.name ?? 'Character';
      this.targetInventoryId = targetCharacter?.inventoryId ?? '';
      if (targetCharacter?.inventoryId) {
        this.targetInventoryItems = await db.inventoryItems
          .where('inventoryId')
          .equals(targetCharacter.inventoryId)
          .toArray();
      }
    }

    // Load character attributes for owner
    const ownerAttributes = await db.characterAttributes.where({ characterId: ownerId }).toArray();
    for (const charAttr of ownerAttributes) {
      this.characterAttributesCache.set(charAttr.id, charAttr);
    }

    // Load character attributes for target (if any)
    if (targetId) {
      const targetAttributes = await db.characterAttributes
        .where({ characterId: targetId })
        .toArray();
      for (const charAttr of targetAttributes) {
        this.characterAttributesCache.set(charAttr.id, charAttr);
      }
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

    // Load archetype names for target (if any)
    if (targetId) {
      const targetCharArchetypes = await db.characterArchetypes
        .where('characterId')
        .equals(targetId)
        .toArray();
      for (const ca of targetCharArchetypes) {
        const archetype = await db.archetypes.get(ca.archetypeId);
        if (archetype?.name) this.targetArchetypeNames.add(archetype.name);
      }
    }

    // Load CampaignEventLocation when Self is the event location (campaign event scripts)
    if (
      this.context.entityType === 'campaignEventLocation' &&
      this.context.entityId
    ) {
      const loc = await db.campaignEventLocations.get(this.context.entityId);
      this.campaignEventLocationCache = loc
        ? {
            id: loc.id,
            campaignEventId: loc.campaignEventId,
            locationId: loc.locationId,
            tileId: loc.tileId ?? null,
          }
        : null;
    }

    // Load owner's current location name and tile when in campaign context (for Owner.location, Owner.Tile)
    if (this.context.campaignId && this.context.ownerId) {
      const cc = await db.campaignCharacters
        .where('[campaignId+characterId]')
        .equals([this.context.campaignId, this.context.ownerId])
        .first();
      if (cc?.currentLocationId) {
        const location = await db.locations.get(cc.currentLocationId);
        this.ownerLocationName = location?.label ?? '';
        if (cc.currentTileId && location?.tiles?.length) {
          const tile = location.tiles.find((t) => t.id === cc.currentTileId);
          if (tile) {
            this.ownerCurrentTile = { x: tile.x, y: tile.y };
          }
        }
      }
    }
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
        key.startsWith('characterAttributeMin:');
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
      } else if (type === 'characterAttributeMax') {
        await db.characterAttributes.update(id, { max: value });
      } else if (type === 'characterAttributeMin') {
        await db.characterAttributes.update(id, { min: value });
      } else if (type === 'inventoryAdd') {
        const items = value as InventoryItem[];
        for (const item of items) {
          await db.inventoryItems.add(item);
        }
      } else if (type === 'inventoryUpdate') {
        const now = new Date().toISOString();
        await db.inventoryItems.update(id, { ...value, updatedAt: now });
      } else if (type === 'inventoryDelete') {
        await db.inventoryItems.delete(id);
      } else if (type === 'archetypeAdd') {
        const entries = value as { characterId: string; archetypeName: string }[];
        for (const { characterId, archetypeName } of entries) {
          const archetype = await db.archetypes
            .where({ rulesetId, name: archetypeName })
            .first();
          if (!archetype) continue;
          const existing = await db.characterArchetypes
            .where('[characterId+archetypeId]')
            .equals([characterId, archetype.id])
            .first();
          if (existing) continue;
          const maxOrder =
            (await db.characterArchetypes
              .where('characterId')
              .equals(characterId)
              .sortBy('loadOrder'))
              .pop()?.loadOrder ?? -1;
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
          const archetype = await db.archetypes
            .where({ rulesetId, name: archetypeName })
            .first();
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
    const { ownerId, targetId, rulesetId, db } = this.context;

    // Create Owner accessor
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
      targetId ?? null,
      this.context.executeActionEvent,
      this.ownerLocationName,
      this.ownerCurrentTile,
    );

    // Create Target accessor (null if no target)
    let target: TargetAccessor | null = null;
    if (targetId) {
      target = new TargetAccessor(
        targetId,
        this.targetCharacterName,
        this.targetInventoryId,
        db,
        this.pendingUpdates,
        this.characterAttributesCache,
        this.attributesCache,
        this.actionsCache,
        this.itemsCache,
        this.targetInventoryItems ?? [],
        this.targetArchetypeNames,
        null, // Target's Action() has no second target
        this.context.executeActionEvent,
      );
    }

    // Create Ruleset accessor
    const ruleset = new RulesetAccessor(
      rulesetId,
      this.attributesCache,
      this.chartsCache,
      this.itemsCache,
    );

    // Inject into interpreter environment
    this.evaluator.globalEnv.define('Owner', owner);
    this.evaluator.globalEnv.define('Target', target);
    this.evaluator.globalEnv.define('Ruleset', ruleset);

    // 'Self' refers to the entity this script is attached to (attribute, action, or item).
    // location and tile scripts do not have a Self binding (no Location/Tile accessor yet).
    if (this.context.entityType === 'attribute' && this.context.entityId) {
      const attribute = this.attributesCache.get(this.context.entityId);
      if (attribute) {
        this.evaluator.globalEnv.define('Self', owner.Attribute(attribute.title));
      }
    } else if (this.context.entityType === 'action' && this.context.entityId) {
      const action = this.actionsCache.get(this.context.entityId);
      if (action) {
        this.evaluator.globalEnv.define('Self', owner.Action(action.title));
      }
    } else if (this.context.entityType === 'item' && this.context.entityId) {
      const item = this.itemsCache.get(this.context.entityId);
      if (item) {
        const itemRef = owner.Item(item.title);
        if (itemRef !== undefined) {
          this.evaluator.globalEnv.define('Self', itemRef);
        }
      }
    } else if (
      this.context.entityType === 'campaignEventLocation' &&
      this.campaignEventLocationCache
    ) {
      // Self = the CampaignEventLocation (id, campaignEventId, locationId, tileId) with destroy()
      const loc = this.campaignEventLocationCache;
      const db = this.context.db;
      this.evaluator.globalEnv.define('Self', {
        ...loc,
        destroy: async () => {
          await db.campaignEventLocations.delete(loc.id);
        },
      });
    }
    // entityType 'location' | 'tile' | 'archetype' | 'global' (or unknown): no Self
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
