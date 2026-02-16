/**
 * Result shape for action event execution (avoids importing from reactive).
 */
export interface ExecuteActionEventResult {
  success: boolean;
  value: any;
  announceMessages: string[];
  logMessages: any[][];
  error?: Error;
}

export type ExecuteActionEventFn = (
  actionId: string,
  characterId: string,
  targetId: string | null,
  eventType: 'on_activate' | 'on_deactivate',
) => Promise<ExecuteActionEventResult>;

/**
 * Proxy object for script-side action references from Owner.Action('name').
 * Exposes async activate() and deactivate() that run the action's event handlers
 * using the current execution's Owner and Target.
 */
export class ActionProxy {
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
   * Trigger the action's on_activate() handler. Uses the current execution's Target if any.
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
   * Trigger the action's on_deactivate() handler. Uses the current execution's Target if any.
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
}
