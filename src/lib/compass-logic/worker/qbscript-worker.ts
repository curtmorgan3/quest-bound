/**
 * QBScript Web Worker
 *
 * Handles script execution in a separate thread to keep the UI responsive.
 * Communicates with the main thread via a signal-based message protocol.
 */

import {
  shouldBlockClientCampaignScript,
  type CampaignPlayScriptWorkerPolicy,
} from '@/lib/campaign-play/campaign-play-script-gate';
import type { DB } from '@/stores/db/hooks/types';
import { dbSchemaVersion, latestDbSchema } from '@/stores/db/schema';
import type {
  PromptFn,
  PromptInputFn,
  PromptMultipleFn,
  RollFn,
  RollSplitFn,
  SelectCharacterFn,
  SelectCharactersFn,
} from '@/types';
import Dexie from 'dexie';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import {
  EventHandlerExecutor,
  type OnAttributesModifiedFn,
} from '../reactive/event-handler-executor';
import { ReactiveExecutor } from '../reactive/reactive-executor';
import { createParamsHelperFromRecord } from '../runtime/params-helper';
import {
  enqueueMainThreadCustomEvent,
  shouldQueueMainThreadCustomEventEmit,
  syncRulesetContextFromApplication,
} from '../runtime/custom-event-registry';
import { ScriptRunner, type ScriptExecutionContext } from '../runtime/script-runner';
import { prepareForStructuredClone } from '../runtime/structured-clone-safe';
import { persistScriptLogs } from '../script-logs';
import type {
  AttributeChangedPayload,
  AttributesModifiedByScriptPayload,
  ExecuteScriptPayload,
  MainToWorkerSignal,
  WorkerToMainSignal,
} from './signals';
import { generateRequestId } from './signals';

// ============================================================================
// Database Setup
// ============================================================================

// Initialize Dexie database in worker context (same IndexedDB as main thread)
const db = new Dexie('qbdb') as DB;

db.version(dbSchemaVersion).stores(latestDbSchema);

// Release our connection when another context (main thread or tab) upgrades or deletes
// the DB. Otherwise the worker keeps the connection open and the app can get stuck
// until the browser is force-quit (see agents/indexeddb-connection-loss.md).
db.on('versionchange', () => {
  db.close();
});
db.on('blocked', () => {
  db.close();
});

// ============================================================================
// Worker State
// ============================================================================

let reactiveExecutor: ReactiveExecutor | null = null;
let messagePort: MessagePort | null = null;

let campaignPlayScriptPolicy: CampaignPlayScriptWorkerPolicy = {
  featureEnabled: false,
  role: null,
  sessionCampaignId: null,
};

function sendBlockedGeneralScriptResult(requestId: string): void {
  sendSignal({
    type: 'SCRIPT_RESULT',
    payload: {
      requestId,
      result: null,
      announceMessages: [],
      logMessages: [],
      executionTime: 0,
    },
  });
}

function sendBlockedReactiveStyleResult(requestId: string, characterId?: string): void {
  sendSignal({
    type: 'SCRIPT_RESULT',
    payload: {
      requestId,
      result: {
        scriptsExecuted: [] as string[],
        executionCount: 0,
      },
      announceMessages: [],
      logMessages: [],
      executionTime: 0,
      ...(characterId ? { characterId } : {}),
    },
  });
}

// ============================================================================
// Roll bridge (worker requests roll from main thread; main thread responds)
// ============================================================================

const rollBridge = {
  pending: new Map<string, { resolve: (value: number) => void; reject: (err: Error) => void }>(),
  pendingSplit: new Map<
    string,
    { resolve: (value: number[]) => void; reject: (err: Error) => void }
  >(),
  requestRoll(
    expression: string,
    executionRequestId: string,
    rerollMessage: string | undefined,
    surfaceCharacterId: string,
  ): Promise<number> {
    const rollRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<number>((resolve, reject) => {
      this.pending.set(rollRequestId, { resolve, reject });
      sendSignal({
        type: 'ROLL_REQUEST',
        payload: {
          executionRequestId,
          rollRequestId,
          expression,
          rerollMessage,
          surfaceCharacterId,
        },
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
    rerollMessage: string | undefined,
    surfaceCharacterId: string,
  ): Promise<number[]> {
    const rollRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<number[]>((resolve, reject) => {
      this.pendingSplit.set(rollRequestId, { resolve, reject });
      sendSignal({
        type: 'ROLL_SPLIT_REQUEST',
        payload: {
          executionRequestId,
          rollRequestId,
          expression,
          rerollMessage,
          surfaceCharacterId,
        },
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
    surfaceCharacterId: string,
  ): Promise<string> {
    const promptRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(promptRequestId, { resolve, reject });
      sendSignal({
        type: 'PROMPT_REQUEST',
        payload: { executionRequestId, promptRequestId, msg, choices, surfaceCharacterId },
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
// PromptMultiple bridge (worker requests multi-select prompt modal; main responds with selected choices)
// ============================================================================

const promptMultipleBridge = {
  pending: new Map<string, { resolve: (value: string[]) => void; reject: (err: Error) => void }>(),
  requestPromptMultiple(
    msg: string,
    choices: string[],
    executionRequestId: string,
    surfaceCharacterId: string,
  ): Promise<string[]> {
    const promptRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<string[]>((resolve, reject) => {
      this.pending.set(promptRequestId, { resolve, reject });
      sendSignal({
        type: 'PROMPT_MULTIPLE_REQUEST',
        payload: { executionRequestId, promptRequestId, msg, choices, surfaceCharacterId },
      });
    });
  },
  resolvePromptMultiple(promptRequestId: string, value?: string[], error?: string): void {
    const entry = this.pending.get(promptRequestId);
    if (!entry) return;
    this.pending.delete(promptRequestId);
    if (error != null) {
      entry.reject(new Error(error));
    } else {
      entry.resolve(value ?? []);
    }
  },
};

// ============================================================================
// PromptInput bridge (worker requests text-input prompt modal from main thread; main responds with entered value)
// ============================================================================

const promptInputBridge = {
  pending: new Map<string, { resolve: (value: string) => void; reject: (err: Error) => void }>(),
  requestPromptInput(
    msg: string,
    executionRequestId: string,
    surfaceCharacterId: string,
  ): Promise<string> {
    const promptRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<string>((resolve, reject) => {
      this.pending.set(promptRequestId, { resolve, reject });
      sendSignal({
        type: 'PROMPT_INPUT_REQUEST',
        payload: { executionRequestId, promptRequestId, msg, surfaceCharacterId },
      });
    });
  },
  resolvePromptInput(promptRequestId: string, value?: string, error?: string): void {
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
    campaignId: string | undefined,
    surfaceCharacterId: string,
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
          surfaceCharacterId,
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

/** Main-thread UI bridges for worker scripts (roll/prompt/select with surfaceCharacterId for delegation). */
function createWorkerMainThreadUiBridges(options: {
  executionRequestId: string;
  /** Acting character for prompts/selects and default global roll(). */
  actingCharacterId: string;
  rulesetId: string;
  campaignId?: string;
}): {
  rollFn: RollFn;
  rollSplitFn: RollSplitFn;
  createRollForCharacter: (characterId: string) => RollFn;
  createRollSplitForCharacter: (characterId: string) => RollSplitFn;
  promptFn: PromptFn;
  promptMultipleFn: PromptMultipleFn;
  promptInputFn: PromptInputFn;
  selectCharacterFn: SelectCharacterFn;
  selectCharactersFn: SelectCharactersFn;
} {
  const { executionRequestId, actingCharacterId, rulesetId, campaignId } = options;
  const createRollForCharacter = (surfaceId: string): RollFn => (expression, rerollMessage) =>
    rollBridge.requestRoll(expression, executionRequestId, rerollMessage, surfaceId);
  const createRollSplitForCharacter = (surfaceId: string): RollSplitFn => (expression, rerollMessage) =>
    rollBridge.requestRollSplit(expression, executionRequestId, rerollMessage, surfaceId);
  const rollFn = createRollForCharacter(actingCharacterId);
  const rollSplitFn = createRollSplitForCharacter(actingCharacterId);
  const promptFn: PromptFn = (msg, choices) =>
    promptBridge.requestPrompt(msg, choices, executionRequestId, actingCharacterId);
  const promptMultipleFn: PromptMultipleFn = (msg, choices) =>
    promptMultipleBridge.requestPromptMultiple(msg, choices, executionRequestId, actingCharacterId);
  const promptInputFn: PromptInputFn = (msg) =>
    promptInputBridge.requestPromptInput(msg, executionRequestId, actingCharacterId);
  const selectCharacterFn: SelectCharacterFn = (title, description) =>
    characterSelectBridge
      .requestSelect(
        'single',
        title,
        description,
        executionRequestId,
        rulesetId,
        campaignId,
        actingCharacterId,
      )
      .then((ids) => (ids.length > 0 ? ids[0]! : null));
  const selectCharactersFn: SelectCharactersFn = (title, description) =>
    characterSelectBridge.requestSelect(
      'multi',
      title,
      description,
      executionRequestId,
      rulesetId,
      campaignId,
      actingCharacterId,
    );
  return {
    rollFn,
    rollSplitFn,
    createRollForCharacter,
    createRollSplitForCharacter,
    promptFn,
    promptMultipleFn,
    promptInputFn,
    selectCharacterFn,
    selectCharactersFn,
  };
}

/** Run custom event listeners when the worker is not inside ScriptRunner.run (no queue). */
async function runIdleCustomEventDispatch(
  rulesetId: string,
  eventName: string,
  payload: unknown,
  surfaceCharacterId: string,
): Promise<void> {
  const executionRequestId = `custom-event-${generateRequestId()}`;
  const bridges = createWorkerMainThreadUiBridges({
    executionRequestId,
    actingCharacterId: surfaceCharacterId || rulesetId,
    rulesetId,
  });
  const context: ScriptExecutionContext = {
    db,
    rulesetId,
    scriptId: '__dispatch_custom_event__',
    roll: bridges.rollFn,
    rollSplit: bridges.rollSplitFn,
    createRollForCharacter: bridges.createRollForCharacter,
    createRollSplitForCharacter: bridges.createRollSplitForCharacter,
    prompt: bridges.promptFn,
    promptMultiple: bridges.promptMultipleFn,
    promptInput: bridges.promptInputFn,
    selectCharacter: bridges.selectCharacterFn,
    selectCharacters: bridges.selectCharactersFn,
  };
  const runner = new ScriptRunner(context);
  await runner.loadCache();
  runner.setupAccessors();
  await runner.dispatchCustomEvent(eventName, payload);
}

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

      case 'SET_CAMPAIGN_PLAY_SCRIPT_POLICY':
        campaignPlayScriptPolicy = signal.payload;
        break;

      case 'CLEAR_GRAPH':
        handleClearGraph(signal.payload);
        break;

      case 'DISPATCH_CUSTOM_EVENT': {
        const p = signal.payload;
        if (shouldQueueMainThreadCustomEventEmit()) {
          enqueueMainThreadCustomEvent(p.rulesetId, p.eventName, p.payload === undefined ? null : p.payload);
        } else {
          await runIdleCustomEventDispatch(
            p.rulesetId,
            p.eventName,
            p.payload === undefined ? null : p.payload,
            p.surfaceCharacterId ?? '',
          );
        }
        break;
      }

      case 'SET_CUSTOM_EVENT_RULESET_CONTEXT':
        syncRulesetContextFromApplication(signal.payload.rulesetId);
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

      case 'PROMPT_MULTIPLE_RESPONSE': {
        const { promptRequestId, value, error } = signal.payload;
        promptMultipleBridge.resolvePromptMultiple(promptRequestId, value, error);
        break;
      }

      case 'PROMPT_INPUT_RESPONSE': {
        const { promptRequestId, value, error } = signal.payload;
        promptInputBridge.resolvePromptInput(promptRequestId, value, error);
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
  promptMultipleFn?: PromptMultipleFn,
  selectCharacterFn?: SelectCharacterFn,
  selectCharactersFn?: SelectCharactersFn,
  campaignId?: string,
  campaignSceneId?: string,
  /** When provided, collect component animations triggered by reactive scripts. */
  getComponentAnimationsCollector?: () => Array<{
    characterId: string;
    referenceLabel: string;
    animation: string;
  }>,
  promptInputFn?: PromptInputFn,
  createRollForCharacter?: (characterId: string) => RollFn,
  createRollSplitForCharacter?: (characterId: string) => RollSplitFn,
  sheetPreviewRulesetWindowId?: string | null,
): OnAttributesModifiedFn {
  return async (attributeIds: string[], characterId: string, rulesetId: string) => {
    if (attributeIds.length === 0) return;
    const collector = getModifiedIdsCollector?.();
    const animationsCollector = getComponentAnimationsCollector?.();
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
            createRollForCharacter,
            createRollSplitForCharacter,
            prompt: promptFn,
            promptMultiple: promptMultipleFn,
            promptInput: promptInputFn,
            selectCharacter: selectCharacterFn,
            selectCharacters: selectCharactersFn,
            campaignId,
            campaignSceneId,
            executeActionEvent: (actionId, cId, targetId, eventType) =>
              executor.executeActionEvent(
                actionId,
                cId,
                targetId,
                eventType,
                rollFn,
                campaignId,
                undefined,
                rollSplitFn,
                promptFn,
                selectCharacterFn,
                selectCharactersFn,
                campaignSceneId,
                promptMultipleFn,
                promptInputFn,
                createRollForCharacter,
                createRollSplitForCharacter,
                sheetPreviewRulesetWindowId,
              ),
            sheetPreviewRulesetWindowId,
          },
        );
        if (collector && reactiveResult.modifiedAttributeIds?.length) {
          reactiveResult.modifiedAttributeIds.forEach((id) => collector.add(id));
        }
        if (animationsCollector && reactiveResult.componentAnimations?.length) {
          reactiveResult.componentAnimations.forEach((entry) => animationsCollector.push(entry));
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
  componentAnimations: Array<{ characterId: string; referenceLabel: string; animation: string }>;
  lastError?: ReactiveExecutionResult['error'];
  truncated?: boolean;
}> {
  if (!reactiveExecutor) {
    reactiveExecutor = new ReactiveExecutor(db);
  }
  const allModifiedIds = new Set<string>(initialAttributeIds);
  const scriptsExecuted: string[] = [];
  const componentAnimations: Array<{
    characterId: string;
    referenceLabel: string;
    animation: string;
  }> = [];
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
          componentAnimations,
          lastError: result.error as Error | undefined,
        };
      }
      scriptsExecuted.push(...(result.scriptsExecuted ?? []));
      executionCount += result.executionCount ?? 0;
      for (const entry of result.componentAnimations ?? []) {
        componentAnimations.push(entry);
      }
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
    componentAnimations,
    ...(truncated ? { truncated: true } : {}),
  };
}

// Need ReactiveExecutionResult for the return type
type ReactiveExecutionResult = Awaited<ReturnType<ReactiveExecutor['onAttributeChange']>>;

// ============================================================================
// Signal Handlers
// ============================================================================

async function handleExecuteScript(payload: ExecuteScriptPayload): Promise<void> {
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedGeneralScriptResult(payload.requestId);
    return;
  }

  const startTime = performance.now();
  const {
    rollFn,
    rollSplitFn,
    createRollForCharacter,
    createRollSplitForCharacter,
    promptFn,
    promptMultipleFn,
    promptInputFn,
    selectCharacterFn,
    selectCharactersFn,
  } = createWorkerMainThreadUiBridges({
    executionRequestId: payload.requestId,
    actingCharacterId: payload.characterId,
    rulesetId: payload.rulesetId,
    campaignId: payload.campaignId,
  });
  let executor: EventHandlerExecutor;
  executor = new EventHandlerExecutor(
    db,
    createOnAttributesModified(
      rollFn,
      rollSplitFn,
      () => executor,
      undefined,
      promptFn,
      promptMultipleFn,
      selectCharacterFn,
      selectCharactersFn,
      payload.campaignId,
      payload.campaignSceneId,
      undefined,
      promptInputFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      payload.sheetPreviewRulesetWindowId,
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

  // Collects componentAnimations from nested action event calls (Owner.Action().activate()) and
  // reactive chain executions triggered by attribute modifications during script execution.
  const reactiveComponentAnimations: Array<{
    characterId: string;
    referenceLabel: string;
    animation: string;
  }> = [];

  try {
    const sharedRosterBroadcasts: Array<{
      campaignId: string;
      characterId: string;
      campaignCharacterId: string;
    }> = [];

    const context: ScriptExecutionContext = {
      ownerId: payload.characterId,
      rulesetId: payload.rulesetId,
      db,
      scriptId: payload.scriptId,
      triggerType: payload.triggerType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      campaignId: payload.campaignId,
      campaignSceneId: payload.campaignSceneId,
      sheetPreviewRulesetWindowId: payload.sheetPreviewRulesetWindowId,
      sharedRosterBroadcasts,
      roll: rollFn,
      rollSplit: rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      prompt: promptFn,
      promptMultiple: promptMultipleFn,
      promptInput: promptInputFn,
      selectCharacter: selectCharacterFn,
      selectCharacters: selectCharactersFn,
      onRollComplete,
      executeActionEvent: async (actionId, characterId, targetId, eventType) => {
        const r = await executor.executeActionEvent(
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
          payload.campaignSceneId,
          promptMultipleFn,
          promptInputFn,
          createRollForCharacter,
          createRollSplitForCharacter,
          payload.sheetPreviewRulesetWindowId,
        );
        for (const entry of r.componentAnimations ?? []) {
          reactiveComponentAnimations.push(entry);
        }
        return r;
      },
      ...(payload.params ? { params: createParamsHelperFromRecord(payload.params) } : {}),
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
          scriptId: payload.scriptId,
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
              selectCharacterFn,
              selectCharactersFn,
              payload.campaignSceneId,
              promptMultipleFn,
              promptInputFn,
              createRollForCharacter,
              createRollSplitForCharacter,
              payload.sheetPreviewRulesetWindowId,
            ),
          roll: rollFn,
          rollSplit: rollSplitFn,
          prompt: promptFn,
          promptMultiple: promptMultipleFn,
          promptInput: promptInputFn,
          selectCharacter: selectCharacterFn,
          selectCharacters: selectCharactersFn,
          sheetPreviewRulesetWindowId: payload.sheetPreviewRulesetWindowId,
        };
        const chainResult = await runReactiveChainForModifiedAttributes(
          directModifiedIds,
          payload.characterId,
          payload.rulesetId,
          reactiveOptions,
        );
        chainResult.allModifiedIds.forEach((id) => allModifiedIds.add(id));
        for (const entry of chainResult.componentAnimations) {
          reactiveComponentAnimations.push(entry);
        }
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

      const allComponentAnimations = [
        ...(result.componentAnimations ?? []),
        ...reactiveComponentAnimations,
      ];
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
          componentAnimations: allComponentAnimations,
          ...(result.rosterBroadcasts && result.rosterBroadcasts.length > 0
            ? { rosterBroadcasts: result.rosterBroadcasts }
            : {}),
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
        scriptId: payload.scriptId,
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
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedReactiveStyleResult(payload.requestId, payload.characterId);
    return;
  }

  try {
    const {
      rollFn,
      rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      promptFn,
      promptMultipleFn,
      promptInputFn,
      selectCharacterFn,
      selectCharactersFn,
    } = createWorkerMainThreadUiBridges({
      executionRequestId: payload.requestId,
      actingCharacterId: payload.characterId,
      rulesetId: payload.rulesetId,
      campaignId: payload.campaignId,
    });
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        undefined,
        promptFn,
        promptMultipleFn,
        selectCharacterFn,
        selectCharactersFn,
        undefined,
        undefined,
        undefined,
        promptInputFn,
        createRollForCharacter,
        createRollSplitForCharacter,
        payload.sheetPreviewRulesetWindowId,
      ),
    );

    const reactiveOptions = {
      ...(payload.options || {}),
      campaignId: payload.campaignId,
      campaignSceneId: payload.campaignSceneId,
      sheetPreviewRulesetWindowId: payload.sheetPreviewRulesetWindowId,
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
          payload.campaignSceneId,
          promptMultipleFn,
          promptInputFn,
          createRollForCharacter,
          createRollSplitForCharacter,
          payload.sheetPreviewRulesetWindowId,
        ),
      roll: rollFn,
      rollSplit: rollSplitFn,
      prompt: promptFn,
      promptMultiple: promptMultipleFn,
      promptInput: promptInputFn,
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
          characterId: payload.characterId,
          componentAnimations: chainResult.componentAnimations,
        },
      });
    } else {
      const failedScriptId =
        chainResult.scriptsExecuted.length > 0
          ? chainResult.scriptsExecuted[chainResult.scriptsExecuted.length - 1]
          : undefined;
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: chainResult.lastError?.message || 'Unknown error',
            stackTrace: chainResult.lastError?.stack,
          },
          scriptId: failedScriptId,
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
  campaignId?: string;
  sheetPreviewRulesetWindowId?: string;
}): Promise<void> {
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedReactiveStyleResult(payload.requestId, payload.characterId);
    return;
  }

  try {
    if (!reactiveExecutor) {
      reactiveExecutor = new ReactiveExecutor(db);
    }

    const {
      rollFn,
      rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      promptFn,
      promptMultipleFn,
      promptInputFn,
      selectCharacterFn,
      selectCharactersFn,
    } = createWorkerMainThreadUiBridges({
      executionRequestId: payload.requestId,
      actingCharacterId: payload.characterId,
      rulesetId: payload.rulesetId,
      campaignId: payload.campaignId,
    });
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        undefined,
        promptFn,
        promptMultipleFn,
        selectCharacterFn,
        selectCharactersFn,
        undefined,
        undefined,
        undefined,
        promptInputFn,
        createRollForCharacter,
        createRollSplitForCharacter,
        payload.sheetPreviewRulesetWindowId,
      ),
    );

    const result = await reactiveExecutor.runInitialSync(payload.characterId, payload.rulesetId, {
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
          undefined,
          promptMultipleFn,
          promptInputFn,
          createRollForCharacter,
          createRollSplitForCharacter,
          payload.sheetPreviewRulesetWindowId,
        ),
      roll: rollFn,
      rollSplit: rollSplitFn,
      prompt: promptFn,
      promptMultiple: promptMultipleFn,
      promptInput: promptInputFn,
      selectCharacter: selectCharacterFn,
      selectCharacters: selectCharactersFn,
      sheetPreviewRulesetWindowId: payload.sheetPreviewRulesetWindowId,
    });

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
          componentAnimations: result.componentAnimations,
        },
      });
    } else {
      const failedScriptId =
        result.scriptsExecuted.length > 0
          ? result.scriptsExecuted[result.scriptsExecuted.length - 1]
          : undefined;
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message || 'Unknown error',
            stackTrace: result.error?.stack,
          },
          scriptId: failedScriptId,
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
  campaignId?: string;
  campaignSceneId?: string;
  sheetPreviewRulesetWindowId?: string;
}): Promise<void> {
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedGeneralScriptResult(payload.requestId);
    return;
  }

  let scriptIdForError: string | undefined;
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

    scriptIdForError = script.id;

    // Execute the script
    await handleExecuteScript({
      scriptId: script.id,
      sourceCode: script.sourceCode,
      characterId: payload.characterId,
      targetId: payload.targetId,
      rulesetId: action.rulesetId,
      triggerType: 'action_click',
      requestId: payload.requestId,
      campaignId: payload.campaignId,
      campaignSceneId: payload.campaignSceneId,
      sheetPreviewRulesetWindowId: payload.sheetPreviewRulesetWindowId,
    });
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        scriptId: scriptIdForError,
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
  campaignSceneId?: string;
  callerInventoryItemInstanceId?: string;
  sheetPreviewRulesetWindowId?: string;
  roll?: RollFn;
}): Promise<void> {
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedGeneralScriptResult(payload.requestId);
    return;
  }

  let actionScriptIdForError: string | undefined;
  try {
    const action = await db.actions.get(payload.actionId);
    if (!action) {
      throw new Error(`Action not found: ${payload.actionId}`);
    }

    actionScriptIdForError = action.scriptId ?? undefined;

    const {
      rollFn,
      rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      promptFn,
      promptMultipleFn,
      promptInputFn,
      selectCharacterFn,
      selectCharactersFn,
    } = createWorkerMainThreadUiBridges({
      executionRequestId: payload.requestId,
      actingCharacterId: payload.characterId,
      rulesetId: action.rulesetId,
      campaignId: payload.campaignId,
    });

    const allModifiedIds = new Set<string>();
    const allReactiveAnimations: Array<{
      characterId: string;
      referenceLabel: string;
      animation: string;
    }> = [];
    const getCollector = () => allModifiedIds;
    const getAnimationsCollector = () => allReactiveAnimations;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        promptMultipleFn,
        selectCharacterFn,
        selectCharactersFn,
        payload.campaignId,
        payload.campaignSceneId,
        getAnimationsCollector,
        promptInputFn,
        createRollForCharacter,
        createRollSplitForCharacter,
        payload.sheetPreviewRulesetWindowId,
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
      payload.campaignSceneId,
      promptMultipleFn,
      promptInputFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      payload.sheetPreviewRulesetWindowId,
    );

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          scriptId: result.scriptId ?? actionScriptIdForError,
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
          characterId: payload.characterId,
          modifiedAttributeIds,
          navigateTargets: result.navigateTargets,
          componentAnimations: [...(result.componentAnimations ?? []), ...allReactiveAnimations],
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        scriptId: actionScriptIdForError,
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
  campaignSceneId?: string;
  inventoryItemInstanceId?: string;
  sheetPreviewRulesetWindowId?: string;
}): Promise<void> {
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedGeneralScriptResult(payload.requestId);
    return;
  }

  let itemScriptIdForError: string | undefined;
  try {
    const item = await db.items.get(payload.itemId);
    if (!item) {
      throw new Error(`Item not found: ${payload.itemId}`);
    }

    itemScriptIdForError = item.scriptId ?? undefined;

    const {
      rollFn,
      rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      promptFn,
      promptMultipleFn,
      promptInputFn,
      selectCharacterFn,
      selectCharactersFn,
    } = createWorkerMainThreadUiBridges({
      executionRequestId: payload.requestId,
      actingCharacterId: payload.characterId,
      rulesetId: item.rulesetId,
      campaignId: payload.campaignId,
    });

    const allModifiedIds = new Set<string>();
    const allReactiveAnimations: Array<{
      characterId: string;
      referenceLabel: string;
      animation: string;
    }> = [];
    const getCollector = () => allModifiedIds;
    const getAnimationsCollector = () => allReactiveAnimations;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        promptMultipleFn,
        selectCharacterFn,
        selectCharactersFn,
        payload.campaignId,
        payload.campaignSceneId,
        getAnimationsCollector,
        promptInputFn,
        createRollForCharacter,
        createRollSplitForCharacter,
        payload.sheetPreviewRulesetWindowId,
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
      payload.campaignSceneId,
      promptMultipleFn,
      promptInputFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      payload.sheetPreviewRulesetWindowId,
    );

    const script = await db.scripts.where({ entityId: payload.itemId, entityType: 'item' }).first();
    const scriptIdForLogs = result.scriptId ?? script?.id ?? payload.itemId;

    await persistScriptLogs(db, {
      rulesetId: item.rulesetId,
      scriptId: scriptIdForLogs,
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
          scriptId: result.scriptId ?? itemScriptIdForError ?? script?.id,
          error: {
            message: result.error?.message ?? 'Item event failed',
            stackTrace: result.error?.stack,
          },
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
        },
      });
    } else {
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
          characterId: payload.characterId,
          modifiedAttributeIds,
          navigateTargets: result.navigateTargets,
          componentAnimations: [...(result.componentAnimations ?? []), ...allReactiveAnimations],
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        scriptId: itemScriptIdForError,
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
  campaignSceneId?: string;
  sheetPreviewRulesetWindowId?: string;
}): Promise<void> {
  if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, payload.campaignId)) {
    sendBlockedGeneralScriptResult(payload.requestId);
    return;
  }

  let archetypeScriptIdForError: string | undefined;
  try {
    const archetype = await db.archetypes.get(payload.archetypeId);
    if (!archetype) {
      throw new Error(`Archetype not found: ${payload.archetypeId}`);
    }

    archetypeScriptIdForError = archetype.scriptId ?? undefined;

    const {
      rollFn,
      rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      promptFn,
      promptMultipleFn,
      promptInputFn,
      selectCharacterFn,
      selectCharactersFn,
    } = createWorkerMainThreadUiBridges({
      executionRequestId: payload.requestId,
      actingCharacterId: payload.characterId,
      rulesetId: archetype.rulesetId,
      campaignId: payload.campaignId,
    });

    const allModifiedIds = new Set<string>();
    const allReactiveAnimations: Array<{
      characterId: string;
      referenceLabel: string;
      animation: string;
    }> = [];
    const getCollector = () => allModifiedIds;
    const getAnimationsCollector = () => allReactiveAnimations;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        promptMultipleFn,
        selectCharacterFn,
        selectCharactersFn,
        payload.campaignId,
        payload.campaignSceneId,
        getAnimationsCollector,
        promptInputFn,
        createRollForCharacter,
        createRollSplitForCharacter,
        payload.sheetPreviewRulesetWindowId,
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
      payload.campaignSceneId,
      promptMultipleFn,
      promptInputFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      payload.sheetPreviewRulesetWindowId,
    );

    // Logs are persisted inside EventHandlerExecutor.executeArchetypeEvent so they
    // appear in useScriptLogs whether the event runs in the worker or on the main thread.

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          scriptId: result.scriptId ?? archetypeScriptIdForError,
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
          componentAnimations: [...(result.componentAnimations ?? []), ...allReactiveAnimations],
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        scriptId: archetypeScriptIdForError,
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
  campaignId?: string;
  /** Character that triggered the event; may be undefined for ownerless runs. */
  characterId?: string;
  eventType: 'on_enter' | 'on_leave' | 'on_activate';
  requestId: string;
}): Promise<void> {
  let campaignEventScriptIdForError: string | undefined;
  try {
    const campaignEvent = await db.campaignEvents.get(payload.campaignEventId);
    campaignEventScriptIdForError = campaignEvent?.scriptId;
    const effectiveCampaignId = payload.campaignId ?? campaignEvent?.campaignId;
    if (shouldBlockClientCampaignScript(campaignPlayScriptPolicy, effectiveCampaignId)) {
      sendBlockedGeneralScriptResult(payload.requestId);
      return;
    }
    const campaign = campaignEvent ? await db.campaigns.get(campaignEvent.campaignId) : undefined;
    const rulesetId = campaign?.rulesetId ?? '';
    const campaignId = campaignEvent?.campaignId;

    const actingCharacterId = payload.characterId ?? '';
    const {
      rollFn,
      rollSplitFn,
      createRollForCharacter,
      createRollSplitForCharacter,
      promptFn,
      promptMultipleFn,
      promptInputFn,
      selectCharacterFn,
      selectCharactersFn,
    } = createWorkerMainThreadUiBridges({
      executionRequestId: payload.requestId,
      actingCharacterId,
      rulesetId,
      campaignId,
    });

    const allModifiedIds = new Set<string>();
    const allReactiveAnimations: Array<{
      characterId: string;
      referenceLabel: string;
      animation: string;
    }> = [];
    const getCollector = () => allModifiedIds;
    const getAnimationsCollector = () => allReactiveAnimations;
    let executor: EventHandlerExecutor;
    executor = new EventHandlerExecutor(
      db,
      createOnAttributesModified(
        rollFn,
        rollSplitFn,
        () => executor,
        getCollector,
        promptFn,
        promptMultipleFn,
        selectCharacterFn,
        selectCharactersFn,
        campaignId ?? undefined,
        payload.campaignSceneId,
        getAnimationsCollector,
        promptInputFn,
        createRollForCharacter,
        createRollSplitForCharacter,
        undefined,
      ),
    );
    const result = await executor.executeCampaignEventEvent(
      payload.campaignEventId,
      payload.campaignSceneId,
      payload.eventType,
      payload.characterId,
      rollFn,
      rollSplitFn,
      promptFn,
      selectCharacterFn,
      selectCharactersFn,
      undefined,
      promptMultipleFn,
      promptInputFn,
      createRollForCharacter,
      createRollSplitForCharacter,
    );

    if (result.error || !result.success) {
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          scriptId: result.scriptId ?? campaignEventScriptIdForError,
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
          componentAnimations: [...(result.componentAnimations ?? []), ...allReactiveAnimations],
        },
      });
    }
  } catch (error) {
    sendSignal({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        scriptId: campaignEventScriptIdForError,
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
