/**
 * QBScript Web Worker
 *
 * Handles script execution in a separate thread to keep the UI responsive.
 * Communicates with the main thread via a signal-based message protocol.
 */

import type { DB } from '@/stores/db/hooks/types';
import { dbSchema, dbSchemaVersion } from '@/stores/db/schema';
import type { RollFn } from '@/types';
import Dexie from 'dexie';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { EventHandlerExecutor } from '../reactive/event-handler-executor';
import { ReactiveExecutor } from '../reactive/reactive-executor';
import { ScriptRunner, type ScriptExecutionContext } from '../runtime/script-runner';
import { prepareForStructuredClone } from '../runtime/structured-clone-safe';
import type {
  AttributeChangedPayload,
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

db.version(dbSchemaVersion).stores(dbSchema);

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
  requestRoll(expression: string, executionRequestId: string): Promise<number> {
    const rollRequestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    return new Promise<number>((resolve, reject) => {
      this.pending.set(rollRequestId, { resolve, reject });
      sendSignal({
        type: 'ROLL_REQUEST',
        payload: { executionRequestId, rollRequestId, expression },
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

      case 'EXECUTE_ACTION':
        await handleExecuteAction(signal.payload);
        break;

      case 'EXECUTE_ACTION_EVENT':
        await handleExecuteActionEvent(signal.payload);
        break;

      case 'EXECUTE_ITEM_EVENT':
        await handleExecuteItemEvent(signal.payload);
        break;

      case 'CLEAR_GRAPH':
        handleClearGraph(signal.payload);
        break;

      case 'ROLL_RESPONSE': {
        const { rollRequestId, value, error } = signal.payload;
        rollBridge.resolveRoll(rollRequestId, value, error);
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
// Script log persistence
// ============================================================================

async function persistScriptLogs(
  rulesetId: string,
  scriptId: string,
  characterId: string,
  logMessages: any[][],
  context: string,
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
      await db.scriptLogs.add({
        id: crypto.randomUUID(),
        rulesetId,
        scriptId,
        characterId,
        argsJson,
        timestamp,
        context,
        createdAt: now,
        updatedAt: now,
      });
    }
  } catch (e) {
    console.warn('[QBScript] Failed to persist script logs:', e);
  }
}

// ============================================================================
// Signal Handlers
// ============================================================================

async function handleExecuteScript(payload: ExecuteScriptPayload): Promise<void> {
  const startTime = performance.now();
  const executor = new EventHandlerExecutor(db);
  const rollFn: RollFn = (expression: string) =>
    rollBridge.requestRoll(expression, payload.requestId);

  try {
    const context: ScriptExecutionContext = {
      ownerId: payload.characterId,
      targetId: payload.targetId,
      rulesetId: payload.rulesetId,
      db,
      scriptId: payload.scriptId,
      triggerType: payload.triggerType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      roll: rollFn,
      executeActionEvent: (actionId, characterId, targetId, eventType) =>
        executor.executeActionEvent(actionId, characterId, targetId, eventType, rollFn),
    };

    const runner = new ScriptRunner(context);
    const result = await runner.run(payload.sourceCode);

    const executionTime = performance.now() - startTime;

    const contextLabel = payload.triggerType ?? 'load';
    await persistScriptLogs(
      payload.rulesetId,
      payload.scriptId,
      payload.characterId,
      result.logMessages,
      contextLabel,
    );

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
      sendSignal({
        type: 'SCRIPT_RESULT',
        payload: {
          requestId: payload.requestId,
          result: prepareForStructuredClone(result.value),
          announceMessages: result.announceMessages,
          logMessages: result.logMessages.map((args) => prepareForStructuredClone(args)),
          executionTime,
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
    // Lazy initialize reactive executor
    if (!reactiveExecutor) {
      reactiveExecutor = new ReactiveExecutor(db);
    }

    const executor = new EventHandlerExecutor(db);
    const rollFn: RollFn = (expression: string) =>
      rollBridge.requestRoll(expression, payload.requestId);

    const result = await reactiveExecutor.onAttributeChange(
      payload.attributeId,
      payload.characterId,
      payload.rulesetId,
      {
        ...(payload.options || {}),
        executeActionEvent: (actionId, characterId, targetId, eventType) =>
          executor.executeActionEvent(actionId, characterId, targetId, eventType, rollFn),
        roll: rollFn,
      },
    );

    if (result.success) {
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
      sendSignal({
        type: 'SCRIPT_ERROR',
        payload: {
          requestId: payload.requestId,
          error: {
            message: result.error?.message || 'Unknown error',
            stackTrace: result.error?.stack,
          },
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
  roll?: RollFn;
}): Promise<void> {
  try {
    const action = await db.actions.get(payload.actionId);
    if (!action) {
      throw new Error(`Action not found: ${payload.actionId}`);
    }

    const rollFn: RollFn = (expression: string) =>
      rollBridge.requestRoll(expression, payload.requestId);

    const executor = new EventHandlerExecutor(db);
    const result = await executor.executeActionEvent(
      payload.actionId,
      payload.characterId,
      payload.targetId,
      payload.eventType,
      rollFn,
    );

    const script = await db.scripts
      .where({ entityId: payload.actionId, entityType: 'action' })
      .first();
    const scriptId = script?.id ?? payload.actionId;

    await persistScriptLogs(
      action.rulesetId,
      scriptId,
      payload.characterId,
      result.logMessages,
      'action_event',
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

async function handleExecuteItemEvent(payload: {
  itemId: string;
  characterId: string;
  eventType: string;
  requestId: string;
}): Promise<void> {
  try {
    const item = await db.items.get(payload.itemId);
    if (!item) {
      throw new Error(`Item not found: ${payload.itemId}`);
    }

    const rollFn: RollFn = (expression: string) =>
      rollBridge.requestRoll(expression, payload.requestId);

    const executor = new EventHandlerExecutor(db);
    const result = await executor.executeItemEvent(
      payload.itemId,
      payload.characterId,
      payload.eventType as 'on_equip' | 'on_unequip' | 'on_consume',
      rollFn,
    );
    console.log('item event: ', result);

    const script = await db.scripts.where({ entityId: payload.itemId, entityType: 'item' }).first();
    const scriptId = script?.id ?? payload.itemId;

    await persistScriptLogs(
      item.rulesetId,
      scriptId,
      payload.characterId,
      result.logMessages,
      'item_event',
    );

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
