/**
 * QBScript Client
 * 
 * Manages communication between the main thread and the QBScript Web Worker.
 * Provides a clean async API for script execution and reactive updates.
 */

import type {
  MainToWorkerSignal,
  WorkerToMainSignal,
  ExecuteScriptPayload,
  AttributeChangedPayload,
  ScriptResultPayload,
  ScriptErrorPayload,
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

export class QBScriptClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private isReady = false;
  private readyCallbacks: Array<() => void> = [];

  constructor() {
    this.initWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initWorker(): void {
    try {
      // Use Vite's native Web Worker support
      this.worker = new Worker(
        new URL('./qbscript-worker.ts', import.meta.url),
        { type: 'module' }
      );

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
          })
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

      default:
        console.warn('Unknown signal type:', (signal as any).type);
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
          })
        );
      });

      pending.resolve({
        value: payload.result,
        announceMessages: payload.announceMessages,
        logMessages: payload.logMessages,
        executionTime: payload.executionTime,
      });

      this.pendingRequests.delete(payload.requestId);
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

      pending.reject(error);
      this.pendingRequests.delete(payload.requestId);
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
    timeoutMs = 10000
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
    };

    return this.sendSignal(
      { type: 'EXECUTE_SCRIPT', payload },
      requestId,
      options.timeout
    );
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
      options.timeout
    );

    return result.value;
  }

  /**
   * Execute an action script
   */
  async executeAction(
    actionId: string,
    characterId: string,
    targetId?: string,
    timeout = 10000
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
      timeout
    );
  }

  /**
   * Execute an item event script
   */
  async executeItemEvent(
    itemId: string,
    characterId: string,
    eventType: string,
    timeout = 10000
  ): Promise<{
    value: any;
    announceMessages: string[];
    logMessages: any[][];
    executionTime: number;
  }> {
    const requestId = generateRequestId();

    return this.sendSignal(
      {
        type: 'EXECUTE_ITEM_EVENT',
        payload: { itemId, characterId, eventType, requestId },
      },
      requestId,
      timeout
    );
  }

  /**
   * Validate script syntax
   */
  async validateScript(
    scriptId: string,
    sourceCode: string,
    timeout = 5000
  ): Promise<ValidationResult> {
    const requestId = generateRequestId();

    return this.sendSignal(
      {
        type: 'VALIDATE_SCRIPT',
        payload: { scriptId, sourceCode, requestId },
      },
      requestId,
      timeout
    );
  }

  /**
   * Build dependency graph for a ruleset
   */
  async buildDependencyGraph(
    rulesetId: string,
    timeout = 30000
  ): Promise<{ success: boolean; nodeCount?: number; edgeCount?: number }> {
    const requestId = generateRequestId();

    return this.sendSignal(
      {
        type: 'BUILD_DEPENDENCY_GRAPH',
        payload: { rulesetId, requestId },
      },
      requestId,
      timeout
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
