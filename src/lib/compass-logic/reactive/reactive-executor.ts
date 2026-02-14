import type { DB } from '@/stores/db/hooks/types';
import type { ScriptExecutionContext } from '../runtime/script-runner';
import { ScriptRunner } from '../runtime/script-runner';
import { DependencyGraph, loadDependencyGraph } from './dependency-graph';
import { ExecutionLimitError, ExecutionTracker } from './execution-tracker';
import { TransactionManager } from './transaction-manager';

/**
 * Options for reactive execution.
 */
export interface ReactiveExecutionOptions {
  /** Whether to create a transaction snapshot for rollback */
  useTransaction?: boolean;
  /** Maximum total script executions (default: 100) */
  maxExecutions?: number;
  /** Maximum executions per script (default: 10) */
  maxPerScript?: number;
  /** Time limit in milliseconds (default: 5000) */
  timeLimit?: number;
}

/**
 * Result of reactive execution.
 */
export interface ReactiveExecutionResult {
  success: boolean;
  scriptsExecuted: string[];
  executionCount: number;
  error?: Error;
  rollbackPerformed: boolean;
}

/**
 * ReactiveExecutor handles cascading script execution when attributes change.
 * It manages the execution order, tracks limits, and handles rollback on errors.
 */
export class ReactiveExecutor {
  private db: DB;
  private graph: DependencyGraph | null;
  private executionTracker: ExecutionTracker;
  private transactionManager: TransactionManager;

  constructor(db: DB) {
    this.db = db;
    this.graph = null;
    this.executionTracker = new ExecutionTracker();
    this.transactionManager = new TransactionManager(db);
  }

  /**
   * Load the dependency graph for a ruleset.
   * This should be called before executing reactive scripts.
   * @param rulesetId - ID of the ruleset
   */
  async loadGraph(rulesetId: string): Promise<void> {
    this.graph = await loadDependencyGraph(rulesetId, this.db);
    if (!this.graph) {
      // No graph exists yet - create an empty one
      this.graph = new DependencyGraph(rulesetId, this.db);
    }
  }

  /**
   * Execute all scripts that depend on a changed attribute.
   * @param attributeId - ID of the attribute that changed
   * @param characterId - ID of the character
   * @param rulesetId - ID of the ruleset
   * @param options - Execution options
   * @returns Execution result
   */
  async onAttributeChange(
    attributeId: string,
    characterId: string,
    rulesetId: string,
    options: ReactiveExecutionOptions = {},
  ): Promise<ReactiveExecutionResult> {
    // Ensure graph is loaded
    if (!this.graph) {
      await this.loadGraph(rulesetId);
    }

    if (!this.graph) {
      return {
        success: true,
        scriptsExecuted: [],
        executionCount: 0,
        rollbackPerformed: false,
      };
    }

    // Get execution order
    const scriptIds = this.graph.getExecutionOrder(attributeId);
    
    if (scriptIds.length === 0) {
      return {
        success: true,
        scriptsExecuted: [],
        executionCount: 0,
        rollbackPerformed: false,
      };
    }

    // Start execution tracking
    const executionId = this.executionTracker.startExecution(characterId, attributeId);

    // Apply custom limits if provided
    const context = this.executionTracker.getContext(executionId);
    if (context && options.maxExecutions !== undefined) {
      context.maxExecutions = options.maxExecutions;
    }
    if (context && options.maxPerScript !== undefined) {
      context.maxPerScript = options.maxPerScript;
    }
    if (context && options.timeLimit !== undefined) {
      context.timeLimit = options.timeLimit;
    }

    // Create transaction snapshot if requested
    if (options.useTransaction !== false) {
      await this.transactionManager.createFullSnapshot(executionId, characterId);
    }

    try {
      // Execute script chain
      await this.executeScriptChain(scriptIds, characterId, rulesetId, executionId);

      // Commit transaction
      this.transactionManager.commit(executionId);
      this.executionTracker.endExecution(executionId);

      return {
        success: true,
        scriptsExecuted: scriptIds,
        executionCount: scriptIds.length,
        rollbackPerformed: false,
      };
    } catch (error) {
      // Rollback on error
      let rollbackPerformed = false;
      if (this.transactionManager.hasSnapshot(executionId)) {
        await this.transactionManager.rollback(executionId);
        rollbackPerformed = true;
      }

      // Log error to database
      await this.logError(error as Error, characterId, rulesetId, executionId);

      // Handle infinite loop detection
      if (error instanceof ExecutionLimitError) {
        await this.handleInfiniteLoop(error, characterId);
      }

      this.executionTracker.endExecution(executionId);

      return {
        success: false,
        scriptsExecuted: context?.executionChain || [],
        executionCount: context?.executionChain.length || 0,
        error: error as Error,
        rollbackPerformed,
      };
    }
  }

  /**
   * Execute a chain of scripts in order.
   * @param scriptIds - Array of script IDs to execute
   * @param characterId - ID of the character
   * @param rulesetId - ID of the ruleset
   * @param executionId - ID of the execution context
   */
  private async executeScriptChain(
    scriptIds: string[],
    characterId: string,
    rulesetId: string,
    executionId: string,
  ): Promise<void> {
    for (const scriptId of scriptIds) {
      // Record execution
      this.executionTracker.recordExecution(executionId, scriptId);

      // Get script
      const script = await this.db.scripts.get(scriptId);
      if (!script || !script.enabled) {
        continue;
      }

      // Execute script
      const context: ScriptExecutionContext = {
        ownerId: characterId,
        rulesetId,
        db: this.db,
        scriptId,
        triggerType: 'attribute_change',
        entityType: script.entityType,
        entityId: script.entityId ?? undefined,
      };

      const runner = new ScriptRunner(context);
      const result = await runner.run(script.sourceCode);

      if (result.error) {
        throw result.error;
      }

      // Check if this execution triggered more changes
      // If so, we would recursively execute those scripts
      // For now, we rely on the topological sort to handle this
    }
  }

  /**
   * Handle infinite loop detection by disabling problematic scripts.
   * @param error - Execution limit error
   * @param characterId - ID of the character
   */
  private async handleInfiniteLoop(
    error: ExecutionLimitError,
    characterId: string,
  ): Promise<void> {
    const report = error.getReport();
    
    // Find scripts that were executed multiple times
    const problematicScripts: string[] = [];
    for (const [scriptId, count] of Object.entries(report.scriptCounts)) {
      if (count > 3) {
        problematicScripts.push(scriptId);
      }
    }

    // Disable problematic scripts for this character
    for (const scriptId of problematicScripts) {
      const script = await this.db.scripts.get(scriptId);
      if (script && script.entityType === 'attribute' && script.entityId) {
        // Find the character attribute and disable its script
        const charAttr = await this.db.characterAttributes
          .where({ characterId, attributeId: script.entityId })
          .first();
        
        if (charAttr) {
          await this.db.characterAttributes.update(charAttr.id, {
            scriptDisabled: true,
          });
        }
      }
    }
  }

  /**
   * Log script error to database.
   * @param error - The error that occurred
   * @param characterId - ID of the character
   * @param rulesetId - ID of the ruleset
   * @param executionId - ID of the execution
   */
  private async logError(
    error: Error,
    characterId: string,
    rulesetId: string,
    executionId: string,
  ): Promise<void> {
    const context = this.executionTracker.getContext(executionId);
    const lastScriptId = context?.executionChain[context.executionChain.length - 1];

    await this.db.scriptErrors.add({
      rulesetId,
      scriptId: lastScriptId || 'unknown',
      characterId,
      errorMessage: error.message,
      lineNumber: null,
      stackTrace: error.stack || null,
      context: 'reactive_execution',
      timestamp: Date.now(),
    } as any);
  }

  /**
   * Clear the loaded graph (forces reload on next execution).
   */
  clearGraph(): void {
    this.graph = null;
  }

  /**
   * Get execution statistics for debugging.
   * @param executionId - ID of the execution
   */
  getExecutionStats(executionId: string) {
    return this.executionTracker.getStats(executionId);
  }
}
