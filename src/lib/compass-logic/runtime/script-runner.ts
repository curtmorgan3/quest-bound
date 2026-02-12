import type { DB } from '@/stores/db/hooks/types';
import type { Attribute, CharacterAttribute, Chart } from '@/types';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { OwnerAccessor, RulesetAccessor, TargetAccessor } from './accessors';

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
  private chartsCache: Map<string, Chart>;

  constructor(context: ScriptExecutionContext) {
    this.context = context;
    this.evaluator = new Evaluator();
    this.pendingUpdates = new Map();
    this.characterAttributesCache = new Map();
    this.attributesCache = new Map();
    this.chartsCache = new Map();
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
      }
      // Add more types as needed (items, etc.)
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
      db,
      this.pendingUpdates,
      this.characterAttributesCache,
      this.attributesCache,
    );

    // Create Target accessor (null if no target)
    let target: TargetAccessor | null = null;
    if (targetId) {
      target = new TargetAccessor(
        targetId,
        db,
        this.pendingUpdates,
        this.characterAttributesCache,
        this.attributesCache,
      );
    }

    // Create Ruleset accessor
    const ruleset = new RulesetAccessor(rulesetId, this.attributesCache, this.chartsCache);

    // Inject into interpreter environment
    this.evaluator.globalEnv.define('Owner', owner);
    this.evaluator.globalEnv.define('Target', target);
    this.evaluator.globalEnv.define('Ruleset', ruleset);
  }

  /**
   * Execute a script with full game entity integration.
   * @param sourceCode - The QBScript source code to execute
   * @returns ScriptExecutionResult with the result value, messages, and any error
   */
  async run(sourceCode: string): Promise<ScriptExecutionResult> {
    try {
      // Load all data first
      await this.loadCache();

      // Set up accessor objects
      this.setupAccessors();

      // Parse and execute
      const tokens = new Lexer(sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      const value = this.evaluator.eval(ast);

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
