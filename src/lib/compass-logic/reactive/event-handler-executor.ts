import type { DB } from '@/stores/db/hooks/types';
import type { RollFn } from '@/types';
import type { ASTNode } from '../interpreter/ast';
import { functionDefToExecutableSource } from '../interpreter/ast-to-source';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import type { ScriptExecutionContext, ScriptExecutionResult } from '../runtime/script-runner';
import { ScriptRunner } from '../runtime/script-runner';

/**
 * Type of event handler.
 */
export type EventHandlerType =
  | 'on_equip'
  | 'on_unequip'
  | 'on_consume'
  | 'on_activate'
  | 'on_deactivate'
  | 'on_add'
  | 'on_remove'
  | 'on_enter'
  | 'on_leave';

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
 * Reentrancy depth for action event execution. Only the top-level run (depth 1)
 * gets executeActionEvent in context so Owner.Action().activate() cannot
 * recursively re-enter and cause an infinite loop.
 */
let actionEventDepth = 0;

/**
 * Callback invoked when a script run modifies one or more character attribute values.
 * Used to trigger reactive execution (e.g. in the worker) so scripts that subscribe to those attributes run.
 */
export type OnAttributesModifiedFn = (
  attributeIds: string[],
  characterId: string,
  rulesetId: string,
) => Promise<void>;

/**
 * Optional test double: when provided, used instead of ScriptRunner.run() so tests can
 * assert onAttributesModified is called without running real scripts.
 */
export type RunScriptForTestFn = (
  context: ScriptExecutionContext,
  sourceCode: string,
) => Promise<ScriptExecutionResult>;

/**
 * EventHandlerExecutor handles execution of event handler functions
 * defined in item and action scripts.
 */
export class EventHandlerExecutor {
  private db: DB;
  private onAttributesModified?: OnAttributesModifiedFn;
  private runScriptForTest?: RunScriptForTestFn;

  constructor(
    db: DB,
    onAttributesModified?: OnAttributesModifiedFn,
    runScriptForTest?: RunScriptForTestFn,
  ) {
    this.db = db;
    this.onAttributesModified = onAttributesModified;
    this.runScriptForTest = runScriptForTest;
  }

  /**
   * Execute an item event handler.
   * @param itemId - ID of the item
   * @param characterId - ID of the character
   * @param eventType - Type of event (on_equip, on_unequip, on_consume)
   * @param roll - Optional function to handle dice rolling
   * @returns Execution result
   */
  async executeItemEvent(
    itemId: string,
    characterId: string,
    eventType: 'on_equip' | 'on_unequip' | 'on_consume',
    roll?: RollFn,
  ): Promise<EventHandlerResult> {
    // Get item
    const item = await this.db.items.get(itemId);
    if (!item) {
      return {
        success: false,
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error(`Item not found: ${itemId}`),
      };
    }

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
      entityType: 'item',
      entityId: item.id,
      roll,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(actionId, ownerId, targetIdForAction, eventTypeForAction, roll),
    };

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, scriptToRun)
      : await new ScriptRunner(context).run(scriptToRun);

    if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
      await this.onAttributesModified(result.modifiedAttributeIds, characterId, item.rulesetId);
    }

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
    actionEventDepth++;

    try {
      const context: ScriptExecutionContext = {
        ownerId: characterId,
        targetId: targetId,
        rulesetId: action.rulesetId,
        db: this.db,
        scriptId: script.id,
        triggerType: 'action_click',
        entityType: 'action',
        entityId: action.id,
        roll,
        // Only allow Owner.Action().activate() at top level to avoid infinite re-entrancy
        ...(actionEventDepth === 1 && {
          executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
            this.executeActionEvent(actionId, ownerId, targetIdForAction, eventTypeForAction, roll),
        }),
      };

      const result = this.runScriptForTest
        ? await this.runScriptForTest(context, scriptToRun)
        : await new ScriptRunner(context).run(scriptToRun);

      if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
        await this.onAttributesModified(result.modifiedAttributeIds, characterId, action.rulesetId);
      }

      return {
        success: !result.error,
        value: result.value,
        announceMessages: result.announceMessages,
        logMessages: result.logMessages,
        error: result.error,
      };
    } finally {
      actionEventDepth--;
    }
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
   * Execute an archetype event handler (on_add or on_remove).
   * @param archetypeId - ID of the archetype
   * @param characterId - ID of the character
   * @param eventType - Type of event (on_add, on_remove)
   * @param roll - Optional function to handle dice rolling
   * @returns Execution result
   */
  async executeArchetypeEvent(
    archetypeId: string,
    characterId: string,
    eventType: 'on_add' | 'on_remove',
    roll?: RollFn,
  ): Promise<EventHandlerResult> {
    const archetype = await this.db.archetypes.get(archetypeId);
    if (!archetype) {
      return {
        success: false,
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error(`Archetype not found: ${archetypeId}`),
      };
    }

    if (!archetype.scriptId) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const script = await this.db.scripts.get(archetype.scriptId);
    if (!script || !script.enabled) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const hasHandler = this.extractEventHandler(script.sourceCode, eventType) !== null;
    if (!hasHandler) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const scriptToRun = this.buildScriptWithHandlerCall(script.sourceCode, eventType);
    const context: ScriptExecutionContext = {
      ownerId: characterId,
      rulesetId: archetype.rulesetId,
      db: this.db,
      scriptId: script.id,
      triggerType: 'archetype_event',
      entityType: 'archetype',
      entityId: archetype.id,
      roll,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(actionId, ownerId, targetIdForAction, eventTypeForAction, roll),
    };

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, scriptToRun)
      : await new ScriptRunner(context).run(scriptToRun);

    if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
      await this.onAttributesModified(
        result.modifiedAttributeIds,
        characterId,
        archetype.rulesetId,
      );
    }

    await this.persistArchetypeLogs(
      archetype.rulesetId,
      script.id,
      characterId,
      result.logMessages,
    );

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      error: result.error,
    };
  }

  /**
   * Execute the ruleset's Character Loader script for a character.
   * Runs once at character creation, before initial attribute sync and archetype on_add scripts.
   * Owner and archetype API are available; the full script is executed (no named handler).
   */
  async executeCharacterLoader(
    characterId: string,
    rulesetId: string,
    roll?: RollFn,
  ): Promise<EventHandlerResult> {
    const script = await this.db.scripts
      .where({ rulesetId, entityType: 'characterLoader' })
      .first();
    if (!script || !script.enabled) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const context: ScriptExecutionContext = {
      ownerId: characterId,
      rulesetId,
      db: this.db,
      scriptId: script.id,
      triggerType: 'character_load',
      entityType: 'characterLoader',
      entityId: undefined,
      roll,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(actionId, ownerId, targetIdForAction, eventTypeForAction, roll),
    };

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, script.sourceCode)
      : await new ScriptRunner(context).run(script.sourceCode);

    if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
      await this.onAttributesModified(result.modifiedAttributeIds, characterId, rulesetId);
    }

    await this.persistCharacterLoaderLogs(rulesetId, script.id, characterId, result.logMessages);

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      error: result.error,
    };
  }

  /**
   * Persist character loader log messages to scriptLogs so they appear in useScriptLogs.
   */
  private async persistCharacterLoaderLogs(
    rulesetId: string,
    scriptId: string,
    characterId: string,
    logMessages: any[][],
  ): Promise<void> {
    if (logMessages.length === 0) return;
    const now = new Date().toISOString();
    const timestamp = Date.now();
    try {
      for (const args of logMessages) {
        let argsJson: string;
        try {
          argsJson = JSON.stringify(args);
        } catch {
          argsJson = JSON.stringify(args.map((a) => String(a)));
        }
        await this.db.scriptLogs.add({
          id: crypto.randomUUID(),
          rulesetId,
          scriptId,
          characterId,
          argsJson,
          timestamp,
          context: 'character_load',
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    } catch (e) {
      console.warn('[QBScript] Failed to persist character loader event logs:', e);
    }
  }

  /**
   * Persist archetype event log messages to scriptLogs so they appear in useScriptLogs.
   */
  private async persistArchetypeLogs(
    rulesetId: string,
    scriptId: string,
    characterId: string,
    logMessages: any[][],
  ): Promise<void> {
    if (logMessages.length === 0) return;
    const now = new Date().toISOString();
    const timestamp = Date.now();
    try {
      for (const args of logMessages) {
        let argsJson: string;
        try {
          argsJson = JSON.stringify(args);
        } catch {
          argsJson = JSON.stringify(args.map((a) => String(a)));
        }
        await this.db.scriptLogs.add({
          id: crypto.randomUUID(),
          rulesetId,
          scriptId,
          characterId,
          argsJson,
          timestamp,
          context: 'archetype_event',
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    } catch (e) {
      console.warn('[QBScript] Failed to persist archetype event logs:', e);
    }
  }

  /**
   * Execute a campaign event's script handler (e.g. on_enter when a character moves onto a tile with that event).
   * Call only for events whose type matches (e.g. type === 'on_enter' when firing on enter).
   */
  async executeCampaignEventEvent(
    campaignEventId: string,
    characterId: string,
    eventType: 'on_enter' | 'on_leave',
    roll?: RollFn,
  ): Promise<EventHandlerResult> {
    const campaignEvent = await this.db.campaignEvents.get(campaignEventId);
    if (!campaignEvent) {
      return {
        success: false,
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error(`Campaign event not found: ${campaignEventId}`),
      };
    }

    if (!campaignEvent.scriptId) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const script = await this.db.scripts.get(campaignEvent.scriptId);
    if (!script || !script.enabled) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const campaign = await this.db.campaigns.get(campaignEvent.campaignId);
    if (!campaign?.rulesetId) {
      return {
        success: false,
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error('Campaign or ruleset not found for event'),
      };
    }

    const hasHandler = this.extractEventHandler(script.sourceCode, eventType) !== null;
    if (!hasHandler) {
      return {
        success: true,
        value: null,
        announceMessages: [],
        logMessages: [],
      };
    }

    const context: ScriptExecutionContext = {
      ownerId: characterId,
      rulesetId: campaign.rulesetId,
      db: this.db,
      scriptId: script.id,
      triggerType: 'attribute_change',
      roll,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(actionId, ownerId, targetIdForAction, eventTypeForAction, roll),
    };

    const result = await this.executeEventHandlerByCall(script.sourceCode, eventType, context);

    return result;
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

// Call the event handler
if ${eventType}:
    ${eventType}()
`;

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, fullScript)
      : await new ScriptRunner(context).run(fullScript);

    if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
      await this.onAttributesModified(
        result.modifiedAttributeIds,
        context.ownerId,
        context.rulesetId,
      );
    }

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
 * @param roll - Optional function to handle dice rolls
 * @returns Execution result
 */
export async function executeItemEvent(
  db: DB,
  itemId: string,
  characterId: string,
  eventType: 'on_equip' | 'on_unequip' | 'on_consume',
  roll?: RollFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeItemEvent(itemId, characterId, eventType, roll);
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

/**
 * Execute an archetype event (on_add or on_remove).
 */
export async function executeArchetypeEvent(
  db: DB,
  archetypeId: string,
  characterId: string,
  eventType: 'on_add' | 'on_remove',
  roll?: RollFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeArchetypeEvent(archetypeId, characterId, eventType, roll);
}

/**
 * Execute the ruleset's Character Loader script for a character (at first creation only).
 */
export async function executeCharacterLoader(
  db: DB,
  characterId: string,
  rulesetId: string,
  roll?: RollFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeCharacterLoader(characterId, rulesetId, roll);
}

/**
 * Execute a campaign event script (on_enter, on_leave) when a character moves onto/off a tile.
 */
export async function executeCampaignEventEvent(
  db: DB,
  campaignEventId: string,
  characterId: string,
  eventType: 'on_enter' | 'on_leave',
  roll?: RollFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeCampaignEventEvent(campaignEventId, characterId, eventType, roll);
}
