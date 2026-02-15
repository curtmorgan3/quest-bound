/**
 * QBScript Web Worker
 *
 * Handles script execution in a separate thread to keep the UI responsive.
 * Communicates with the main thread via a signal-based message protocol.
 */

import type { DB } from '@/stores/db/hooks/types';
import { dbSchema, dbSchemaVersion } from '@/stores/db/schema';
import Dexie from 'dexie';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { ReactiveExecutor } from '../reactive/reactive-executor';
import { prepareForStructuredClone } from '../runtime/structured-clone-safe';
import { ScriptRunner, type ScriptExecutionContext } from '../runtime/script-runner';
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

      case 'EXECUTE_ITEM_EVENT':
        await handleExecuteItemEvent(signal.payload);
        break;

      case 'CLEAR_GRAPH':
        handleClearGraph(signal.payload);
        break;

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
// Signal Handlers
// ============================================================================

async function handleExecuteScript(payload: ExecuteScriptPayload): Promise<void> {
  const startTime = performance.now();

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
    };

    const runner = new ScriptRunner(context);
    const result = await runner.run(payload.sourceCode);

    const executionTime = performance.now() - startTime;

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

    const result = await reactiveExecutor.onAttributeChange(
      payload.attributeId,
      payload.characterId,
      payload.rulesetId,
      payload.options || {},
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

async function handleExecuteItemEvent(payload: {
  itemId: string;
  characterId: string;
  eventType: string;
  requestId: string;
}): Promise<void> {
  try {
    // Get the item from database
    const item = await db.items.get(payload.itemId);
    if (!item) {
      throw new Error(`Item not found: ${payload.itemId}`);
    }

    // Get script for this item event
    const script = await db.scripts.where({ entityId: payload.itemId, entityType: 'item' }).first();

    if (!script) {
      throw new Error(`No script found for item: ${payload.itemId}`);
    }

    // Execute the script
    await handleExecuteScript({
      scriptId: script.id,
      sourceCode: script.sourceCode,
      characterId: payload.characterId,
      rulesetId: item.rulesetId,
      triggerType: 'item_event',
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
