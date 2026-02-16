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
  triggerType?: 'load' | 'attribute_change' | 'action_click' | 'item_event';
  /** When script is attached to an entity (e.g. attribute), the entity type. Enables 'Self' for attribute scripts. */
  entityType?: string;
  /** When script is attached to an entity, the entity id. For attribute scripts, 'Self' = Owner.Attribute(attributeTitle). */
  entityId?: string;
  /** Optional roll function for script built-in roll(). When set, used instead of default local roll (e.g. from useDiceState). */
  roll?: RollFn;
  /** When set, Owner.Action('name').activate() / .deactivate() can run action event handlers (e.g. from worker or EventHandlerExecutor). */
  executeActionEvent?: ExecuteActionEventFn;
}

/**
 * Result of script execution.
 */
export interface ScriptExecutionResult {
  value: any;
  announceMessages: string[];
  logMessages: any[][];
  error?: Error;
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
  }

  /**
   * Write all pending changes back to the database.
   */
  async flushCache(): Promise<void> {
    const { db } = this.context;

    // Process all pending updates
    for (const [key, value] of this.pendingUpdates.entries()) {
      const [type, id] = key.split(':');

      if (type === 'characterAttribute') {
        await db.characterAttributes.update(id, { value });
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
      targetId ?? null,
      this.context.executeActionEvent,
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

    // For attribute scripts, 'Self' refers to Owner.Attribute(<this attribute's title>)
    if (this.context.entityType === 'attribute' && this.context.entityId) {
      const attribute = this.attributesCache.get(this.context.entityId);
      if (attribute) {
        this.evaluator.globalEnv.define('Self', owner.Attribute(attribute.title));
      }
    }
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

      console.log('setup accessors');

      // Run global scripts so their definitions are in the environment
      await this.loadAndRunGlobalScripts();

      // Parse and execute the main script
      const tokens = new Lexer(sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      const value = await this.evaluator.eval(ast);

      // Flush changes to database
      await this.flushCache();

      return {
        value,
        announceMessages: this.evaluator.getAnnounceMessages(),
        logMessages: this.evaluator.getLogMessages(),
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
