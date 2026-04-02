/**
 * QBScript Client
 *
 * Manages communication between the main thread and the QBScript Web Worker.
 * Provides a clean async API for script execution and reactive updates.
 */

import type { CampaignPlayScriptWorkerPolicy } from '@/lib/campaign-play/campaign-play-script-gate';
import { tryBroadcastCampaignRosterFromDexie } from '@/lib/campaign-play/realtime/broadcast-campaign-roster-update';
import {
  buildDelegatedCharacterSelectRoster,
  toCharacterSelectModalDelegatedRoster,
} from '@/lib/campaign-play/realtime/build-delegated-character-select-roster';
import {
  abandonPendingDelegatedUiForExecution,
  hostAwaitDelegatedUiInteraction,
  type CampaignPlayDelegatedUiHostRunOptions,
} from '@/lib/campaign-play/realtime/campaign-play-delegated-ui-host';
import {
  getCurrentCampaignIdForScripts,
  getCurrentCampaignSceneIdForScripts,
} from '@/lib/compass-logic/worker/current-campaign-ref';
import { useCharacterSelectModalStore } from '@/stores/character-select-modal-store';
import { usePromptModalStore } from '@/stores/prompt-modal-store';
import { useScriptComponentAnimationStore } from '@/stores/script-component-animation-store';
import { useScriptModifiedAttributesStore } from '@/stores/script-modified-attributes-store';
import type { RollFn, RollSplitFn } from '@/types';
import { defaultScriptDiceRoller, defaultScriptDiceRollerSplit } from '@/utils/dice-utils';
import type {
  AttributeChangedPayload,
  ExecuteScriptPayload,
  MainToWorkerSignal,
  ScriptErrorPayload,
  ScriptResultPayload,
  WorkerToMainSignal,
} from './signals';
import { generateRequestId } from './signals';

// ============================================================================
// Types
// ============================================================================

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout?: ReturnType<typeof setTimeout>;
}

export interface ScriptExecutionOptions {
  scriptId?: string;
  sourceCode: string;
  characterId: string;
  targetId?: string;
  rulesetId: string;
  triggerType?: 'load' | 'attribute_change' | 'action_click' | 'item_event';
  timeout?: number; // in milliseconds
  /** When script is attached to an entity (attribute, action, item), enables 'Self' in the script environment. */
  entityType?: string;
  entityId?: string;
  /** When set (e.g. in campaign play), script logs and context are associated with this campaign. */
  campaignId?: string;
  /** When set with campaignId, scripts get Scene accessor. */
  campaignSceneId?: string;
  /** Optional params map exposed to QBScript as params.get('name'). Must be JSON-serializable. */
  params?: Record<string, any>;
  /** When set, roll() in scripts uses this handler (e.g. dice context rollDice for UI/3D dice). */
  roll?: RollFn;
  /** When set, rollSplit() in scripts uses this handler. */
  rollSplit?: RollSplitFn;
}

export interface AttributeChangeOptions {
  attributeId: string;
  characterId: string;
  rulesetId: string;
  campaignId?: string;
  campaignSceneId?: string;
  useTransaction?: boolean;
  maxExecutions?: number;
  maxPerScript?: number;
  timeLimit?: number;
  timeout?: number;
  /** When set, roll() in attribute scripts uses this handler (same as executeActionEvent). */
  roll?: RollFn;
  /** When set, rollSplit() in attribute scripts uses this handler. */
  rollSplit?: RollSplitFn;
}

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    message: string;
    line?: number;
    column?: number;
  }>;
}

// ============================================================================
// QBScript Client
// ============================================================================

export type WorkerSignalHandler = (signal: WorkerToMainSignal) => void;

export class QBScriptClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  /** Roll handler per execution request (for action events that need roll in worker) */
  private pendingRollHandlers: Map<string, RollFn> = new Map();
  /** RollSplit handler per execution request */
  private pendingRollSplitHandlers: Map<string, RollSplitFn> = new Map();
  /** When set, blocking UI for this worker execution is delegated via campaign realtime (host). */
  private delegatedHostByRequestId = new Map<
    string,
    { campaignId: string; timeoutMs: number; delegationSurfaceCharacterId: string }
  >();
  private isReady = false;
  private readyCallbacks: Array<() => void> = [];
  private signalHandlers: Set<WorkerSignalHandler> = new Set();

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initWorker(): void {
    try {
      // Use Vite's native Web Worker support
      this.worker = new Worker(new URL('./qbscript-worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event: MessageEvent<WorkerToMainSignal>) => {
        this.handleWorkerSignal(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };
    } catch (error) {
      console.error('Failed to initialize QBScript worker:', error);
    }
  }

  /**
   * Wait for worker to be ready
   */
  private async waitForReady(): Promise<void> {
    if (this.isReady) return;

    return new Promise<void>((resolve) => {
      this.readyCallbacks.push(resolve);
    });
  }

  /**
   * Handle signals from the worker
   */
  private handleWorkerSignal(signal: WorkerToMainSignal): void {
    // Notify subscribers first (e.g. Console panel)
    this.signalHandlers.forEach((handler) => {
      try {
        handler(signal);
      } catch (e) {
        console.error('QBScript signal handler error:', e);
      }
    });

    switch (signal.type) {
      case 'WORKER_READY':
        this.isReady = true;
        this.readyCallbacks.forEach((cb) => cb());
        this.readyCallbacks = [];
        console.log('QBScript worker ready');
        break;

      case 'SCRIPT_RESULT':
        this.handleScriptResult(signal.payload);
        break;

      case 'SCRIPT_ERROR':
        this.handleScriptError(signal.payload);
        break;

      case 'CONSOLE_LOG':
        // Forward console.log to main thread console
        console.log('[QBScript]', ...signal.payload.args);
        break;

      case 'ANNOUNCE':
        // Dispatch custom event for announcements
        window.dispatchEvent(
          new CustomEvent('qbscript:announce', {
            detail: { message: signal.payload.message },
          }),
        );
        break;

      case 'DEPENDENCY_GRAPH_BUILT':
        this.handleDependencyGraphBuilt(signal.payload);
        break;

      case 'VALIDATION_RESULT':
        this.handleValidationResult(signal.payload);
        break;

      case 'WORKER_ERROR':
        console.error('Worker error:', signal.payload.message);
        if (signal.payload.stackTrace) {
          console.error(signal.payload.stackTrace);
        }
        break;

      case 'ROLL_REQUEST':
        this.handleRollRequest(signal.payload);
        break;

      case 'ROLL_SPLIT_REQUEST':
        this.handleRollSplitRequest(signal.payload);
        break;

      case 'PROMPT_REQUEST':
        this.handlePromptRequest(signal.payload);
        break;

      case 'PROMPT_MULTIPLE_REQUEST':
        this.handlePromptMultipleRequest(signal.payload);
        break;

      case 'PROMPT_INPUT_REQUEST':
        this.handlePromptInputRequest(signal.payload);
        break;

      case 'SELECT_CHARACTER_REQUEST':
        this.handleSelectCharacterRequest(signal.payload);
        break;

      case 'ATTRIBUTES_MODIFIED_BY_SCRIPT':
        this.handleAttributesModifiedByScript(signal.payload);
        break;

      default:
        console.warn('Unknown signal type:', (signal as any).type);
    }
  }

  /** Realtime envelope `characterId` for joiner-delegated runs (vs per-call worker surface). */
  private envelopeCharacterIdForDelegatedUi(
    delegated:
      | { delegationSurfaceCharacterId: string; campaignId: string; timeoutMs: number }
      | undefined,
    surfaceCharacterId: string,
  ): string {
    return delegated?.delegationSurfaceCharacterId ?? surfaceCharacterId;
  }

  private handleAttributesModifiedByScript(payload: {
    characterId: string;
    attributeIds: string[];
  }): void {
    if (payload.attributeIds.length > 0) {
      useScriptModifiedAttributesStore
        .getState()
        .addModified(payload.characterId, payload.attributeIds);
    }
  }

  private async handleRollRequest(payload: {
    executionRequestId: string;
    rollRequestId: string;
    expression: string;
    rerollMessage?: string;
    surfaceCharacterId: string;
  }): Promise<void> {
    const delegated = this.delegatedHostByRequestId.get(payload.executionRequestId);
    const rollFn =
      this.pendingRollHandlers.get(payload.executionRequestId) ?? defaultScriptDiceRoller;
    if (!this.worker) return;
    try {
      let value: number;
      if (delegated) {
        const raw = await hostAwaitDelegatedUiInteraction({
          campaignId: delegated.campaignId,
          executionRequestId: payload.executionRequestId,
          interactionId: payload.rollRequestId,
          characterId: this.envelopeCharacterIdForDelegatedUi(
            delegated,
            payload.surfaceCharacterId,
          ),
          body: {
            interactionType: 'roll',
            expression: payload.expression,
            rerollMessage: payload.rerollMessage,
          },
          timeoutMs: delegated.timeoutMs,
          localRunner: () =>
            Promise.resolve(rollFn(payload.expression, payload.rerollMessage)).then((v) =>
              typeof v === 'number' ? v : Number(v),
            ),
        });
        value = typeof raw === 'number' ? raw : Number(raw);
      } else {
        value = await Promise.resolve(rollFn(payload.expression, payload.rerollMessage));
      }
      this.worker.postMessage({
        type: 'ROLL_RESPONSE',
        payload: { rollRequestId: payload.rollRequestId, value },
      });
    } catch (err) {
      this.worker.postMessage({
        type: 'ROLL_RESPONSE',
        payload: {
          rollRequestId: payload.rollRequestId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private async handleRollSplitRequest(payload: {
    executionRequestId: string;
    rollRequestId: string;
    expression: string;
    rerollMessage?: string;
    surfaceCharacterId: string;
  }): Promise<void> {
    const delegated = this.delegatedHostByRequestId.get(payload.executionRequestId);
    const rollSplitFn =
      this.pendingRollSplitHandlers.get(payload.executionRequestId) ?? defaultScriptDiceRollerSplit;
    if (!this.worker) return;
    try {
      let value: number[];
      if (delegated) {
        const raw = await hostAwaitDelegatedUiInteraction({
          campaignId: delegated.campaignId,
          executionRequestId: payload.executionRequestId,
          interactionId: payload.rollRequestId,
          characterId: this.envelopeCharacterIdForDelegatedUi(
            delegated,
            payload.surfaceCharacterId,
          ),
          body: {
            interactionType: 'roll_split',
            expression: payload.expression,
            rerollMessage: payload.rerollMessage,
          },
          timeoutMs: delegated.timeoutMs,
          localRunner: () =>
            Promise.resolve(rollSplitFn(payload.expression, payload.rerollMessage)).then((v) =>
              Array.isArray(v) ? v : [],
            ),
        });
        value = Array.isArray(raw) ? (raw as number[]) : [];
      } else {
        value = await Promise.resolve(rollSplitFn(payload.expression, payload.rerollMessage));
      }
      this.worker.postMessage({
        type: 'ROLL_SPLIT_RESPONSE',
        payload: { rollRequestId: payload.rollRequestId, value },
      });
    } catch (err) {
      this.worker.postMessage({
        type: 'ROLL_SPLIT_RESPONSE',
        payload: {
          rollRequestId: payload.rollRequestId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private async handlePromptRequest(payload: {
    executionRequestId: string;
    promptRequestId: string;
    msg: string;
    choices: string[];
    surfaceCharacterId: string;
  }): Promise<void> {
    const delegated = this.delegatedHostByRequestId.get(payload.executionRequestId);
    if (!this.worker) return;
    try {
      let value: string;
      if (delegated) {
        value = (await hostAwaitDelegatedUiInteraction({
          campaignId: delegated.campaignId,
          executionRequestId: payload.executionRequestId,
          interactionId: payload.promptRequestId,
          characterId: this.envelopeCharacterIdForDelegatedUi(
            delegated,
            payload.surfaceCharacterId,
          ),
          body: {
            interactionType: 'prompt',
            message: payload.msg,
            choices: payload.choices,
          },
          timeoutMs: delegated.timeoutMs,
          localRunner: () => usePromptModalStore.getState().show(payload.msg, payload.choices),
        })) as string;
      } else {
        value = await usePromptModalStore.getState().show(payload.msg, payload.choices);
      }
      this.worker.postMessage({
        type: 'PROMPT_RESPONSE',
        payload: { promptRequestId: payload.promptRequestId, value },
      });
    } catch (err) {
      this.worker.postMessage({
        type: 'PROMPT_RESPONSE',
        payload: {
          promptRequestId: payload.promptRequestId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private async handlePromptMultipleRequest(payload: {
    executionRequestId: string;
    promptRequestId: string;
    msg: string;
    choices: string[];
    surfaceCharacterId: string;
  }): Promise<void> {
    const delegated = this.delegatedHostByRequestId.get(payload.executionRequestId);
    if (!this.worker) return;
    try {
      let value: string[];
      if (delegated) {
        value = (await hostAwaitDelegatedUiInteraction({
          campaignId: delegated.campaignId,
          executionRequestId: payload.executionRequestId,
          interactionId: payload.promptRequestId,
          characterId: this.envelopeCharacterIdForDelegatedUi(
            delegated,
            payload.surfaceCharacterId,
          ),
          body: {
            interactionType: 'prompt_multiple',
            message: payload.msg,
            choices: payload.choices,
          },
          timeoutMs: delegated.timeoutMs,
          localRunner: () =>
            usePromptModalStore.getState().showMultiple(payload.msg, payload.choices),
        })) as string[];
      } else {
        value = await usePromptModalStore.getState().showMultiple(payload.msg, payload.choices);
      }
      this.worker.postMessage({
        type: 'PROMPT_MULTIPLE_RESPONSE',
        payload: { promptRequestId: payload.promptRequestId, value },
      });
    } catch (err) {
      this.worker.postMessage({
        type: 'PROMPT_MULTIPLE_RESPONSE',
        payload: {
          promptRequestId: payload.promptRequestId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private async handlePromptInputRequest(payload: {
    executionRequestId: string;
    promptRequestId: string;
    msg: string;
    surfaceCharacterId: string;
  }): Promise<void> {
    const delegated = this.delegatedHostByRequestId.get(payload.executionRequestId);
    if (!this.worker) return;
    try {
      let value: string;
      if (delegated) {
        value = (await hostAwaitDelegatedUiInteraction({
          campaignId: delegated.campaignId,
          executionRequestId: payload.executionRequestId,
          interactionId: payload.promptRequestId,
          characterId: this.envelopeCharacterIdForDelegatedUi(
            delegated,
            payload.surfaceCharacterId,
          ),
          body: {
            interactionType: 'prompt_input',
            message: payload.msg,
          },
          timeoutMs: delegated.timeoutMs,
          localRunner: () => usePromptModalStore.getState().showInput(payload.msg),
        })) as string;
      } else {
        value = await usePromptModalStore.getState().showInput(payload.msg);
      }
      this.worker.postMessage({
        type: 'PROMPT_INPUT_RESPONSE',
        payload: { promptRequestId: payload.promptRequestId, value },
      });
    } catch (err) {
      this.worker.postMessage({
        type: 'PROMPT_INPUT_RESPONSE',
        payload: {
          promptRequestId: payload.promptRequestId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private async handleSelectCharacterRequest(payload: {
    executionRequestId: string;
    selectRequestId: string;
    mode: 'single' | 'multi';
    title?: string;
    description?: string;
    rulesetId: string;
    campaignId?: string;
    surfaceCharacterId: string;
  }): Promise<void> {
    const delegated = this.delegatedHostByRequestId.get(payload.executionRequestId);
    if (!this.worker) return;
    try {
      let characterIds: string[];
      if (delegated) {
        const campaignIdForRoster = payload.campaignId ?? delegated.campaignId;
        const rosterWire = await buildDelegatedCharacterSelectRoster(
          campaignIdForRoster,
          payload.rulesetId,
        );
        const delegatedRoster = toCharacterSelectModalDelegatedRoster(rosterWire);
        if (payload.mode === 'single') {
          const raw = await hostAwaitDelegatedUiInteraction<string | null>({
            campaignId: delegated.campaignId,
            executionRequestId: payload.executionRequestId,
            interactionId: payload.selectRequestId,
            characterId: this.envelopeCharacterIdForDelegatedUi(
              delegated,
              payload.surfaceCharacterId,
            ),
            body: {
              interactionType: 'select_character',
              title: payload.title,
              description: payload.description,
              rulesetId: payload.rulesetId,
              campaignId: payload.campaignId,
              rosterNpcs: rosterWire.rosterNpcs,
              rosterPcs: rosterWire.rosterPcs,
            },
            timeoutMs: delegated.timeoutMs,
            localRunner: async () => {
              const { characterIds: ids } = await useCharacterSelectModalStore.getState().show({
                mode: 'single',
                title: payload.title,
                description: payload.description,
                rulesetId: payload.rulesetId,
                campaignId: payload.campaignId ?? delegated.campaignId,
                delegatedRoster,
              });
              return ids.length > 0 ? ids[0]! : null;
            },
          });
          characterIds = raw ? [raw] : [];
        } else {
          characterIds = (await hostAwaitDelegatedUiInteraction<string[]>({
            campaignId: delegated.campaignId,
            executionRequestId: payload.executionRequestId,
            interactionId: payload.selectRequestId,
            characterId: this.envelopeCharacterIdForDelegatedUi(
              delegated,
              payload.surfaceCharacterId,
            ),
            body: {
              interactionType: 'select_characters',
              title: payload.title,
              description: payload.description,
              rulesetId: payload.rulesetId,
              campaignId: payload.campaignId,
              rosterNpcs: rosterWire.rosterNpcs,
              rosterPcs: rosterWire.rosterPcs,
            },
            timeoutMs: delegated.timeoutMs,
            localRunner: () =>
              useCharacterSelectModalStore
                .getState()
                .show({
                  mode: 'multi',
                  title: payload.title,
                  description: payload.description,
                  rulesetId: payload.rulesetId,
                  campaignId: payload.campaignId ?? delegated.campaignId,
                  delegatedRoster,
                })
                .then((r) => r.characterIds),
          })) as string[];
        }
      } else {
        const { characterIds: ids } = await useCharacterSelectModalStore.getState().show({
          mode: payload.mode,
          title: payload.title,
          description: payload.description,
          rulesetId: payload.rulesetId,
          campaignId: payload.campaignId,
        });
        characterIds = ids;
      }

      this.worker.postMessage({
        type: 'SELECT_CHARACTER_RESPONSE',
        payload: { selectRequestId: payload.selectRequestId, characterIds },
      });
    } catch (err) {
      this.worker.postMessage({
        type: 'SELECT_CHARACTER_RESPONSE',
        payload: {
          selectRequestId: payload.selectRequestId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private handleScriptResult(payload: ScriptResultPayload): void {
    if (payload.rosterBroadcasts?.length) {
      for (const entry of payload.rosterBroadcasts) {
        void tryBroadcastCampaignRosterFromDexie({
          campaignId: entry.campaignId,
          characterIds: [entry.characterId],
          campaignCharacterIds: [entry.campaignCharacterId],
        }).catch(() => {});
      }
    }

    if (payload.modifiedAttributeIds?.length && payload.characterId) {
      useScriptModifiedAttributesStore
        .getState()
        .addModified(payload.characterId, payload.modifiedAttributeIds);
    }

    if (payload.componentAnimations?.length) {
      const store = useScriptComponentAnimationStore.getState();
      for (const { characterId, referenceLabel, animation } of payload.componentAnimations) {
        store.add(characterId, referenceLabel, animation);
      }
    }

    // Handle page navigation requests by dispatching an event that the app shell can consume.
    if (payload.navigateTargets && payload.navigateTargets.length > 0) {
      const target = payload.navigateTargets[0];
      try {
        window.dispatchEvent(
          new CustomEvent('qbscript:navigateToCharacterPage', {
            detail: { characterId: target.characterId, pageId: target.pageId },
          }),
        );
      } catch (e) {
        console.warn('Failed to dispatch navigation event for script result:', e);
      }
    }

    const pending = this.pendingRequests.get(payload.requestId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }

      // Do not log or dispatch here: the evaluator already sends CONSOLE_LOG and ANNOUNCE
      // in real time as the script runs, so we would duplicate every message.

      pending.resolve({
        value: payload.result,
        announceMessages: payload.announceMessages,
        logMessages: payload.logMessages,
        executionTime: payload.executionTime,
        modifiedAttributeIds: payload.modifiedAttributeIds,
        navigateTargets: payload.navigateTargets,
        componentAnimations: payload.componentAnimations,
      });

      this.pendingRequests.delete(payload.requestId);
      this.pendingRollHandlers.delete(payload.requestId);
      this.pendingRollSplitHandlers.delete(payload.requestId);
    }
  }

  private handleScriptError(payload: ScriptErrorPayload): void {
    const pending = this.pendingRequests.get(payload.requestId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }

      const error = new Error(payload.error.message);
      (error as any).line = payload.error.line;
      (error as any).column = payload.error.column;
      error.stack = payload.error.stackTrace;
      if (payload.scriptId != null) (error as any).scriptId = payload.scriptId;
      if (payload.scriptName != null) (error as any).scriptName = payload.scriptName;

      try {
        window.dispatchEvent(
          new CustomEvent('qbscript:scriptError', {
            detail: {
              message: payload.error.message,
              scriptId: payload.scriptId,
              line: payload.error.line,
              column: payload.error.column,
            },
          }),
        );
      } catch (e) {
        console.warn('Failed to dispatch qbscript:scriptError event:', e);
      }

      pending.reject(error);
      this.pendingRequests.delete(payload.requestId);
      this.pendingRollHandlers.delete(payload.requestId);
      this.pendingRollSplitHandlers.delete(payload.requestId);
    }
  }

  private handleDependencyGraphBuilt(payload: any): void {
    const pending = this.pendingRequests.get(payload.requestId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.resolve({
        success: payload.success,
        nodeCount: payload.nodeCount,
        edgeCount: payload.edgeCount,
      });
      this.pendingRequests.delete(payload.requestId);
    }
  }

  private handleValidationResult(payload: any): void {
    const pending = this.pendingRequests.get(payload.requestId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.resolve({
        valid: payload.valid,
        errors: payload.errors,
      });
      this.pendingRequests.delete(payload.requestId);
    }
  }

  /**
   * Send a signal to the worker with request/response handling
   */
  private async sendSignal<T = any>(
    signal: MainToWorkerSignal,
    requestId: string,
    timeoutMs = 10000,
  ): Promise<T> {
    await this.waitForReady();

    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          abandonPendingDelegatedUiForExecution(
            requestId,
            `Script execution timeout after ${timeoutMs}ms`,
          );
          reject(new Error(`Script execution timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      this.worker!.postMessage(signal);
    });
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Execute a script
   */
  async executeScript(options: ScriptExecutionOptions): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    const scriptId = options.scriptId || `inline-${requestId}`;

    this.pendingRollHandlers.set(requestId, options.roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, options.rollSplit ?? defaultScriptDiceRollerSplit);

    const payload: ExecuteScriptPayload = {
      scriptId,
      sourceCode: options.sourceCode,
      characterId: options.characterId,
      targetId: options.targetId,
      rulesetId: options.rulesetId,
      triggerType: options.triggerType || 'action_click',
      requestId,
      entityType: options.entityType,
      entityId: options.entityId,
      campaignId: options.campaignId ?? getCurrentCampaignIdForScripts(),
      campaignSceneId: options.campaignSceneId ?? getCurrentCampaignSceneIdForScripts(),
      ...(options.params ? { params: options.params } : {}),
    };

    try {
      return await this.sendSignal({ type: 'EXECUTE_SCRIPT', payload }, requestId, options.timeout);
    } finally {
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Notify worker of attribute change (triggers reactive scripts)
   */
  async onAttributeChange(options: AttributeChangeOptions): Promise<{
    scriptsExecuted: string[];
    executionCount: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, options.roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, options.rollSplit ?? defaultScriptDiceRollerSplit);

    const payload: AttributeChangedPayload = {
      attributeId: options.attributeId,
      characterId: options.characterId,
      rulesetId: options.rulesetId,
      requestId,
      campaignId: options.campaignId ?? getCurrentCampaignIdForScripts(),
      campaignSceneId: options.campaignSceneId ?? getCurrentCampaignSceneIdForScripts(),
      options: {
        useTransaction: options.useTransaction,
        maxExecutions: options.maxExecutions,
        maxPerScript: options.maxPerScript,
        timeLimit: options.timeLimit,
      },
    };

    try {
      const result = await this.sendSignal<{ value: any }>(
        { type: 'ATTRIBUTE_CHANGED', payload },
        requestId,
        options.timeout,
      );
      return result.value;
    } finally {
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Run all attribute scripts once in dependency order (e.g. after character creation or syncWithRuleset).
   * Uses the dependency graph so execution order respects script dependencies.
   */
  async runInitialAttributeSync(
    characterId: string,
    rulesetId: string,
    timeout = 30000,
    roll?: RollFn,
    rollSplit?: RollSplitFn,
  ): Promise<{ scriptsExecuted: string[]; executionCount: number }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, rollSplit ?? defaultScriptDiceRollerSplit);
    try {
      const response = await this.sendSignal<{
        value?: { scriptsExecuted: string[]; executionCount: number };
      }>(
        {
          type: 'RUN_INITIAL_ATTRIBUTE_SYNC',
          payload: {
            characterId,
            rulesetId,
            requestId,
            campaignId: getCurrentCampaignIdForScripts(),
          },
        },
        requestId,
        timeout,
      );
      return response?.value ?? { scriptsExecuted: [], executionCount: 0 };
    } finally {
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Execute an action script
   */
  /**
   * Updates guest/host script policy in the worker (no response). Safe before worker ready (message queues).
   */
  setCampaignPlayScriptPolicy(policy: CampaignPlayScriptWorkerPolicy): void {
    if (!this.worker) return;
    this.worker.postMessage({
      type: 'SET_CAMPAIGN_PLAY_SCRIPT_POLICY',
      payload: policy,
    } satisfies MainToWorkerSignal);
  }

  async executeAction(
    actionId: string,
    characterId: string,
    targetId?: string,
    timeout = 10000,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();

    return this.sendSignal(
      {
        type: 'EXECUTE_ACTION',
        payload: {
          actionId,
          characterId,
          targetId,
          requestId,
          campaignId: getCurrentCampaignIdForScripts(),
          campaignSceneId: getCurrentCampaignSceneIdForScripts(),
        },
      },
      requestId,
      timeout,
    );
  }

  /**
   * Execute an action event handler (on_activate, on_deactivate).
   * Uses EventHandlerExecutor to run only the specified handler within the action script.
   * @param callerInventoryItemInstanceId - When set (action fired from item context menu), Caller = itemInstanceProxy of this inventory item.
   */
  async executeActionEvent(
    actionId: string,
    characterId: string,
    targetId: string | null,
    eventType: 'on_activate' | 'on_deactivate',
    roll?: RollFn,
    timeout = 10000,
    campaignId?: string,
    callerInventoryItemInstanceId?: string,
    rollSplit?: RollSplitFn,
    campaignSceneId?: string,
    delegatedHostRun?: CampaignPlayDelegatedUiHostRunOptions,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
    modifiedAttributeIds?: string[];
    navigateTargets?: { characterId: string; pageId: string }[];
    componentAnimations?: Array<{ characterId: string; referenceLabel: string; animation: string }>;
  }> {
    const requestId = delegatedHostRun?.executionRequestId ?? generateRequestId();
    if (delegatedHostRun) {
      this.delegatedHostByRequestId.set(requestId, {
        campaignId: delegatedHostRun.campaignId,
        timeoutMs: delegatedHostRun.timeoutMs,
        delegationSurfaceCharacterId: delegatedHostRun.delegationSurfaceCharacterId,
      });
    }
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, rollSplit ?? defaultScriptDiceRollerSplit);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_ACTION_EVENT',
          payload: {
            actionId,
            characterId,
            targetId,
            eventType,
            requestId,
            campaignId: campaignId ?? getCurrentCampaignIdForScripts(),
            campaignSceneId: campaignSceneId ?? getCurrentCampaignSceneIdForScripts(),
            callerInventoryItemInstanceId,
          },
        },
        requestId,
        timeout,
      );
    } finally {
      abandonPendingDelegatedUiForExecution(requestId);
      this.delegatedHostByRequestId.delete(requestId);
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Execute an item event script (on_equip, on_unequip, on_consume).
   * Uses EventHandlerExecutor. Pass optional roll so scripts can call roll() via the same round-trip as action events.
   */
  async executeItemEvent(
    itemId: string,
    characterId: string,
    eventType: string,
    roll?: RollFn,
    timeout = 10000,
    campaignId?: string,
    inventoryItemInstanceId?: string,
    rollSplit?: RollSplitFn,
    campaignSceneId?: string,
    delegatedHostRun?: CampaignPlayDelegatedUiHostRunOptions,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
    modifiedAttributeIds?: string[];
    navigateTargets?: { characterId: string; pageId: string }[];
    componentAnimations?: Array<{ characterId: string; referenceLabel: string; animation: string }>;
  }> {
    const requestId = delegatedHostRun?.executionRequestId ?? generateRequestId();
    if (delegatedHostRun) {
      this.delegatedHostByRequestId.set(requestId, {
        campaignId: delegatedHostRun.campaignId,
        timeoutMs: delegatedHostRun.timeoutMs,
        delegationSurfaceCharacterId: delegatedHostRun.delegationSurfaceCharacterId,
      });
    }
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, rollSplit ?? defaultScriptDiceRollerSplit);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_ITEM_EVENT',
          payload: {
            itemId,
            characterId,
            eventType,
            requestId,
            campaignId: campaignId ?? getCurrentCampaignIdForScripts(),
            campaignSceneId: campaignSceneId ?? getCurrentCampaignSceneIdForScripts(),
            inventoryItemInstanceId,
          },
        },
        requestId,
        timeout,
      );
    } finally {
      abandonPendingDelegatedUiForExecution(requestId);
      this.delegatedHostByRequestId.delete(requestId);
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Execute an archetype event script (on_add, on_remove).
   * Uses EventHandlerExecutor. Pass optional roll so scripts can call roll().
   */
  async executeArchetypeEvent(
    archetypeId: string,
    characterId: string,
    eventType: 'on_add' | 'on_remove',
    roll?: RollFn,
    timeout = 10000,
    campaignId?: string,
    rollSplit?: RollSplitFn,
    campaignSceneId?: string,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, rollSplit ?? defaultScriptDiceRollerSplit);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_ARCHETYPE_EVENT',
          payload: {
            archetypeId,
            characterId,
            eventType,
            requestId,
            campaignId: campaignId ?? getCurrentCampaignIdForScripts(),
            campaignSceneId: campaignSceneId ?? getCurrentCampaignSceneIdForScripts(),
          },
        },
        requestId,
        timeout,
      );
    } finally {
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Execute the script attached to a campaign event when it fires.
   * Uses CampaignEvent and CampaignScene; location-based events are deprecated.
   */
  async executeCampaignEventEvent(
    campaignEventId: string,
    campaignSceneId: string,
    eventType: 'on_enter' | 'on_leave' | 'on_activate',
    /** Character that triggered the event; may be null/undefined for ownerless events. */
    characterId: string | null = null,
    roll?: RollFn,
    timeout = 10000,
    rollSplit?: RollSplitFn,
    campaignId?: string,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    this.pendingRollSplitHandlers.set(requestId, rollSplit ?? defaultScriptDiceRollerSplit);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_CAMPAIGN_EVENT_EVENT',
          payload: {
            campaignEventId,
            campaignSceneId,
            eventType,
            requestId,
            characterId: characterId ?? undefined,
            campaignId: campaignId ?? getCurrentCampaignIdForScripts(),
          },
        },
        requestId,
        timeout,
      );
    } finally {
      this.pendingRollHandlers.delete(requestId);
      this.pendingRollSplitHandlers.delete(requestId);
    }
  }

  /**
   * Validate script syntax
   */
  async validateScript(
    scriptId: string,
    sourceCode: string,
    timeout = 5000,
  ): Promise<ValidationResult> {
    const requestId = generateRequestId();

    return this.sendSignal(
      {
        type: 'VALIDATE_SCRIPT',
        payload: { scriptId, sourceCode, requestId },
      },
      requestId,
      timeout,
    );
  }

  /**
   * Build dependency graph for a ruleset
   */
  async buildDependencyGraph(
    rulesetId: string,
    timeout = 30000,
  ): Promise<{ success: boolean; nodeCount?: number; edgeCount?: number }> {
    const requestId = generateRequestId();

    return this.sendSignal(
      {
        type: 'BUILD_DEPENDENCY_GRAPH',
        payload: { rulesetId, requestId },
      },
      requestId,
      timeout,
    );
  }

  /**
   * Clear dependency graph cache
   */
  clearGraph(rulesetId?: string): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'CLEAR_GRAPH',
        payload: { rulesetId },
      } as MainToWorkerSignal);
    }
  }

  /**
   * Notify the worker that the app's active ruleset changed (clears custom `on` listeners for the previous ruleset).
   */
  setCustomEventRulesetContext(rulesetId: string | null): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'SET_CUSTOM_EVENT_RULESET_CONTEXT',
        payload: { rulesetId },
      } as MainToWorkerSignal);
    }
  }

  /**
   * Dispatch a custom QBScript event from the main thread (payload must be JSON-serializable).
   */
  emitCustomEvent(options: {
    rulesetId: string;
    eventName: string;
    payload?: unknown;
    surfaceCharacterId?: string;
  }): void {
    if (!this.worker) return;
    let payload: unknown = options.payload;
    if (payload !== undefined) {
      try {
        payload =
          typeof structuredClone === 'function'
            ? structuredClone(payload)
            : JSON.parse(JSON.stringify(payload));
      } catch {
        throw new Error('emitCustomEvent: payload must be JSON-serializable');
      }
    }
    this.worker.postMessage({
      type: 'DISPATCH_CUSTOM_EVENT',
      payload: {
        rulesetId: options.rulesetId,
        eventName: options.eventName,
        ...(payload !== undefined ? { payload } : {}),
        ...(options.surfaceCharacterId ? { surfaceCharacterId: options.surfaceCharacterId } : {}),
      },
    } as MainToWorkerSignal);
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.pendingRequests.clear();
      this.delegatedHostByRequestId.clear();
    }
  }

  /**
   * Check if worker is ready
   */
  get ready(): boolean {
    return this.isReady;
  }

  /**
   * Subscribe to worker signals (e.g. for Console panel to collect CONSOLE_LOG).
   */
  onSignal(handler: WorkerSignalHandler): () => void {
    this.signalHandlers.add(handler);
    return () => {
      this.signalHandlers.delete(handler);
    };
  }

  /**
   * Unsubscribe from worker signals.
   */
  offSignal(handler: WorkerSignalHandler): void {
    this.signalHandlers.delete(handler);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: QBScriptClient | null = null;

export function getQBScriptClient(): QBScriptClient {
  if (!clientInstance) {
    clientInstance = new QBScriptClient();
  }
  return clientInstance;
}

export function terminateQBScriptClient(): void {
  if (clientInstance) {
    clientInstance.terminate();
    clientInstance = null;
  }
}
