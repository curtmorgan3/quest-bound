/**
 * QBScript Web Worker
 *
 * Handles script execution in a separate thread to keep the UI responsive.
 * Communicates with the main thread via a signal-based message protocol.
 */

import type { DB } from '@/stores/db/hooks/types';
import { dbSchemaV50, dbSchemaVersion } from '@/stores/db/schema';
import type {
  PromptFn,
  RollFn,
  RollSplitFn,
  SelectCharacterFn,
  SelectCharactersFn,
} from '@/types';
import Dexie from 'dexie';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { persistScriptLogs } from '../script-logs';
import {
  EventHandlerExecutor,
  type OnAttributesModifiedFn,
} from '../reactive/event-handler-executor';
import { ReactiveExecutor } from '../reactive/reactive-executor';
import { ScriptRunner, type ScriptExecutionContext } from '../runtime/script-runner';
import { prepareForStructuredClone } from '../runtime/structured-clone-safe';
import type {
  AttributeChangedPayload,
  AttributesModifiedByScriptPayload,
  ExecuteScriptPayload,
  MainToWorkerSignal,
  WorkerToMainSignal,
} from './signals';

// ============================================================================
// Database Setup
// ============================================================================

// Initialize Dexie database in worker context
// Note: This MUST match the schema from @/stores/db/db.ts
const db = new Dexie('qbdb') as DB;

db.version(dbSchemaVersion).stores(dbSchemaV50);

// ============================================================================
// Worker State
// ============================================================================

let reactiveExecutor: ReactiveExecutor | null = null;
let messagePort: MessagePort | null = null;

// ============================================================================
// Roll bridge (worker requests roll from main thread; main thread responds)
// ============================================================================

const rollBridge = {
  pending: new Map<string, { resolve: (value: number) => void; reject: (err: Error) => void }>(),
  pendingSplit: new Map<
    string,
    { resolve: (value: number[]) => void; reject: (err: Error) => void }
  >(),
  requestRoll(expression: string, executionRequestId: string, rerollMessage?: string): Promise<number> {
    const rollRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<number>((resolve, reject) => {
      this.pending.set(rollRequestId, { resolve, reject });
      sendSignal({
        type: 'ROLL_REQUEST',
        payload: { executionRequestId, rollRequestId, expression, rerollMessage },
      });
    });
  },
  resolveRoll(rollRequestId: string, value?: number, error?: string): void {
    const entry = this.pending.get(rollRequestId);
    if (!entry) return;
    this.pending.delete(rollRequestId);
    if (error != null) {
      entry.reject(new Error(error));
    } else {
      entry.resolve(value ?? 0);
    }
  },
  requestRollSplit(
    expression: string,
    executionRequestId: string,
    rerollMessage?: string,
  ): Promise<number[]> {
    const rollRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<number[]>((resolve, reject) => {
      this.pendingSplit.set(rollRequestId, { resolve, reject });
      sendSignal({
        type: 'ROLL_SPLIT_REQUEST',
        payload: { executionRequestId, rollRequestId, expression, rerollMessage },
      });
    });
  },
  resolveRollSplit(rollRequestId: string, value?: number[], error?: string): void {
    const entry = this.pendingSplit.get(rollRequestId);
    if (!entry) return;
    this.pendingSplit.delete(rollRequestId);
    if (error != null) {
      entry.reject(new Error(error));
    } else {
      entry.resolve(value ?? []);
    }
  },
};

// ============================================================================
// Prompt bridge (worker requests prompt modal from main thread; main responds with choice)
// ============================================================================

const promptBridge = {
  pending: new Map<string, { resolve: (value: string) => void; reject: (err: Error) => void }>(),
  requestPrompt(
    msg: string,
    choices: string[],
    executionRequestId: string,
  ): Promise<string> {
    const promptRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(promptRequestId, { resolve, reject });
      sendSignal({
        type: 'PROMPT_REQUEST',
        payload: { executionRequestId, promptRequestId, msg, choices },
      });
    });
  },
  resolvePrompt(promptRequestId: string, value?: string, error?: string): void {
    const entry = this.pending.get(promptRequestId);
    if (!entry) return;
    this.pending.delete(promptRequestId);
    if (error != null) {
      entry.reject(new Error(error));
    } else {
      entry.resolve(value ?? '');
    }
  },
};

// ============================================================================
// Character selection bridge (worker requests character picker from main thread)
// ============================================================================

const characterSelectBridge = {
  pending: new Map<
    string,
    {
      resolve: (value: string[]) => void;
      reject: (err: Error) => void;
    }
  >(),
  requestSelect(
    mode: 'single' | 'multi',
    title: string | undefined,
    description: string | undefined,
    executionRequestId: string,
    rulesetId: string,
    campaignId?: string,
  ): Promise<string[]> {
    const selectRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<string[]>((resolve, reject) => {
      this.pending.set(selectRequestId, { resolve, reject });
      sendSignal({
        type: 'SELECT_CHARACTER_REQUEST',
        payload: {
          executionRequestId,
          selectRequestId,
          mode,
          title,
          description,
          rulesetId,
          campaignId,
        },
      });
    });
  },
  resolve(selectRequestId: string, characterIds?: string[], error?: string): void {
    const entry = this.pending.get(selectRequestId);
    if (!entry) return;
    this.pending.delete(selectRequestId);
    if (error != null) {
      entry.reject(new Error(error));
    } else {
      entry.resolve(characterIds ?? []);
    }
  },
};

// ============================================================================
// Message Handling
// ============================================================================

/**
 * Send a signal to the main thread
 */
function sendSignal(signal: WorkerToMainSignal): void {
  if (messagePort) {
    messagePort.postMessage(signal);
  } else {
    self.postMessage(signal);
  }
}

/**
 * Handle incoming signals from the main thread
 */
async function handleSignal(signal: MainToWorkerSignal): Promise<void> {
  try {
    switch (signal.type) {
      case 'EXECUTE_SCRIPT':
        await handleExecuteScript(signal.payload);
        break;

      case 'BUILD_DEPENDENCY_GRAPH':
        await handleBuildDependencyGraph(signal.payload);
        break;

      case 'VALIDATE_SCRIPT':
        await handleValidateScript(signal.payload);
        break;

      case 'ATTRIBUTE_CHANGED':
        await handleAttributeChanged(signal.payload);
        break;

      case 'RUN_INITIAL_ATTRIBUTE_SYNC':
        await handleInitialAttributeSync(signal.payload);
        break;

      case 'EXECUTE_ACTION':
        await handleExecuteAction(signal.payload);
        break;

      case 'EXECUTE_ACTION_EVENT':
        await handleExecuteActionEvent(signal.payload);
        break;

      case 'EXECUTE_ITEM_EVENT':
        await handleExecuteItemEvent(signal.payload);
        break;

      case 'EXECUTE_ARCHETYPE_EVENT':
        await handleExecuteArchetypeEvent(signal.payload);
        break;

      case 'EXECUTE_CAMPAIGN_EVENT_EVENT':
        await handleExecuteCampaignEventEvent(signal.payload);
        break;

      case 'CLEAR_GRAPH':
        handleClearGraph(signal.payload);
        break;

      case 'ROLL_RESPONSE': {
        const { rollRequestId, value, error } = signal.payload;
        rollBridge.resolveRoll(rollRequestId, value, error);
        break;
      }

      case 'ROLL_SPLIT_RESPONSE': {
        const { rollRequestId, value, error } = signal.payload;
        rollBridge.resolveRollSplit(rollRequestId, value, error);
        break;
      }

      case 'PROMPT_RESPONSE': {
        const { promptRequestId, value, error } = signal.payload;
        promptBridge.resolvePrompt(promptRequestId, value, error);
        break;
      }

      case 'SELECT_CHARACTER_RESPONSE': {
        const { selectRequestId, characterIds, error } = signal.payload;
        characterSelectBridge.resolve(selectRequestId, characterIds, error);
        break;
      }

      default:
        console.error('Unknown signal type:', (signal as any).type);
    }
  } catch (error) {
    console.error('Error handling signal:', error);
    sendSignal({
      type: 'WORKER_ERROR',
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}

// ============================================================================
// Reactive trigger for attribute changes (used by EventHandlerExecutor and handleExecuteScript)
// ============================================================================

function createOnAttributesModified(
  rollFn: RollFn,
  rollSplitFn: RollSplitFn,
  getExecutor: () => EventHandlerExecutor,
  /** When provided, collect all attribute IDs modified by script (direct + reactive) for UI animation. */
  getModifiedIdsCollector?: () => Set<string>,
  promptFn?: PromptFn,
  selectCharacterFn?: SelectCharacterFn,
  selectCharactersFn?: SelectCharactersFn,
): OnAttributesModifiedFn {
  return async (attributeIds: string[], characterId: string, rulesetId: string) => {
    if (attributeIds.length === 0) return;
    const collector = getModifiedIdsCollector?.();
    if (collector) {
      attributeIds.forEach((id) => collector.add(id));
    }
    if (!reactiveExecutor) {
      reactiveExecutor = new ReactiveExecutor(db);
    }
    const executor = getExecutor();
    for (const attributeId of attributeIds) {
      try {
        const reactiveResult = await reactiveExecutor.onAttributeChange(
          attributeId,
          characterId,
          rulesetId,
          {
            roll: rollFn,
            rollSplit: rollSplitFn,
            prompt: promptFn,
            selectCharacter: selectCharacterFn,
            selectCharacters: selectCharactersFn,
            executeActionEvent: (actionId, cId, targetId, eventType) =>
              executor.executeActionEvent(
                actionId,
                cId,
                targetId,
                eventType,
                rollFn,
                undefined,
                undefined,
                rollSplitFn,
                promptFn,
                selectCharacterFn,
                selectCharactersFn,
              ),
          },
        );
        if (collector && reactiveResult.modifiedAttributeIds?.length) {
          reactiveResult.modifiedAttributeIds.forEach((id) => collector.add(id));
        }
      } catch (e) {
        console.warn('[QBScript] Reactive execution failed for attribute', attributeId, e);
      }
    }
  };
}

// ============================================================================
// Reactive chain helper
// ============================================================================

/** Max distinct attributes to process in one reactive chain (prevents runaway / huge graphs). */
const MAX_ATTRIBUTES_IN_REACTIVE_CHAIN = 100;

/** Max wall-clock time (ms) for the entire reactive chain (prevents long-running cascades). */
const REACTIVE_CHAIN_TIME_LIMIT_MS = 15_000;

/**
 * Run the full reactive chain for a set of attribute IDs. When an attribute script
 * modifies another attribute, scripts that depend on the modified attribute must
 * run too. This helper repeatedly calls onAttributeChange for each modified ID
 * until no new attributes are modified (so e.g. a -> b -> c all refire).
 *
 * Safeguards: each attribute is processed at most once (no infinite A→B→A loops),
 * and we cap the number of attributes processed and total time to avoid runaway chains.
 */
async function runReactiveChainForModifiedAttributes(
  initialAttributeIds: string[],
  characterId: string,
  rulesetId: string,
  reactiveOptions: Parameters<ReactiveExecutor['onAttributeChange']>[3],
): Promise<{
  allModifiedIds: string[];
  scriptsExecuted: string[];
  executionCount: number;
  lastError?: ReactiveExecutionResult['error'];
  truncated?: boolean;
}> {
  if (!reactiveExecutor) {
    reactiveExecutor = new ReactiveExecutor(db);
  }
  const allModifiedIds = new Set<string>(initialAttributeIds);
  const scriptsExecuted: string[] = [];
  let executionCount = 0;
  const queue = [...initialAttributeIds];
  const processed = new Set<string>();
  const chainStartTime = Date.now();
  let truncated = false;

  while (queue.length > 0) {
    if (processed.size >= MAX_ATTRIBUTES_IN_REACTIVE_CHAIN) {
      console.warn(
        '[QBScript] Reactive chain truncated: max attributes reached',
        MAX_ATTRIBUTES_IN_REACTIVE_CHAIN,
        { characterId, rulesetId, processed: processed.size, queueRemaining: queue.length },
      );
      truncated = true;
      break;
    }
    if (Date.now() - chainStartTime > REACTIVE_CHAIN_TIME_LIMIT_MS) {
      console.warn(
        '[QBScript] Reactive chain truncated: time limit exceeded',
        REACTIVE_CHAIN_TIME_LIMIT_MS,
        'ms',
        { characterId, rulesetId, processed: processed.size },
      );
      truncated = true;
      break;
    }

    const attributeId = queue.shift()!;
    if (processed.has(attributeId)) continue;
    processed.add(attributeId);

    try {
      const result = await reactiveExecutor.onAttributeChange(
        attributeId,
        characterId,
        rulesetId,
        reactiveOptions,
      );
      if (!result.success) {
        return {
          allModifiedIds: Array.from(allModifiedIds),
          scriptsExecuted,
          executionCount,
          lastError: result.error as Error | undefined,
        };
      }
      scriptsExecuted.push(...(result.scriptsExecuted ?? []));
      executionCount += result.executionCount ?? 0;
      for (const id of result.modifiedAttributeIds ?? []) {
        allModifiedIds.add(id);
        if (!processed.has(id)) queue.push(id);
      }
    } catch (reactiveError) {
      console.warn(
        '[QBScript] Reactive execution failed for attribute',
        attributeId,
        reactiveError,
      );
    }
  }

  return {
    allModifiedIds: Array.from(allModifiedIds),
    scriptsExecuted,
    executionCount,
    ...(truncated ? { truncated: true } : {}),
  };
}

// Need ReactiveExecutionResult for the return type
type ReactiveExecutionResult = Awaited<ReturnType<ReactiveExecutor['onAttributeChange']>>;

// ============================================================================
// Signal Handlers
// ============================================================================

async function handleExecuteScript(payload: ExecuteScriptPayload): Promise<void> {
  const startTime = performance.now();
  const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
    rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
  const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
    rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
  const promptFn: PromptFn = (msg: string, choices: string[]) =>
    promptBridge.requestPrompt(msg, choices, payload.requestId);
  const selectCharacterFn: SelectCharacterFn = (title?: string, description?: string) =>
    characterSelectBridge
      .requestSelect('single', title, description, payload.requestId, payload.rulesetId)
      .then((ids) => (ids.length > 0 ? ids[0]! : null));
  const selectCharactersFn: SelectCharactersFn = (title?: string, description?: string) =>
    characterSelectBridge.requestSelect(
      'multi',
      title,
      description,
      payload.requestId,
      payload.rulesetId,
    );
  let executor: EventHandlerExecutor;
  executor = new EventHandlerExecutor(
    db,
    createOnAttributesModified(
      rollFn,
      rollSplitFn,
      () => executor,
      undefined,
      promptFn,
      selectCharacterFn,
      selectCharactersFn,
    ),
  );

  const onRollComplete = async (message: string) => {
    await persistScriptLogs(db, {
      rulesetId: payload.rulesetId,
      scriptId: payload.scriptId,
      characterId: payload.characterId,
      logMessages: [[message]],
      context: 'roll',
      campaignId: payload.campaignId ?? null,
      autoGenerated: true,
    });
  };

  try {
    const context: ScriptExecutionContext = {
      ownerId: payload.characterId,
      rulesetId: payload.rulesetId,
      db,
      scriptId: payload.scriptId,
      triggerType: payload.triggerType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      campaignId: payload.campaignId,
      roll: rollFn,
      rollSplit: rollSplitFn,
      prompt: promptFn,
      selectCharacter: selectCharacterFn,
      selectCharacters: selectCharactersFn,
      onRollComplete,
      executeActionEvent: (actionId, characterId, targetId, eventType) =>
        executor.executeActionEvent(
          actionId,
          characterId,
          targetId,
          eventType,
          rollFn,
          payload.campaignId,
          undefined,
          rollSplitFn,
          promptFn,
        ),
    };

    const runner = new ScriptRunner(context);
    const result = await runner.run(payload.sourceCode);

    const executionTime = performance.now() - startTime;

    const contextLabel = payload.triggerType ?? 'load';
    await persistScriptLogs(db, {
      rulesetId: payload.rulesetId,
      scriptId: payload.scriptId,
      characterId: payload.characterId,
      logMessages: result.logMessages,
      context: contextLabel,
      campaignId: payload.campaignId ?? null,
    });

    if (result.error) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error.message,
            line: (result.error as any).line,
            column: (result.error as any).column,
            stackTrace: result.error.stack,
          },
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
        },
      });
    } else {
      // Trigger reactive scripts for any attributes modified by this script (e.g. action script
      // changing an attribute). Run the full chain so when an attribute script changes another
      // attribute, downstream dependencies refire (e.g. a's script sets b -> c's script runs).
      const directModifiedIds = result.modifiedAttributeIds ?? [];
      let allModifiedIds = new Set<string>(directModifiedIds);
      if (directModifiedIds.length > 0) {
        const reactiveOptions = {
          executeActionEvent: (
            actionId: string,
            characterId: string,
            targetId: string | null,
            eventType: 'on_activate' | 'on_deactivate',
          ) =>
            executor.executeActionEvent(
              actionId,
              characterId,
              targetId,
              eventType,
              rollFn,
              undefined,
              undefined,
              rollSplitFn,
              promptFn,
            ),
          roll: rollFn,
          rollSplit: rollSplitFn,
          prompt: promptFn,
        };
        const chainResult = await runReactiveChainForModifiedAttributes(
          directModifiedIds,
          payload.characterId,
          payload.rulesetId,
          reactiveOptions,
        );
        chainResult.allModifiedIds.forEach((id) => allModifiedIds.add(id));
      }

      const modifiedAttributeIds = Array.from(allModifiedIds);
      if (modifiedAttributeIds.length > 0) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: modifiedAttributeIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }

      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: prepareForStructuredClone(result.value),
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
          executionTime,
          modifiedAttributeIds,
          characterId: payload.characterId,
          navigateTargets: result.navigateTargets,
        },
      });
    }

    // Log slow scripts
    if (executionTime > 100) {
      console.warn(`Slow script: ${payload.scriptId} took ${executionTime.toFixed(2)}ms`);
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

async function handleBuildDependencyGraph(payload: {
  rulesetId: string;
  requestId: string;
}): Promise<void> {
  try {
    // Lazy initialize reactive executor
    if (!reactiveExecutor) {
      reactiveExecutor = new ReactiveExecutor(db);
    }

    await reactiveExecutor.loadGraph(payload.rulesetId);

    sendSignal({
      type: 'DEPENDENCY_GRAPH_BUILT',
      payload: {
        rulesetId: payload.rulesetId,
        requestId: payload.requestId,
        success: true,
      },
    });
  } catch (error) {
    sendSignal({
      type: 'DEPENDENCY_GRAPH_BUILT',
      payload: {
        rulesetId: payload.rulesetId,
        requestId: payload.requestId,
        success: false,
      },
    });
  }
}

async function handleValidateScript(payload: {
  scriptId: string;
  sourceCode: string;
  requestId: string;
}): Promise<void> {
  try {
    // Try to parse the script
    const tokens = new Lexer(payload.sourceCode).tokenize();
    new Parser(tokens).parse();

    sendSignal({
      type: 'VALIDATION_RESULT',
      payload: {
        requestId: payload.requestId,
        valid: true,
      },
    });
  } catch (error: any) {
    sendSignal({
      type: 'VALIDATION_RESULT',
      payload: {
        requestId: payload.requestId,
        valid: false,
        errors: [
          {
            message: error.message,
            line: error.line,
            column: error.column,
          },
        ],
      },
    });
  }
}

async function handleAttributeChanged(payload: AttributeChangedPayload): Promise<void> {
  try {
    const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
    const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
    const promptFn: PromptFn = (msg: string, choices: string[]) =>
      promptBridge.requestPrompt(msg, choices, payload.requestId);
    const selectCharacterFn: SelectCharacterFn = (title?: string, description?: string) =>
      characterSelectBridge
        .requestSelect('single', title, description, payload.requestId, payload.rulesetId, payload.campaignId)
        .then((ids) => (ids.length > 0 ? ids[0]! : null));
    const selectCharactersFn: SelectCharactersFn = (title?: string, description?: string) =>
      characterSelectBridge.requestSelect(
        'multi',
        title,
        description,
        payload.requestId,
        payload.rulesetId,
        payload.campaignId,
      );
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        undefined,
        promptFn,
        selectCharacterFn,
        selectCharactersFn,
      ),
    );

    const reactiveOptions = {
      ...(payload.options || {}),
      campaignId: payload.campaignId,
      executeActionEvent: (
        actionId: string,
        characterId: string,
        targetId: string | null,
        eventType: 'on_activate' | 'on_deactivate',
      ) =>
        executor.executeActionEvent(
          actionId,
          characterId,
          targetId,
          eventType,
          rollFn,
          payload.campaignId,
          undefined,
          rollSplitFn,
          promptFn,
          selectCharacterFn,
          selectCharactersFn,
        ),
      roll: rollFn,
      rollSplit: rollSplitFn,
      prompt: promptFn,
      selectCharacter: selectCharacterFn,
      selectCharacters: selectCharactersFn,
    };

    // Run full reactive chain so when attribute a's script changes b, scripts depending on b (e.g. c) refire
    const chainResult = await runReactiveChainForModifiedAttributes(
      [payload.attributeId],
      payload.characterId,
      payload.rulesetId,
      reactiveOptions,
    );

    if (!chainResult.lastError) {
      if (chainResult.allModifiedIds.length > 0) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: chainResult.allModifiedIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: {
            scriptsExecuted: chainResult.scriptsExecuted,
            executionCount: chainResult.executionCount,
          },
          announceMessages: [],
          logMessages: [],
          executionTime: 0,
        },
      });
    } else {
      const failedScriptId =
        chainResult.scriptsExecuted.length > 0
          ? chainResult.scriptsExecuted[chainResult.scriptsExecuted.length - 1]
          : undefined;
      const script = failedScriptId ? await db.scripts.get(failedScriptId) : null;
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: chainResult.lastError?.message || 'Unknown error',
            stackTrace: chainResult.lastError?.stack,
          },
          scriptId: failedScriptId,
          scriptName: script?.name,
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

async function handleInitialAttributeSync(payload: {
  characterId: string;
  rulesetId: string;
  requestId: string;
}): Promise<void> {
  try {
    if (!reactiveExecutor) {
      reactiveExecutor = new ReactiveExecutor(db);
    }

    const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
    const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
    const promptFn: PromptFn = (msg: string, choices: string[]) =>
      promptBridge.requestPrompt(msg, choices, payload.requestId);
    const selectCharacterFn: SelectCharacterFn = (title?: string, description?: string) =>
      characterSelectBridge
        .requestSelect('single', title, description, payload.requestId, payload.rulesetId)
        .then((ids) => (ids.length > 0 ? ids[0]! : null));
    const selectCharactersFn: SelectCharactersFn = (title?: string, description?: string) =>
      characterSelectBridge.requestSelect(
        'multi',
        title,
        description,
        payload.requestId,
        payload.rulesetId,
      );
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        undefined,
        promptFn,
        selectCharacterFn,
        selectCharactersFn,
      ),
    );

    const result = await reactiveExecutor.runInitialSync(
      payload.characterId,
      payload.rulesetId,
      {
        executeActionEvent: (actionId, characterId, targetId, eventType) =>
          executor.executeActionEvent(
            actionId,
            characterId,
            targetId,
            eventType,
            rollFn,
            undefined,
            undefined,
            rollSplitFn,
            promptFn,
            selectCharacterFn,
            selectCharactersFn,
          ),
        roll: rollFn,
        rollSplit: rollSplitFn,
        prompt: promptFn,
        selectCharacter: selectCharacterFn,
        selectCharacters: selectCharactersFn,
      },
    );

    if (result.success) {
      const modifiedAttributeIds = result.modifiedAttributeIds ?? [];
      if (modifiedAttributeIds.length > 0) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: modifiedAttributeIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: {
            scriptsExecuted: result.scriptsExecuted,
            executionCount: result.executionCount,
          },
          announceMessages: [],
          logMessages: [],
          executionTime: 0,
        },
      });
    } else {
      const failedScriptId =
        result.scriptsExecuted.length > 0
          ? result.scriptsExecuted[result.scriptsExecuted.length - 1]
          : undefined;
      const script = failedScriptId ? await db.scripts.get(failedScriptId) : null;
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message || 'Unknown error',
            stackTrace: result.error?.stack,
          },
          scriptId: failedScriptId,
          scriptName: script?.name,
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

async function handleExecuteAction(payload: {
  actionId: string;
  characterId: string;
  targetId?: string;
  requestId: string;
}): Promise<void> {
  try {
    // Get the action from database
    const action = await db.actions.get(payload.actionId);
    if (!action) {
      throw new Error(`Action not found: ${payload.actionId}`);
    }

    // Get script for this action
    const script = await db.scripts
      .where({ entityId: payload.actionId, entityType: 'action' })
      .first();

    if (!script) {
      throw new Error(`No script found for action: ${payload.actionId}`);
    }

    // Execute the script
    await handleExecuteScript({
      scriptId: script.id,
      sourceCode: script.sourceCode,
      characterId: payload.characterId,
      targetId: payload.targetId,
      rulesetId: action.rulesetId,
      triggerType: 'action_click',
      requestId: payload.requestId,
    });
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

/** Execute an action event (on_activate, on_deactivate) via EventHandlerExecutor. */
async function handleExecuteActionEvent(payload: {
  actionId: string;
  characterId: string;
  targetId: string | null;
  eventType: 'on_activate' | 'on_deactivate';
  requestId: string;
  campaignId?: string;
  callerInventoryItemInstanceId?: string;
  roll?: RollFn;
}): Promise<void> {
  try {
    const action = await db.actions.get(payload.actionId);
    if (!action) {
      throw new Error(`Action not found: ${payload.actionId}`);
    }

    const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
    const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
    const promptFn: PromptFn = (msg: string, choices: string[]) =>
      promptBridge.requestPrompt(msg, choices, payload.requestId);
    const selectCharacterFn: SelectCharacterFn = (title?: string, description?: string) =>
      characterSelectBridge
        .requestSelect(
          'single',
          title,
          description,
          payload.requestId,
          action.rulesetId,
          payload.campaignId,
        )
        .then((ids) => (ids.length > 0 ? ids[0]! : null));
    const selectCharactersFn: SelectCharactersFn = (title?: string, description?: string) =>
      characterSelectBridge.requestSelect(
        'multi',
        title,
        description,
        payload.requestId,
        action.rulesetId,
        payload.campaignId,
      );

    const allModifiedIds = new Set<string>();
    const getCollector = () => allModifiedIds;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        selectCharacterFn,
        selectCharactersFn,
      ),
    );
    const result = await executor.executeActionEvent(
      payload.actionId,
      payload.characterId,
      payload.targetId,
      payload.eventType,
      rollFn,
      payload.campaignId,
      payload.callerInventoryItemInstanceId,
      rollSplitFn,
      promptFn,
      selectCharacterFn,
      selectCharactersFn,
    );

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message ?? 'Action event failed',
            stackTrace: result.error?.stack,
          },
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
        },
      });
    } else {
      // Ensure direct modifications from the action script are always included.
      // When B is modified and triggers C via reactive chain, createOnAttributesModified
      // adds both. But if the collector misses B (e.g. timing/order), merge explicitly.
      (result.modifiedAttributeIds ?? []).forEach((id) => allModifiedIds.add(id));
      const modifiedAttributeIds = Array.from(allModifiedIds);
      if (modifiedAttributeIds.length > 0) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: modifiedAttributeIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: prepareForStructuredClone(result.value),
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
          executionTime: 0,
          navigateTargets: result.navigateTargets,
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

async function handleExecuteItemEvent(payload: {
  itemId: string;
  characterId: string;
  eventType: string;
  requestId: string;
  campaignId?: string;
  inventoryItemInstanceId?: string;
}): Promise<void> {
  try {
    const item = await db.items.get(payload.itemId);
    if (!item) {
      throw new Error(`Item not found: ${payload.itemId}`);
    }

    const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
    const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
    const promptFn: PromptFn = (msg: string, choices: string[]) =>
      promptBridge.requestPrompt(msg, choices, payload.requestId);
    const selectCharacterFn: SelectCharacterFn = (title?: string, description?: string) =>
      characterSelectBridge
        .requestSelect(
          'single',
          title,
          description,
          payload.requestId,
          item.rulesetId,
          payload.campaignId,
        )
        .then((ids) => (ids.length > 0 ? ids[0]! : null));
    const selectCharactersFn: SelectCharactersFn = (title?: string, description?: string) =>
      characterSelectBridge.requestSelect(
        'multi',
        title,
        description,
        payload.requestId,
        item.rulesetId,
        payload.campaignId,
      );

    const allModifiedIds = new Set<string>();
    const getCollector = () => allModifiedIds;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        selectCharacterFn,
        selectCharactersFn,
      ),
    );
    const result = await executor.executeItemEvent(
      payload.itemId,
      payload.characterId,
      payload.eventType as 'on_equip' | 'on_unequip' | 'on_consume' | 'on_activate',
      rollFn,
      payload.campaignId,
      payload.inventoryItemInstanceId,
      rollSplitFn,
      promptFn,
      selectCharacterFn,
      selectCharactersFn,
    );

    const script = await db.scripts.where({ entityId: payload.itemId, entityType: 'item' }).first();
    const scriptId = script?.id ?? payload.itemId;

    await persistScriptLogs(db, {
      rulesetId: item.rulesetId,
      scriptId,
      characterId: payload.characterId,
      logMessages: result.logMessages,
      context: 'item_event',
      campaignId: payload.campaignId ?? null,
    });

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message ?? 'Item event failed',
            stackTrace: result.error?.stack,
          },
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
        },
      });
    } else {
      const modifiedAttributeIds = Array.from(allModifiedIds);
      if (modifiedAttributeIds.length > 0) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: modifiedAttributeIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: prepareForStructuredClone(result.value),
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
          executionTime: 0,
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

async function handleExecuteArchetypeEvent(payload: {
  archetypeId: string;
  characterId: string;
  eventType: 'on_add' | 'on_remove';
  requestId: string;
  campaignId?: string;
}): Promise<void> {
  try {
    const archetype = await db.archetypes.get(payload.archetypeId);
    if (!archetype) {
      throw new Error(`Archetype not found: ${payload.archetypeId}`);
    }

    const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
    const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
    const promptFn: PromptFn = (msg: string, choices: string[]) =>
      promptBridge.requestPrompt(msg, choices, payload.requestId);
    const selectCharacterFn: SelectCharacterFn = (title?: string, description?: string) =>
      characterSelectBridge
        .requestSelect(
          'single',
          title,
          description,
          payload.requestId,
          archetype.rulesetId,
          payload.campaignId,
        )
        .then((ids) => (ids.length > 0 ? ids[0]! : null));
    const selectCharactersFn: SelectCharactersFn = (title?: string, description?: string) =>
      characterSelectBridge.requestSelect(
        'multi',
        title,
        description,
        payload.requestId,
        archetype.rulesetId,
        payload.campaignId,
      );

    const allModifiedIds = new Set<string>();
    const getCollector = () => allModifiedIds;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        selectCharacterFn,
        selectCharactersFn,
      ),
    );
    const result = await executor.executeArchetypeEvent(
      payload.archetypeId,
      payload.characterId,
      payload.eventType,
      rollFn,
      payload.campaignId,
      rollSplitFn,
      promptFn,
      selectCharacterFn,
      selectCharactersFn,
    );

    // Logs are persisted inside EventHandlerExecutor.executeArchetypeEvent so they
    // appear in useScriptLogs whether the event runs in the worker or on the main thread.

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message ?? 'Archetype event failed',
            stackTrace: result.error?.stack,
          },
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
        },
      });
    } else {
      const modifiedAttributeIds = Array.from(allModifiedIds);
      if (modifiedAttributeIds.length > 0) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: modifiedAttributeIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: prepareForStructuredClone(result.value),
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
          executionTime: 0,
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

async function handleExecuteCampaignEventEvent(payload: {
  campaignEventId: string;
  campaignSceneId: string;
  /** Character that triggered the event; may be undefined for ownerless runs. */
  characterId?: string;
  eventType: 'on_enter' | 'on_leave' | 'on_activate';
  requestId: string;
  /** Optional specific CampaignEventScene id when multiple links exist for the same event+scene. */
  campaignEventSceneId?: string;
}): Promise<void> {
  try {
    const rollFn: RollFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRoll(expression, payload.requestId, rerollMessage);
    const rollSplitFn: RollSplitFn = (expression: string, rerollMessage?: string) =>
      rollBridge.requestRollSplit(expression, payload.requestId, rerollMessage);
    const promptFn: PromptFn = (msg: string, choices: string[]) =>
      promptBridge.requestPrompt(msg, choices, payload.requestId);

    const allModifiedIds = new Set<string>();
    const getCollector = () => allModifiedIds;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(rollFn, rollSplitFn, () => executor, getCollector, promptFn),
    );
    const result = await executor.executeCampaignEventEvent(
      payload.campaignEventId,
      payload.campaignSceneId,
      payload.eventType,
      payload.characterId,
      rollFn,
      rollSplitFn,
      promptFn,
      payload.campaignEventSceneId,
    );

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message ?? 'Campaign event script failed',
            stackTrace: result.error?.stack,
          },
          logMessages: result.logMessages?.map((args) => prepareForStructuredClone(args)) ?? [],
        },
      });
    } else {
      const modifiedAttributeIds = Array.from(allModifiedIds);
      if (modifiedAttributeIds.length > 0 && payload.characterId) {
        sendSignal({
          type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT',
          payload: {
            characterId: payload.characterId,
            attributeIds: modifiedAttributeIds,
          } satisfies AttributesModifiedByScriptPayload,
        });
      }
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: prepareForStructuredClone(result.value),
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
          executionTime: 0,
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      },
    });
  }
}

function handleClearGraph(payload: { rulesetId?: string }): void {
  if (reactiveExecutor) {
    reactiveExecutor.clearGraph();
  }
}

// ============================================================================
// Worker Initialization
// ============================================================================

self.addEventListener('message', (event: MessageEvent) => {
  const data = event.data;

  // Handle MessagePort initialization
  if (data.type === 'INIT' && data.port) {
    messagePort = data.port;
    if (messagePort) {
      messagePort.onmessage = (e) => {
        handleSignal(e.data).catch((error) => {
          console.error('Error handling signal:', error);
        });
      };
    }
    return;
  }

  // Handle regular messages
  handleSignal(data).catch((error) => {
    console.error('Error handling signal:', error);
  });
});

// Notify main thread that worker is ready
sendSignal({
  type: 'WORKER_READY',
  payload: {
    timestamp: Date.now(),
  },
});

// Handle uncaught errors
self.addEventListener('error', (event) => {
  console.error('Worker error:', event.error);
  sendSignal({
    type: 'WORKER_ERROR',
    payload: {
      message: event.error?.message || 'Unknown worker error',
      stackTrace: event.error?.stack,
    },
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection in worker:', event.reason);
  sendSignal({
    type: 'WORKER_ERROR',
    payload: {
      message: event.reason?.message || 'Unhandled promise rejection',
      stackTrace: event.reason?.stack,
    },
  });
});
