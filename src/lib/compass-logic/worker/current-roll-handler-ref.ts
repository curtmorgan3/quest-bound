import type { RollFn, RollSplitFn } from '@/types';

/**
 * Ref for the current roll handler when the user is in a context that provides one
 * (e.g. character page with DiceContext). Used so attribute script execution
 * (onAttributeChange from Dexie hooks) uses the same roll handler as executeActionEvent.
 */
let currentRollHandler: RollFn | undefined;
let currentRollSplitHandler: RollSplitFn | undefined;

export function getCurrentRollHandlerForScripts(): RollFn | undefined {
  return currentRollHandler;
}

export function setCurrentRollHandlerForScripts(roll: RollFn | undefined): void {
  currentRollHandler = roll;
}

export function getCurrentRollSplitHandlerForScripts(): RollSplitFn | undefined {
  return currentRollSplitHandler;
}

export function setCurrentRollSplitHandlerForScripts(rollSplit: RollSplitFn | undefined): void {
  currentRollSplitHandler = rollSplit;
}
