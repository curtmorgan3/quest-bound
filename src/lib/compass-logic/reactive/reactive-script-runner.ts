import type { DB } from '@/stores/db/hooks/types';
import type { ScriptExecutionContext, ScriptExecutionResult } from '../runtime/script-runner';
import { ScriptRunner } from '../runtime/script-runner';
import type { ReactiveExecutionOptions } from './reactive-executor';
import { ReactiveExecutor } from './reactive-executor';

/**
 * ReactiveScriptRunner extends ScriptRunner to automatically trigger
 * dependent scripts when attribute values change. It wraps the standard
 * ScriptRunner with reactive capabilities.
 */
export class ReactiveScriptRunner {
  private context: ScriptExecutionContext;
  private runner: ScriptRunner;
  private reactiveExecutor: ReactiveExecutor;
  private changedAttributes: Set<string>;

  constructor(context: ScriptExecutionContext) {
    this.context = context;
    this.runner = new ScriptRunner(context);
    this.reactiveExecutor = new ReactiveExecutor(context.db);
    this.changedAttributes = new Set();
  }

  /**
   * Execute a script with reactive capabilities.
   * After the script completes, automatically execute any dependent scripts.
   * @param sourceCode - The QBScript source code to execute
   * @param options - Reactive execution options
   * @returns Script execution result
   */
  async run(
    sourceCode: string,
    options: ReactiveExecutionOptions = {},
  ): Promise<ScriptExecutionResult> {
    // Execute the main script
    const result = await this.runner.run(sourceCode);

    // If the script failed, don't trigger reactive updates
    if (result.error) {
      return result;
    }

    // Detect which attributes changed during execution
    await this.detectChangedAttributes();

    // If no attributes changed, we're done
    if (this.changedAttributes.size === 0) {
      return result;
    }

    // Trigger reactive execution for each changed attribute
    for (const attributeId of this.changedAttributes) {
      try {
        const reactiveResult = await this.reactiveExecutor.onAttributeChange(
          attributeId,
          this.context.ownerId,
          this.context.rulesetId,
          options,
        );

        // If reactive execution failed, include error in result
        if (!reactiveResult.success && reactiveResult.error) {
          return {
            ...result,
            error: reactiveResult.error,
          };
        }
      } catch (error) {
        // If reactive execution throws, wrap it in the result
        return {
          ...result,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }

    return result;
  }

  /**
   * Detect which attributes changed during script execution.
   * This is done by comparing the pending updates in the script runner.
   */
  private async detectChangedAttributes(): Promise<void> {
    this.changedAttributes.clear();

    // Access the pending updates from the runner
    // Note: We need to make pendingUpdates accessible or track changes differently
    // For now, we'll use a simplified approach

    // In a real implementation, we would:
    // 1. Track which character attributes were modified in the runner
    // 2. Map those to their attribute IDs
    // 3. Add them to changedAttributes

    // For now, if this is an attribute script, we know that attribute changed
    if (this.context.scriptId) {
      const script = await this.context.db.scripts.get(this.context.scriptId);
      if (script && script.entityType === 'attribute' && script.entityId) {
        this.changedAttributes.add(script.entityId);
      }
    }
  }

  /**
   * Execute a script without triggering reactive updates.
   * This is useful for running scripts that shouldn't trigger cascades.
   * @param sourceCode - The QBScript source code to execute
   * @returns Script execution result
   */
  async runNonReactive(sourceCode: string): Promise<ScriptExecutionResult> {
    return this.runner.run(sourceCode);
  }

  /**
   * Get the underlying ScriptRunner instance.
   * @returns The script runner
   */
  getRunner(): ScriptRunner {
    return this.runner;
  }

  /**
   * Get the reactive executor instance.
   * @returns The reactive executor
   */
  getReactiveExecutor(): ReactiveExecutor {
    return this.reactiveExecutor;
  }
}

/**
 * Enhanced AttributeProxy that tracks modifications for reactive execution.
 * This should be integrated with the existing AttributeProxy.
 */
export interface ReactiveAttributeProxy {
  /** Track that this attribute is being modified */
  trackModification(): void;
  /** Get the attribute ID */
  getAttributeId(): string;
}

/**
 * Factory function to create a ReactiveScriptRunner with proper configuration.
 * @param context - Script execution context
 * @returns Configured ReactiveScriptRunner
 */
export function createReactiveScriptRunner(
  context: ScriptExecutionContext,
): ReactiveScriptRunner {
  return new ReactiveScriptRunner(context);
}

/**
 * Execute a script with reactive capabilities using a simple API.
 * @param db - Database instance
 * @param characterId - Character executing the script
 * @param rulesetId - Ruleset ID
 * @param sourceCode - Script source code
 * @param options - Reactive execution options
 * @returns Script execution result
 */
export async function runReactiveScript(
  db: DB,
  characterId: string,
  rulesetId: string,
  sourceCode: string,
  options: ReactiveExecutionOptions = {},
): Promise<ScriptExecutionResult> {
  const context: ScriptExecutionContext = {
    ownerId: characterId,
    rulesetId,
    db,
    triggerType: 'attribute_change',
  };

  const runner = new ReactiveScriptRunner(context);
  return runner.run(sourceCode, options);
}
