/**
 * Signal Protocol for QBScript Worker Communication
 *
 * This defines the message format for bidirectional communication
 * between the main thread and the QBScript Web Worker.
 */

import type { CampaignPlayScriptWorkerPolicy } from '@/lib/campaign-play/campaign-play-script-gate';

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
  | SetCampaignPlayScriptPolicySignal
  | RollResponseSignal
  | RollSplitResponseSignal
  | PromptResponseSignal
  | PromptMultipleResponseSignal
  | PromptInputResponseSignal
  | CharacterSelectResponseSignal
  | ClearGraphSignal
  | DispatchCustomEventSignal
  | SetCustomEventRulesetContextSignal;

export interface SetCampaignPlayScriptPolicySignal {
  type: 'SET_CAMPAIGN_PLAY_SCRIPT_POLICY';
  payload: CampaignPlayScriptWorkerPolicy;
}

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
    /** When set (e.g. character sheet in campaign play), guest clients skip script VM execution. */
    campaignId?: string;
  };
}

export interface ExecuteActionSignal {
  type: 'EXECUTE_ACTION';
  payload: {
    actionId: string;
    characterId: string;
    targetId?: string;
    requestId: string;
    campaignId?: string;
    campaignSceneId?: string;
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
    campaignSceneId?: string;
    /** When set (action fired from item context menu), Caller = itemInstanceProxy of this inventory item. */
    callerInventoryItemInstanceId?: string;
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
    campaignSceneId?: string;
    /** When set, Self in the item script refers to this inventory item instance instead of the first match by name. */
    inventoryItemInstanceId?: string;
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
    campaignSceneId?: string;
  };
}

/** Runs the script attached to a campaign scene event (on_enter, on_leave, on_activate). */
export interface ExecuteCampaignEventEventSignal {
  type: 'EXECUTE_CAMPAIGN_EVENT_EVENT';
  payload: {
    campaignEventId: string;
    campaignSceneId: string;
    /** When set, used for guest script gating without waiting on DB. */
    campaignId?: string;
    /** Character that triggered the event; may be omitted for ownerless campaign event scripts. */
    characterId?: string;
    eventType: 'on_enter' | 'on_leave' | 'on_activate';
    requestId: string;
  };
}

export interface RollResponseSignal {
  type: 'ROLL_RESPONSE';
  payload: { rollRequestId: string; value?: number; error?: string };
}

export interface RollSplitResponseSignal {
  type: 'ROLL_SPLIT_RESPONSE';
  payload: { rollRequestId: string; value?: number[]; error?: string };
}

export interface PromptResponseSignal {
  type: 'PROMPT_RESPONSE';
  payload: { promptRequestId: string; value?: string; error?: string };
}

export interface PromptMultipleResponseSignal {
  type: 'PROMPT_MULTIPLE_RESPONSE';
  payload: { promptRequestId: string; value?: string[]; error?: string };
}

export interface PromptInputResponseSignal {
  type: 'PROMPT_INPUT_RESPONSE';
  payload: { promptRequestId: string; value?: string; error?: string };
}

export interface CharacterSelectResponseSignal {
  type: 'SELECT_CHARACTER_RESPONSE';
  payload: { selectRequestId: string; characterIds?: string[]; error?: string };
}

export interface ClearGraphSignal {
  type: 'CLEAR_GRAPH';
  payload: {
    rulesetId?: string;
  };
}

/** Main thread → worker: run custom event listeners for a ruleset (JSON-serializable payload). */
export interface DispatchCustomEventSignal {
  type: 'DISPATCH_CUSTOM_EVENT';
  payload: {
    rulesetId: string;
    eventName: string;
    /** JSON-serializable only (structured clone). */
    payload?: unknown;
    /** Optional; forwarded for roll / delegated UI routing when listeners call roll(). */
    surfaceCharacterId?: string;
  };
}

/** Main thread → worker: active ruleset changed in the SPA; clears listeners for the previous ruleset. */
export interface SetCustomEventRulesetContextSignal {
  type: 'SET_CUSTOM_EVENT_RULESET_CONTEXT';
  payload: {
    rulesetId: string | null;
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
  | RollRequestSignal
  | RollSplitRequestSignal
  | PromptRequestSignal
  | PromptMultipleRequestSignal
  | PromptInputRequestSignal
  | CharacterSelectRequestSignal
  | AttributesModifiedByScriptSignal;

export interface RollRequestSignal {
  type: 'ROLL_REQUEST';
  payload: {
    executionRequestId: string;
    rollRequestId: string;
    expression: string;
    rerollMessage?: string;
    /** Character the roll UI is for (delegated campaign play routing; see joiner-rolls.md). */
    surfaceCharacterId: string;
  };
}

export interface RollSplitRequestSignal {
  type: 'ROLL_SPLIT_REQUEST';
  payload: {
    executionRequestId: string;
    rollRequestId: string;
    expression: string;
    rerollMessage?: string;
    surfaceCharacterId: string;
  };
}

export interface PromptRequestSignal {
  type: 'PROMPT_REQUEST';
  payload: {
    executionRequestId: string;
    promptRequestId: string;
    msg: string;
    choices: string[];
    /** Acting script character for delegated UI gating (always owner/actor, not accessor target). */
    surfaceCharacterId: string;
  };
}

export interface PromptMultipleRequestSignal {
  type: 'PROMPT_MULTIPLE_REQUEST';
  payload: {
    executionRequestId: string;
    promptRequestId: string;
    msg: string;
    choices: string[];
    surfaceCharacterId: string;
  };
}

export interface PromptInputRequestSignal {
  type: 'PROMPT_INPUT_REQUEST';
  payload: {
    executionRequestId: string;
    promptRequestId: string;
    msg: string;
    surfaceCharacterId: string;
  };
}

export interface CharacterSelectRequestSignal {
  type: 'SELECT_CHARACTER_REQUEST';
  payload: {
    executionRequestId: string;
    selectRequestId: string;
    mode: 'single' | 'multi';
    title?: string;
    description?: string;
    rulesetId: string;
    campaignId?: string;
    surfaceCharacterId: string;
  };
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

/** Sent when attributes were modified by script (for UI animation). */
export interface AttributesModifiedByScriptSignal {
  type: 'ATTRIBUTES_MODIFIED_BY_SCRIPT';
  payload: AttributesModifiedByScriptPayload;
}

export interface AttributesModifiedByScriptPayload {
  characterId: string;
  attributeIds: string[];
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
  /** When set, logs and script context are associated with this campaign. */
  campaignId?: string;
  /** When set with campaignId, scripts get Scene accessor. */
  campaignSceneId?: string;
  /** Optional params map exposed to QBScript as params.get('name'). Must be JSON-serializable. */
  params?: Record<string, any>;
}

export interface AttributeChangedPayload {
  attributeId: string;
  characterId: string;
  rulesetId: string;
  requestId: string;
  campaignId?: string;
  campaignSceneId?: string;
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
  /** Ruleset attribute IDs modified by this script run (for UI animation). */
  modifiedAttributeIds?: string[];
  /** Character whose attributes were modified (for UI animation). */
  characterId?: string;
  /** Optional list of character/page pairs that should be navigated to in the UI after execution. */
  navigateTargets?: { characterId: string; pageId: string }[];
  /** Component animations to trigger in the sheet viewer (by referenceLabel). */
  componentAnimations?: Array<{ characterId: string; referenceLabel: string; animation: string }>;
  /** Scene.spawnCharacter during script run; main thread loads Dexie rows and broadcasts roster. */
  rosterBroadcasts?: Array<{
    campaignId: string;
    characterId: string;
    campaignCharacterId: string;
  }>;
}

export interface ScriptErrorPayload {
  requestId: string;
  error: {
    message: string;
    line?: number;
    column?: number;
    stackTrace?: string;
  };
  /** ID of the script that failed (UI may resolve `name` from Dexie on the main thread). */
  scriptId?: string;
  /** @deprecated Prefer resolving display name from `scriptId` on the main thread. */
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
