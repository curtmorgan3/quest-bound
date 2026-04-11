import type { DB } from '@/stores/db/hooks/types';
import type {
  CampaignEvent,
  CampaignEventParamValue,
  PromptFn,
  PromptInputFn,
  PromptMultipleFn,
  RollFn,
  RollSplitFn,
  Script,
  ScriptParameterDefinition,
  ScriptParamValue,
  SelectCharacterFn,
  SelectCharactersFn,
} from '@/types';
import type { ASTNode } from '../interpreter/ast';
import { functionDefToExecutableSource } from '../interpreter/ast-to-source';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import type { ExecuteItemEventFn } from '../runtime/proxies/action-proxy';
import type { ScriptExecutionContext, ScriptExecutionResult } from '../runtime/script-runner';
import { ScriptRunner } from '../runtime/script-runner';
import type { ScriptGameLogEntry } from '../runtime/script-game-log';
import {
  getEventInvocationLogMessage,
  persistEventInvocationLog,
  persistScriptLogs,
} from '../script-logs';

/**
 * Type of event handler.
 */
export type EventHandlerType =
  | 'on_equip'
  | 'on_unequip'
  | 'on_consume'
  | 'on_activate'
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
  /** Interleaved script log timeline when execution used ScriptRunner (for game log persistence). */
  gameLogTimeline?: ScriptGameLogEntry[];
  error?: Error;
  /** DB script row id when execution targeted a persisted script (for error UI). */
  scriptId?: string;
  /** Ruleset attribute IDs modified by the script (for UI animation). */
  modifiedAttributeIds?: string[];
  /** Optional list of character/page pairs that should be navigated to in the UI after execution. */
  navigateTargets?: { characterId: string; pageId: string }[];
  /** Component animations to trigger in the sheet viewer (by referenceLabel). */
  componentAnimations?: Array<{ characterId: string; referenceLabel: string; animation: string }>;
  /**
   * When set, item_event user log() rows should use this same `batchTimestamp` (and sequence ≥ 1)
   * as the invocation auto-log so both sort as one run in the game log.
   */
  scriptLogBatchTimestamp?: number;
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
 * Build the helper object exposed to QBScript as `params` for scripts run from campaign events.
 * Values are resolved from Script.parameters (definitions + defaults) plus per-event overrides on CampaignEvent.
 */
export function createCampaignEventParamsHelper(
  script: Script,
  event: CampaignEvent,
): {
  get: (name: string) => CampaignEventParamValue;
} {
  const coerceNumber = (value: ScriptParamValue): number | null => {
    if (value == null) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  };

  const coerceBoolean = (value: ScriptParamValue): boolean | null => {
    if (value == null) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const trimmed = String(value).trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'y') return true;
    if (trimmed === 'false' || trimmed === '0' || trimmed === 'no' || trimmed === 'n') return false;
    return null;
  };

  const definitions: ScriptParameterDefinition[] = script.parameters ?? [];
  const eventValues: Record<string, ScriptParamValue> = event.parameterValues ?? {};

  const byLabel = new Map<string, CampaignEventParamValue>();

  for (const def of definitions) {
    const trimmedLabel = (def.label ?? '').trim();
    if (!trimmedLabel) continue;
    const key = trimmedLabel.toLowerCase();

    const hasOverride = Object.prototype.hasOwnProperty.call(eventValues, def.id);
    const rawValue: ScriptParamValue =
      hasOverride && eventValues[def.id] !== undefined
        ? eventValues[def.id]!
        : (def.defaultValue ?? null);

    let coerced: CampaignEventParamValue = null;
    if (def.type === 'string') {
      coerced = rawValue == null ? null : String(rawValue);
    } else if (def.type === 'number') {
      coerced = coerceNumber(rawValue);
    } else if (def.type === 'boolean') {
      coerced = coerceBoolean(rawValue);
    } else {
      // Future-proof: fall back to raw value if an unknown type is introduced.
      coerced = (rawValue ?? null) as CampaignEventParamValue;
    }

    byLabel.set(key, coerced);
  }

  return {
    get: (name: string): CampaignEventParamValue => {
      const entry = byLabel.get(name.trim().toLowerCase());
      return entry ?? null;
    },
  };
}

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

  /** Resolve character id to display name for event invocation logs. */
  private async getCharacterName(characterId: string): Promise<string> {
    const character = await this.db.characters?.get?.(characterId);
    return (character as { name?: string } | undefined)?.name ?? 'Someone';
  }

  /**
   * QBScript `item.equip()` / `item.unequip()` — runs the same item event pipeline as the UI.
   */
  private bindExecuteItemEventForScriptContext(
    roll?: RollFn,
    campaignId?: string,
    rollSplit?: RollSplitFn,
    prompt?: PromptFn,
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
    campaignSceneId?: string,
    promptMultiple?: PromptMultipleFn,
    promptInput?: PromptInputFn,
    createRollForCharacter?: (characterId: string) => RollFn,
    createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
    sheetPreviewRulesetWindowId?: string | null,
  ): ExecuteItemEventFn {
    return async (itemId, ownerCharacterId, eventType, inventoryItemInstanceId) => {
      const r = await this.executeItemEvent(
        itemId,
        ownerCharacterId,
        eventType,
        roll,
        campaignId,
        inventoryItemInstanceId,
        rollSplit,
        prompt,
        selectCharacter,
        selectCharacters,
        campaignSceneId,
        promptMultiple,
        promptInput,
        createRollForCharacter,
        createRollSplitForCharacter,
        sheetPreviewRulesetWindowId,
      );
      return {
        success: r.success,
        value: r.value,
        announceMessages: r.announceMessages,
        logMessages: r.logMessages,
        error: r.error,
        componentAnimations: r.componentAnimations,
      };
    };
  }

  /**
   * Wrap selectCharacter/selectCharacters to record selected character(s) for event invocation log.
   * Returns wrapped fns and a promise that resolves to their display names after script runs.
   */
  private createSelectCharacterCollectors(
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
  ): {
    selectCharacter: SelectCharacterFn;
    selectCharacters: SelectCharactersFn;
    getCollectedTargetNames: () => Promise<string[]>;
  } {
    const collected: (string | { name?: string } | null)[] = [];
    const wrappedSelectCharacter: SelectCharacterFn = async (title?, description?) => {
      const result = await (selectCharacter?.(title, description) ?? Promise.resolve(null));
      if (result != null) collected.push(result);
      return result;
    };
    const wrappedSelectCharacters: SelectCharactersFn = async (title?, description?) => {
      const result = await (selectCharacters?.(title, description) ?? Promise.resolve([]));
      const list = Array.isArray(result) ? result : [];
      list.forEach((r) => collected.push(r));
      return result;
    };
    const getCollectedTargetNames = async (): Promise<string[]> => {
      const names: string[] = [];
      for (const item of collected) {
        if (item == null) continue;
        if (typeof item === 'string') {
          names.push(await this.getCharacterName(item));
        } else if (typeof item === 'object' && item !== null && 'name' in item) {
          names.push(String((item as { name?: string }).name ?? 'Someone'));
        }
      }
      return names;
    };
    return {
      selectCharacter: wrappedSelectCharacter,
      selectCharacters: wrappedSelectCharacters,
      getCollectedTargetNames,
    };
  }

  /**
   * Execute an item event handler.
   * @param itemId - ID of the item (ruleset item id)
   * @param characterId - ID of the character
   * @param eventType - Type of event (on_equip, on_unequip, on_consume, on_activate, on_add, on_remove)
   * @param roll - Optional function to handle dice rolling
   * @param campaignId - Optional campaign id for associating script execution with a campaign
   * @param inventoryItemInstanceId - When set, Self in the item script refers to this inventory item instance instead of the first match by name.
   * @returns Execution result
   */
  async executeItemEvent(
    itemId: string,
    characterId: string,
    eventType: 'on_equip' | 'on_unequip' | 'on_consume' | 'on_activate' | 'on_add' | 'on_remove',
    roll?: RollFn,
    campaignId?: string,
    inventoryItemInstanceId?: string,
    rollSplit?: RollSplitFn,
    prompt?: PromptFn,
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
    campaignSceneId?: string,
    promptMultiple?: PromptMultipleFn,
    promptInput?: PromptInputFn,
    createRollForCharacter?: (characterId: string) => RollFn,
    createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
    sheetPreviewRulesetWindowId?: string | null,
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

    const {
      selectCharacter: selectCharacterWrapped,
      selectCharacters: selectCharactersWrapped,
      getCollectedTargetNames,
    } = this.createSelectCharacterCollectors(selectCharacter, selectCharacters);

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
      inventoryItemInstanceId,
      campaignId,
      campaignSceneId,
      roll,
      rollSplit,
      createRollForCharacter,
      createRollSplitForCharacter,
      prompt,
      promptMultiple,
      promptInput,
      selectCharacter: selectCharacterWrapped,
      selectCharacters: selectCharactersWrapped,
      enableScriptGameLogRolls: true,
      sheetPreviewRulesetWindowId: sheetPreviewRulesetWindowId ?? undefined,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(
          actionId,
          ownerId,
          targetIdForAction,
          eventTypeForAction,
          roll,
          campaignId,
          undefined,
          rollSplit,
          prompt,
          selectCharacterWrapped,
          selectCharactersWrapped,
          campaignSceneId,
          promptMultiple,
          promptInput,
          createRollForCharacter,
          createRollSplitForCharacter,
          sheetPreviewRulesetWindowId,
        ),
      executeItemEvent: this.bindExecuteItemEventForScriptContext(
        roll,
        campaignId,
        rollSplit,
        prompt,
        selectCharacterWrapped,
        selectCharactersWrapped,
        campaignSceneId,
        promptMultiple,
        promptInput,
        createRollForCharacter,
        createRollSplitForCharacter,
        sheetPreviewRulesetWindowId,
      ),
    };

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, scriptToRun)
      : await new ScriptRunner(context).run(scriptToRun);

    const targetNames = await getCollectedTargetNames();
    const ownerName = await this.getCharacterName(characterId);
    const message = getEventInvocationLogMessage('item', {
      ownerName,
      entityName: item.title,
      eventName: eventType,
      targetNames: targetNames.length > 0 ? targetNames : undefined,
    });
    const batchTimestamp = Date.now();
    await persistEventInvocationLog(
      this.db,
      {
        rulesetId: item.rulesetId,
        scriptId: script.id,
        characterId,
        campaignId: campaignId ?? null,
        context: 'item_event',
        batchTimestamp,
        sequenceStart: 0,
      },
      message,
    );

    if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
      await this.onAttributesModified(result.modifiedAttributeIds, characterId, item.rulesetId);
    }

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      gameLogTimeline: result.gameLogTimeline,
      error: result.error,
      scriptId: script.id,
      modifiedAttributeIds: result.modifiedAttributeIds,
      navigateTargets: result.navigateTargets,
      componentAnimations: result.componentAnimations,
      scriptLogBatchTimestamp: batchTimestamp,
    };
  }

  /**
   * Execute an action event handler.
   * @param actionId - ID of the action
   * @param characterId - ID of the character
   * @param targetId - Optional ID of target character
   * @param eventType - Type of event (on_activate, on_deactivate)
   * @param roll - Function to handle dice rolling
   * @param campaignId - Optional campaign id for associating script execution with a campaign
   * @param callerInventoryItemInstanceId - When set (action fired from item context menu), Caller = itemInstanceProxy of this inventory item. When unset, Caller = Owner.
   * @returns Execution result
   */
  async executeActionEvent(
    actionId: string,
    characterId: string,
    targetId: string | null,
    eventType: 'on_activate' | 'on_deactivate',
    roll?: RollFn,
    campaignId?: string,
    callerInventoryItemInstanceId?: string,
    rollSplit?: RollSplitFn,
    prompt?: PromptFn,
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
    campaignSceneId?: string,
    promptMultiple?: PromptMultipleFn,
    promptInput?: PromptInputFn,
    createRollForCharacter?: (characterId: string) => RollFn,
    createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
    sheetPreviewRulesetWindowId?: string | null,
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

    const {
      selectCharacter: selectCharacterWrapped,
      selectCharacters: selectCharactersWrapped,
      getCollectedTargetNames,
    } = this.createSelectCharacterCollectors(selectCharacter, selectCharacters);

    // Run full script so all definitions are in scope, then call the handler
    const scriptToRun = this.buildScriptWithHandlerCall(script.sourceCode, eventType);
    actionEventDepth++;

    // Collect componentAnimations from any nested Owner.Action().activate() calls so they
    // are returned alongside this action's own animations.
    const nestedAnimations: Array<{
      characterId: string;
      referenceLabel: string;
      animation: string;
    }> = [];

    try {
      const context: ScriptExecutionContext = {
        ownerId: characterId,
        rulesetId: action.rulesetId,
        db: this.db,
        scriptId: script.id,
        triggerType: 'action_click',
        entityType: 'action',
        entityId: action.id,
        campaignId,
        roll,
        rollSplit,
        createRollForCharacter,
        createRollSplitForCharacter,
        prompt,
        promptMultiple,
        promptInput,
        selectCharacter: selectCharacterWrapped,
        selectCharacters: selectCharactersWrapped,
enableScriptGameLogRolls: true,
        callerInventoryItemInstanceId,
        campaignSceneId,
        sheetPreviewRulesetWindowId: sheetPreviewRulesetWindowId ?? undefined,
        executeItemEvent: this.bindExecuteItemEventForScriptContext(
          roll,
          campaignId,
          rollSplit,
          prompt,
          selectCharacterWrapped,
          selectCharactersWrapped,
          campaignSceneId,
          promptMultiple,
          promptInput,
          createRollForCharacter,
          createRollSplitForCharacter,
          sheetPreviewRulesetWindowId,
        ),
        // Only allow Owner.Action().activate() at top level to avoid infinite re-entrancy
        ...(actionEventDepth === 1 && {
          executeActionEvent: async (actionId, ownerId, targetIdForAction, eventTypeForAction) => {
            const r = await this.executeActionEvent(
              actionId,
              ownerId,
              targetIdForAction,
              eventTypeForAction,
              roll,
              campaignId,
              undefined, // Nested call: Caller = Owner
              rollSplit,
              prompt,
              selectCharacterWrapped,
              selectCharactersWrapped,
              campaignSceneId,
              promptMultiple,
              promptInput,
              createRollForCharacter,
              createRollSplitForCharacter,
              sheetPreviewRulesetWindowId,
            );
            for (const entry of r.componentAnimations ?? []) {
              nestedAnimations.push(entry);
            }
            return r;
          },
        }),
      };

      const result = this.runScriptForTest
        ? await this.runScriptForTest(context, scriptToRun)
        : await new ScriptRunner(context).run(scriptToRun);

      const actionTargetNames = targetId ? [await this.getCharacterName(targetId)] : [];
      const selectedNames = await getCollectedTargetNames();
      const targetNames = [...actionTargetNames, ...selectedNames];
      const ownerName = await this.getCharacterName(characterId);
      const message = getEventInvocationLogMessage('action', {
        ownerName,
        entityName: action.title,
        eventName: eventType,
        targetNames: targetNames.length > 0 ? targetNames : undefined,
      });
      const batchTimestamp = Date.now();
      await persistEventInvocationLog(
        this.db,
        {
          rulesetId: action.rulesetId,
          scriptId: script.id,
          characterId,
          campaignId: campaignId ?? null,
          context: 'action_event',
          batchTimestamp,
          sequenceStart: 0,
        },
        message,
      );

      if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
        await this.onAttributesModified(result.modifiedAttributeIds, characterId, action.rulesetId);
      }

      await persistScriptLogs(this.db, {
        rulesetId: action.rulesetId,
        scriptId: script.id,
        characterId,
        gameLogTimeline: result.gameLogTimeline,
        logMessages: result.logMessages,
        context: 'action_event',
        campaignId: campaignId ?? null,
        batchTimestamp,
        sequenceStart: 1,
      });

      return {
        success: !result.error,
        value: result.value,
        announceMessages: result.announceMessages,
        logMessages: result.logMessages,
        gameLogTimeline: result.gameLogTimeline,
        error: result.error,
        scriptId: script.id,
        modifiedAttributeIds: result.modifiedAttributeIds,
        navigateTargets: result.navigateTargets,
        componentAnimations: [...(result.componentAnimations ?? []), ...nestedAnimations],
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
    campaignId?: string,
    rollSplit?: RollSplitFn,
    prompt?: PromptFn,
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
    campaignSceneId?: string,
    promptMultiple?: PromptMultipleFn,
    promptInput?: PromptInputFn,
    createRollForCharacter?: (characterId: string) => RollFn,
    createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
    sheetPreviewRulesetWindowId?: string | null,
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
      campaignId,
      campaignSceneId,
      roll,
      rollSplit,
      createRollForCharacter,
      createRollSplitForCharacter,
      prompt,
      promptMultiple,
      promptInput,
      selectCharacter,
      selectCharacters,
      enableScriptGameLogRolls: true,
      sheetPreviewRulesetWindowId: sheetPreviewRulesetWindowId ?? undefined,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(
          actionId,
          ownerId,
          targetIdForAction,
          eventTypeForAction,
          roll,
          campaignId,
          undefined,
          rollSplit,
          prompt,
          selectCharacter,
          selectCharacters,
          campaignSceneId,
          promptMultiple,
          promptInput,
          createRollForCharacter,
          createRollSplitForCharacter,
          sheetPreviewRulesetWindowId,
        ),
      executeItemEvent: this.bindExecuteItemEventForScriptContext(
        roll,
        campaignId,
        rollSplit,
        prompt,
        selectCharacter,
        selectCharacters,
        campaignSceneId,
        promptMultiple,
        promptInput,
        createRollForCharacter,
        createRollSplitForCharacter,
        sheetPreviewRulesetWindowId,
      ),
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

    await persistScriptLogs(this.db, {
      rulesetId: archetype.rulesetId,
      scriptId: script.id,
      characterId,
      gameLogTimeline: result.gameLogTimeline,
      logMessages: result.logMessages,
      context: 'archetype_event',
      campaignId: campaignId ?? null,
    });

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      gameLogTimeline: result.gameLogTimeline,
      error: result.error,
      scriptId: script.id,
      navigateTargets: result.navigateTargets,
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
    rollSplit?: RollSplitFn,
    prompt?: PromptFn,
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
    campaignId?: string | null,
    promptMultiple?: PromptMultipleFn,
    promptInput?: PromptInputFn,
    createRollForCharacter?: (characterId: string) => RollFn,
    createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
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
      rollSplit,
      createRollForCharacter,
      createRollSplitForCharacter,
      prompt,
      promptMultiple,
      promptInput,
      selectCharacter,
      selectCharacters,
      enableScriptGameLogRolls: true,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(
          actionId,
          ownerId,
          targetIdForAction,
          eventTypeForAction,
          roll,
          undefined,
          undefined,
          rollSplit,
          prompt,
          selectCharacter,
          selectCharacters,
          undefined,
          promptMultiple,
          promptInput,
          createRollForCharacter,
          createRollSplitForCharacter,
          undefined,
        ),
      executeItemEvent: this.bindExecuteItemEventForScriptContext(
        roll,
        undefined,
        rollSplit,
        prompt,
        selectCharacter,
        selectCharacters,
        undefined,
        promptMultiple,
        promptInput,
        createRollForCharacter,
        createRollSplitForCharacter,
        undefined,
      ),
    };

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, script.sourceCode)
      : await new ScriptRunner(context).run(script.sourceCode);

    if (!result.error && result.modifiedAttributeIds?.length && this.onAttributesModified) {
      await this.onAttributesModified(result.modifiedAttributeIds, characterId, rulesetId);
    }

    await persistScriptLogs(this.db, {
      rulesetId,
      scriptId: script.id,
      characterId,
      gameLogTimeline: result.gameLogTimeline,
      logMessages: result.logMessages,
      context: 'character_load',
      campaignId: campaignId ?? null,
      scriptName: script.name,
    });

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      gameLogTimeline: result.gameLogTimeline,
      error: result.error,
      scriptId: script.id,
      navigateTargets: result.navigateTargets,
    };
  }

  /**
   * Execute a campaign event's script handler (e.g. on_activate when a scene event is triggered).
   * Uses campaignEventId and campaignSceneId; location-based campaign events are deprecated.
   */
  async executeCampaignEventEvent(
    campaignEventId: string,
    campaignSceneId: string,
    eventType: 'on_enter' | 'on_leave' | 'on_activate',
    characterId?: string | null,
    roll?: RollFn,
    rollSplit?: RollSplitFn,
    prompt?: PromptFn,
    selectCharacter?: SelectCharacterFn,
    selectCharacters?: SelectCharactersFn,
    /** @deprecated campaignEventSceneId is ignored; CampaignEvent.sceneId is used instead. */
    _campaignEventSceneId?: string | null,
    promptMultiple?: PromptMultipleFn,
    promptInput?: PromptInputFn,
    createRollForCharacter?: (characterId: string) => RollFn,
    createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
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

    // Resolve parameter helper from Script.parameters + CampaignEvent.parameterValues.
    const paramsHelper = createCampaignEventParamsHelper(
      script as Script,
      campaignEvent as CampaignEvent,
    );

    const context: ScriptExecutionContext = {
      ...(characterId ? { ownerId: characterId } : {}),
      rulesetId: campaign.rulesetId,
      db: this.db,
      scriptId: script.id,
      triggerType: 'attribute_change',
      entityType: script.entityType,
      entityId: script.entityId ?? undefined,
      campaignId: campaignEvent.campaignId,
      campaignSceneId: (campaignEvent as CampaignEvent).sceneId ?? campaignSceneId,
      campaignEvent,
      roll,
      rollSplit,
      createRollForCharacter,
      createRollSplitForCharacter,
      prompt,
      promptMultiple,
      promptInput,
      selectCharacter,
      selectCharacters,
      enableScriptGameLogRolls: true,
      executeActionEvent: (actionId, ownerId, targetIdForAction, eventTypeForAction) =>
        this.executeActionEvent(
          actionId,
          ownerId,
          targetIdForAction,
          eventTypeForAction,
          roll,
          campaignEvent.campaignId,
          undefined,
          rollSplit,
          prompt,
          selectCharacter,
          selectCharacters,
          (campaignEvent as CampaignEvent).sceneId ?? campaignSceneId,
          promptMultiple,
          promptInput,
          createRollForCharacter,
          createRollSplitForCharacter,
          undefined,
        ),
      executeItemEvent: this.bindExecuteItemEventForScriptContext(
        roll,
        campaignEvent.campaignId,
        rollSplit,
        prompt,
        selectCharacter,
        selectCharacters,
        (campaignEvent as CampaignEvent).sceneId ?? campaignSceneId,
        promptMultiple,
        promptInput,
        createRollForCharacter,
        createRollSplitForCharacter,
        undefined,
      ),
      params: paramsHelper,
    };

    const result = this.runScriptForTest
      ? await this.runScriptForTest(context, script.sourceCode)
      : await new ScriptRunner(context).run(script.sourceCode);

    if (
      !result.error &&
      result.modifiedAttributeIds?.length &&
      this.onAttributesModified &&
      characterId
    ) {
      await this.onAttributesModified(result.modifiedAttributeIds, characterId, campaign.rulesetId);
    }

    await persistScriptLogs(this.db, {
      rulesetId: campaign.rulesetId,
      scriptId: script.id,
      characterId: characterId ?? null,
      gameLogTimeline: result.gameLogTimeline,
      logMessages: result.logMessages,
      context: 'campaign_event',
      campaignId: campaignEvent.campaignId,
    });

    return {
      success: !result.error,
      value: result.value,
      announceMessages: result.announceMessages,
      logMessages: result.logMessages,
      gameLogTimeline: result.gameLogTimeline,
      error: result.error,
      scriptId: script.id,
    };
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

    if (
      !result.error &&
      result.modifiedAttributeIds?.length &&
      this.onAttributesModified &&
      context.ownerId
    ) {
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
      gameLogTimeline: result.gameLogTimeline,
      error: result.error,
      scriptId: context.scriptId,
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
  eventType: 'on_equip' | 'on_unequip' | 'on_consume' | 'on_add' | 'on_remove',
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
  rollSplit?: RollSplitFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeActionEvent(
    actionId,
    characterId,
    targetId,
    eventType,
    roll,
    undefined,
    undefined,
    rollSplit,
  );
}

/**
 * Execute an archetype event (on_add or on_remove).
 * Pass campaignId and campaignSceneId when in campaign scene context so scripts get Scene accessor.
 */
export async function executeArchetypeEvent(
  db: DB,
  archetypeId: string,
  characterId: string,
  eventType: 'on_add' | 'on_remove',
  roll?: RollFn,
  campaignId?: string,
  rollSplit?: RollSplitFn,
  campaignSceneId?: string,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeArchetypeEvent(
    archetypeId,
    characterId,
    eventType,
    roll,
    campaignId,
    rollSplit,
    undefined,
    undefined,
    undefined,
    campaignSceneId,
  );
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
 * Execute the script attached to a campaign scene event (on_enter, on_leave, on_activate).
 * Uses CampaignEvent and CampaignScene; location-based events are deprecated.
 */
export async function executeCampaignEventEvent(
  db: DB,
  campaignEventId: string,
  campaignSceneId: string,
  eventType: 'on_enter' | 'on_leave' | 'on_activate',
  characterId: string,
  roll?: RollFn,
): Promise<EventHandlerResult> {
  const executor = new EventHandlerExecutor(db);
  return executor.executeCampaignEventEvent(
    campaignEventId,
    campaignSceneId,
    eventType,
    characterId,
    roll,
    undefined,
    undefined,
  );
}
