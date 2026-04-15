import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Result shape for action event execution (avoids importing from reactive).
 */
export interface ExecuteActionEventResult {
  success: boolean;
  value: any;
  announceMessages: string[];
  logMessages: any[][];
  error?: Error;
  /** Component animations triggered by the action's on_activate/on_deactivate handler. */
  componentAnimations?: Array<{ characterId: string; referenceLabel: string; animation: string }>;
}

export type ExecuteActionEventFn = (
  actionId: string,
  characterId: string,
  targetId: string | null,
  eventType: 'on_activate' | 'on_deactivate',
) => Promise<ExecuteActionEventResult>;

/**
 * Runs item script events for an inventory row (on_equip, on_unequip, on_add, on_remove — same pipeline as the inventory UI where applicable).
 * Implemented by ScriptRunner context (worker / EventHandlerExecutor).
 */
export type ExecuteItemEventFn = (
  rulesetItemId: string,
  ownerCharacterId: string,
  eventType: 'on_equip' | 'on_unequip' | 'on_add' | 'on_remove',
  inventoryItemInstanceId: string,
) => Promise<ExecuteActionEventResult>;

/**
 * Proxy object for script-side action references from Owner.Action('name').
 * Exposes async activate() and deactivate() that run the action's event handlers
 * using the current execution's Owner and optional target character.
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread (e.g. log or return).
 */
export class ActionProxy implements StructuredCloneSafe {
  private actionId: string;
  private characterId: string;
  private targetId: string | null;
  private executeActionEvent: ExecuteActionEventFn | undefined;

  constructor(
    actionId: string,
    characterId: string,
    targetId: string | null,
    executeActionEvent: ExecuteActionEventFn | undefined,
  ) {
    this.actionId = actionId;
    this.characterId = characterId;
    this.targetId = targetId;
    this.executeActionEvent = executeActionEvent;
  }

  /**
   * Trigger the action's on_activate() handler. Uses the current execution's target character if any.
   */
  async activate(): Promise<ExecuteActionEventResult> {
    if (!this.executeActionEvent) {
      throw new Error('Action event execution is not available in this context');
    }
    return this.executeActionEvent(
      this.actionId,
      this.characterId,
      this.targetId,
      'on_activate',
    );
  }

  /**
   * Trigger the action's on_deactivate() handler. Uses the current execution's target character if any.
   */
  async deactivate(): Promise<ExecuteActionEventResult> {
    if (!this.executeActionEvent) {
      throw new Error('Action event execution is not available in this context');
    }
    return this.executeActionEvent(
      this.actionId,
      this.characterId,
      this.targetId,
      'on_deactivate',
    );
  }

  /**
   * Return a plain object for postMessage (structured clone).
   * Called at the worker boundary when script returns or logs an ActionProxy.
   */
  toStructuredCloneSafe(): { __type: 'ActionProxy'; actionId: string } {
    return { __type: 'ActionProxy', actionId: this.actionId };
  }
}
