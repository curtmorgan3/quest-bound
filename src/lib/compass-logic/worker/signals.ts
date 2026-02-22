/**
 * Signal Protocol for QBScript Worker Communication
 *
 * This defines the message format for bidirectional communication
 * between the main thread and the QBScript Web Worker.
 */

// ============================================================================
// Main Thread → Worker Signals
// ============================================================================

export type MainToWorkerSignal =
  | ExecuteScriptSignal
  | BuildDependencyGraphSignal
  | ValidateScriptSignal
  | AttributeChangedSignal
  | InitialAttributeSyncSignal
  | ExecuteActionSignal
  | ExecuteActionEventSignal
  | ExecuteItemEventSignal
  | ExecuteArchetypeEventSignal
  | ExecuteCampaignEventEventSignal
  | RollResponseSignal
  | ClearGraphSignal;

export interface ExecuteScriptSignal {
  type: 'EXECUTE_SCRIPT';
  payload: ExecuteScriptPayload;
}

export interface BuildDependencyGraphSignal {
  type: 'BUILD_DEPENDENCY_GRAPH';
  payload: {
    rulesetId: string;
    requestId: string;
  };
}

export interface ValidateScriptSignal {
  type: 'VALIDATE_SCRIPT';
  payload: {
    scriptId: string;
    sourceCode: string;
    requestId: string;
  };
}

export interface AttributeChangedSignal {
  type: 'ATTRIBUTE_CHANGED';
  payload: AttributeChangedPayload;
}

export interface InitialAttributeSyncSignal {
  type: 'RUN_INITIAL_ATTRIBUTE_SYNC';
  payload: {
    characterId: string;
    rulesetId: string;
    requestId: string;
  };
}

export interface ExecuteActionSignal {
  type: 'EXECUTE_ACTION';
  payload: {
    actionId: string;
    characterId: string;
    targetId?: string;
    requestId: string;
  };
}

/** Runs an action event handler (on_activate, on_deactivate) via EventHandlerExecutor. */
export interface ExecuteActionEventSignal {
  type: 'EXECUTE_ACTION_EVENT';
  payload: {
    actionId: string;
    characterId: string;
    targetId: string | null;
    eventType: 'on_activate' | 'on_deactivate';
    requestId: string;
    campaignId?: string;
  };
}

export interface ExecuteItemEventSignal {
  type: 'EXECUTE_ITEM_EVENT';
  payload: {
    itemId: string;
    characterId: string;
    eventType: string;
    requestId: string;
    campaignId?: string;
  };
}

/** Runs an archetype event handler (on_add, on_remove) via EventHandlerExecutor. */
export interface ExecuteArchetypeEventSignal {
  type: 'EXECUTE_ARCHETYPE_EVENT';
  payload: {
    archetypeId: string;
    characterId: string;
    eventType: 'on_add' | 'on_remove';
    requestId: string;
    campaignId?: string;
  };
}

/** Runs a campaign event script handler (on_enter, on_leave) when a character moves onto/off a tile. */
export interface ExecuteCampaignEventEventSignal {
  type: 'EXECUTE_CAMPAIGN_EVENT_EVENT';
  payload: {
    campaignEventLocationId: string;
    characterId: string;
    eventType: 'on_enter' | 'on_leave';
    requestId: string;
  };
}

export interface RollResponseSignal {
  type: 'ROLL_RESPONSE';
  payload: { rollRequestId: string; value?: number; error?: string };
}

export interface ClearGraphSignal {
  type: 'CLEAR_GRAPH';
  payload: {
    rulesetId?: string;
  };
}

// ============================================================================
// Worker → Main Thread Signals
// ============================================================================

export type WorkerToMainSignal =
  | ScriptResultSignal
  | ScriptErrorSignal
  | ConsoleLogSignal
  | AnnounceSignal
  | DependencyGraphBuiltSignal
  | ValidationResultSignal
  | WorkerErrorSignal
  | WorkerReadySignal
  | RollRequestSignal;

export interface RollRequestSignal {
  type: 'ROLL_REQUEST';
  payload: { executionRequestId: string; rollRequestId: string; expression: string };
}

export interface ScriptResultSignal {
  type: 'SCRIPT_RESULT';
  payload: ScriptResultPayload;
}

export interface ScriptErrorSignal {
  type: 'SCRIPT_ERROR';
  payload: ScriptErrorPayload;
}

export interface ConsoleLogSignal {
  type: 'CONSOLE_LOG';
  payload: {
    args: any[];
  };
}

export interface AnnounceSignal {
  type: 'ANNOUNCE';
  payload: {
    message: string;
  };
}

export interface DependencyGraphBuiltSignal {
  type: 'DEPENDENCY_GRAPH_BUILT';
  payload: {
    rulesetId: string;
    requestId: string;
    success: boolean;
    nodeCount?: number;
    edgeCount?: number;
  };
}

export interface ValidationResultSignal {
  type: 'VALIDATION_RESULT';
  payload: {
    requestId: string;
    valid: boolean;
    errors?: Array<{
      message: string;
      line?: number;
      column?: number;
    }>;
  };
}

export interface WorkerErrorSignal {
  type: 'WORKER_ERROR';
  payload: {
    message: string;
    stackTrace?: string;
  };
}

export interface WorkerReadySignal {
  type: 'WORKER_READY';
  payload: {
    timestamp: number;
  };
}

// ============================================================================
// Payload Definitions
// ============================================================================

export interface ExecuteScriptPayload {
  scriptId: string;
  sourceCode: string;
  characterId: string;
  targetId?: string;
  rulesetId: string;
  triggerType: 'load' | 'attribute_change' | 'action_click' | 'item_event';
  requestId: string;
  /** When script is attached to an entity (attribute, action, item), enables 'Self' in the script environment. */
  entityType?: string;
  entityId?: string;
}

export interface AttributeChangedPayload {
  attributeId: string;
  characterId: string;
  rulesetId: string;
  requestId: string;
  campaignId?: string;
  options?: {
    useTransaction?: boolean;
    maxExecutions?: number;
    maxPerScript?: number;
    timeLimit?: number;
  };
}

export interface ScriptResultPayload {
  requestId: string;
  result: any;
  announceMessages: string[];
  logMessages: any[][];
  executionTime: number;
}

export interface ScriptErrorPayload {
  requestId: string;
  error: {
    message: string;
    line?: number;
    column?: number;
    stackTrace?: string;
  };
  /** ID of the script that failed (e.g. initial sync or reactive run). */
  scriptId?: string;
  /** Name of the script that failed, for user-facing messages. */
  scriptName?: string;
  announceMessages?: string[];
  logMessages?: any[][];
}

// ============================================================================
// Helper Functions
// ============================================================================

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
