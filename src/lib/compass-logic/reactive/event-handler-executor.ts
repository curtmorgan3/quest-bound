import type { DB } from '@/stores/db/hooks/types';
import type { ASTNode } from '../interpreter/ast';
import { functionDefToExecutableSource } from '../interpreter/ast-to-source';
import type { RollFn } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import type { ScriptExecutionContext } from '../runtime/script-runner';
import { ScriptRunner } from '../runtime/script-runner';

/**
 * Type of event handler.
 */
export type EventHandlerType =
  | 'on_equip'
  | 'on_unequip'
  | 'on_consume'
  | 'on_activate'
  | 'on_deactivate';

/**
 * Result of event handler execution.
 */
export interface EventHandlerResult {
  success: boolean;
  value: any;
  announceMessages: string[];
  logMessages: any[][];
  error?: Error;
}

/**
 * EventHandlerExecutor handles execution of event handler functions
 * defined in item and action scripts.
 */
export class EventHandlerExecutor {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Execute an item event handler.
   * @param itemId - ID of the item
   * @param characterId - ID of the character
   * @param eventType - Type of event (on_equip, on_unequip, on_consume)
   * @returns Execution result
   */
  async executeItemEvent(
    itemId: string,
    characterId: string,
    eventType: 'on_equip' | 'on_unequip' | 'on_consume',
  ): Promise<EventHandlerResult> {
    // Get item
    const item = await this.db.items.get(itemId);
    console.log('item: ', item);
    if (!item) {
      return {
        success: false,
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error(`Item not found: ${itemId}`),
      };
    }

    console.log('item script id: ', item.scriptId);

    // Check if item has a script
    if (!item.scriptId) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    // Get script
    const script = await this.db.scripts.get(item.scriptId);
    if (!script || !script.enabled) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    console.log('script: ', script);

    // Check that the event handler exists
    const hasHandler = this.extractEventHandler(script.sourceCode, eventType) !== null;
    if (!hasHandler) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    // Run full script so all definitions are in scope, then call the handler
    const scriptToRun = this.buildScriptWithHandlerCall(script.sourceCode, eventType);
    const context: ScriptExecutionContext = {
      ownerId: characterId,
      rulesetId: item.rulesetId,
      db: this.db,
      scriptId: script.id,
      triggerType: 'item_event',
    };

    const runner = new ScriptRunner(context);
    const result = await runner.run(scriptToRun);

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      error: result.error,
    };
  }

  /**
   * Execute an action event handler.
   * @param actionId - ID of the action
   * @param characterId - ID of the character
   * @param targetId - Optional ID of target character
   * @param eventType - Type of event (on_activate, on_deactivate)
   * @param roll - Function to handle dice rolling
   * @returns Execution result
   */
  async executeActionEvent(
    actionId: string,
    characterId: string,
    targetId: string | null,
    eventType: 'on_activate' | 'on_deactivate',
    roll?: RollFn,
  ): Promise<EventHandlerResult> {
    // Get action
    const action = await this.db.actions.get(actionId);
    if (!action) {
      return {
        success: false,
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error(`Action not found: ${actionId}`),
      };
    }

    // Check if action has a script
    if (!action.scriptId) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    // Get script
    const script = await this.db.scripts.get(action.scriptId);
    if (!script || !script.enabled) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    // Check that the event handler exists
    const hasHandler = this.extractEventHandler(script.sourceCode, eventType) !== null;
    if (!hasHandler) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    // Run full script so all definitions are in scope, then call the handler
    const scriptToRun = this.buildScriptWithHandlerCall(script.sourceCode, eventType);
    const context: ScriptExecutionContext = {
      ownerId: characterId,
      targetId: targetId,
      rulesetId: action.rulesetId,
      db: this.db,
      scriptId: script.id,
      triggerType: 'action_click',
      roll,
    };

    const runner = new ScriptRunner(context);
    const result = await runner.run(scriptToRun);

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      error: result.error,
    };
  }

  /**
   * Build script that runs the full source (so the whole script is in scope) then calls the handler.
   */
  private buildScriptWithHandlerCall(sourceCode: string, eventType: EventHandlerType): string {
    return `${sourceCode}\n${eventType}()`;
  }

  /**
   * Extract an event handler function from script source code.
   * @param sourceCode - The script source code
   * @param eventType - Type of event handler to extract
   * @returns Source code of the event handler, or null if not found
   */
  private extractEventHandler(sourceCode: string, eventType: EventHandlerType): string | null {
    try {
      const tokens = new Lexer(sourceCode).tokenize();
      const ast = new Parser(tokens).parse();

      // Find the event handler function
      let handlerNode: any = null;

      function walk(node: ASTNode): void {
        if (node.type === 'FunctionDef') {
          const funcNode = node as any;
          if (funcNode.name === eventType) {
            handlerNode = funcNode;
          }
        }

        // Walk children
        if ((node as any).statements) {
          for (const stmt of (node as any).statements) {
            walk(stmt);
          }
        }
      }

      walk(ast);

      if (!handlerNode) {
        return null;
      }

      return this.reconstructHandlerCode(handlerNode);
    } catch (error) {
      console.error('Failed to extract event handler:', error);
      return null;
    }
  }

  /**
   * Reconstruct executable code from a function definition node.
   * Returns only the body of the handler as top-level executable source.
   * @param funcNode - The function definition AST node
   * @returns Executable source code (handler body only)
   */
  private reconstructHandlerCode(funcNode: {
    type: 'FunctionDef';
    name: string;
    params: string[];
    body: ASTNode[];
  }): string {
    return functionDefToExecutableSource(funcNode);
  }

  /**
   * Execute an event handler by calling it within the script context.
   * This is a more robust approach that loads the entire script and calls the function.
   * @param sourceCode - Full script source code
   * @param eventType - Event handler to call
   * @param context - Execution context
   * @returns Execution result
   */
  async executeEventHandlerByCall(
    sourceCode: string,
    eventType: EventHandlerType,
    context: ScriptExecutionContext,
  ): Promise<EventHandlerResult> {
    // First, execute the script to define all functions
    // Then call the event handler function
    const fullScript = `
${sourceCode}

# Call the event handler
if ${eventType} != null
  ${eventType}()
end
`;

    const runner = new ScriptRunner(context);
    const result = await runner.run(fullScript);

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      error: result.error,
    };
  }
}

/**
 * Convenience function to execute an item event.
 * @param db - Database instance
 * @param itemId - ID of the item
 * @param characterId - ID of the character
 * @param eventType - Type of event
 * @returns Execution result
 */
export async function executeItemEvent(
  db: DB,
  itemId: string,
  characterId: string,
  eventType: 'on_equip' | 'on_unequip' | 'on_consume',
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeItemEvent(itemId, characterId, eventType);
}

/**
 * Convenience function to execute an action event.
 * @param db - Database instance
 * @param actionId - ID of the action
 * @param characterId - ID of the character
 * @param targetId - Optional ID of target character
 * @param eventType - Type of event
 * @param roll - Function to handle dice rolls
 * @returns Execution result
 */
export async function executeActionEvent(
  db: DB,
  actionId: string,
  characterId: string,
  targetId: string | null,
  eventType: 'on_activate' | 'on_deactivate',
  roll?: RollFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeActionEvent(actionId, characterId, targetId, eventType, roll);
}
