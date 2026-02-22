/**
 * QBScript Client
 *
 * Manages communication between the main thread and the QBScript Web Worker.
 * Provides a clean async API for script execution and reactive updates.
 */

import type { RollFn } from '@/types';
import { defaultScriptDiceRoller } from '@/utils/dice-utils';
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
}

export interface AttributeChangeOptions {
  attributeId: string;
  characterId: string;
  rulesetId: string;
  useTransaction?: boolean;
  maxExecutions?: number;
  maxPerScript?: number;
  timeLimit?: number;
  timeout?: number;
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

      default:
        console.warn('Unknown signal type:', (signal as any).type);
    }
  }

  private async handleRollRequest(payload: {
    executionRequestId: string;
    rollRequestId: string;
    expression: string;
  }): Promise<void> {
    const rollFn = this.pendingRollHandlers.get(payload.executionRequestId);
    if (!this.worker) return;
    if (!rollFn) {
      this.worker.postMessage({
        type: 'ROLL_RESPONSE',
        payload: {
          rollRequestId: payload.rollRequestId,
          error: 'No roll handler registered for this execution',
        },
      });
      return;
    }
    try {
      const value = await Promise.resolve(rollFn(payload.expression));
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

  private handleScriptResult(payload: ScriptResultPayload): void {
    const pending = this.pendingRequests.get(payload.requestId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }

      // Log any messages
      payload.logMessages.forEach((args) => {
        console.log('[QBScript]', ...args);
      });

      // Dispatch announce messages as events
      payload.announceMessages.forEach((message) => {
        window.dispatchEvent(
          new CustomEvent('qbscript:announce', {
            detail: { message },
          }),
        );
      });

      pending.resolve({
        value: payload.result,
        announceMessages: payload.announceMessages,
        logMessages: payload.logMessages,
        executionTime: payload.executionTime,
      });

      this.pendingRequests.delete(payload.requestId);
      this.pendingRollHandlers.delete(payload.requestId);
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

      pending.reject(error);
      this.pendingRequests.delete(payload.requestId);
      this.pendingRollHandlers.delete(payload.requestId);
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
    };

    return this.sendSignal({ type: 'EXECUTE_SCRIPT', payload }, requestId, options.timeout);
  }

  /**
   * Notify worker of attribute change (triggers reactive scripts)
   */
  async onAttributeChange(options: AttributeChangeOptions): Promise<{
    scriptsExecuted: string[];
    executionCount: number;
  }> {
    const requestId = generateRequestId();

    const payload: AttributeChangedPayload = {
      attributeId: options.attributeId,
      characterId: options.characterId,
      rulesetId: options.rulesetId,
      requestId,
      options: {
        useTransaction: options.useTransaction,
        maxExecutions: options.maxExecutions,
        maxPerScript: options.maxPerScript,
        timeLimit: options.timeLimit,
      },
    };

    const result = await this.sendSignal<{ value: any }>(
      { type: 'ATTRIBUTE_CHANGED', payload },
      requestId,
      options.timeout,
    );

    return result.value;
  }

  /**
   * Run all attribute scripts once in dependency order (e.g. after character creation or syncWithRuleset).
   * Uses the dependency graph so execution order respects script dependencies.
   */
  async runInitialAttributeSync(
    characterId: string,
    rulesetId: string,
    timeout = 30000,
  ): Promise<{ scriptsExecuted: string[]; executionCount: number }> {
    const requestId = generateRequestId();
    const response = await this.sendSignal<{
      value?: { scriptsExecuted: string[]; executionCount: number };
    }>(
      {
        type: 'RUN_INITIAL_ATTRIBUTE_SYNC',
        payload: { characterId, rulesetId, requestId },
      },
      requestId,
      timeout,
    );
    return response?.value ?? { scriptsExecuted: [], executionCount: 0 };
  }

  /**
   * Execute an action script
   */
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
        payload: { actionId, characterId, targetId, requestId },
      },
      requestId,
      timeout,
    );
  }

  /**
   * Execute an action event handler (on_activate, on_deactivate).
   * Uses EventHandlerExecutor to run only the specified handler within the action script.
   */
  async executeActionEvent(
    actionId: string,
    characterId: string,
    targetId: string | null,
    eventType: 'on_activate' | 'on_deactivate',
    roll?: RollFn,
    timeout = 10000,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_ACTION_EVENT',
          payload: { actionId, characterId, targetId, eventType, requestId },
        },
        requestId,
        timeout,
      );
    } finally {
      this.pendingRollHandlers.delete(requestId);
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
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_ITEM_EVENT',
          payload: { itemId, characterId, eventType, requestId },
        },
        requestId,
        timeout,
      );
    } finally {
      this.pendingRollHandlers.delete(requestId);
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
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_ARCHETYPE_EVENT',
          payload: { archetypeId, characterId, eventType, requestId },
        },
        requestId,
        timeout,
      );
    } finally {
      this.pendingRollHandlers.delete(requestId);
    }
  }

  /**
   * Execute a campaign event script (on_enter, on_leave) when a character moves onto/off a tile.
   */
  async executeCampaignEventEvent(
    campaignEventId: string,
    characterId: string,
    eventType: 'on_enter' | 'on_leave',
    roll?: RollFn,
    timeout = 10000,
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();
    this.pendingRollHandlers.set(requestId, roll ?? defaultScriptDiceRoller);
    try {
      return await this.sendSignal(
        {
          type: 'EXECUTE_CAMPAIGN_EVENT_EVENT',
          payload: { campaignEventId, characterId, eventType, requestId },
        },
        requestId,
        timeout,
      );
    } finally {
      this.pendingRollHandlers.delete(requestId);
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
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.pendingRequests.clear();
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
