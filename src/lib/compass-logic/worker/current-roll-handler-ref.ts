import type { RollFn, RollSplitFn } from '@/types';

/**
 * Ref for the current roll handler when the user is in a context that provides one
 * (e.g. character page with DiceContext). Used so attribute script execution
 * (onAttributeChange from Dexie hooks) uses the same roll handler as executeActionEvent.
 */
let currentRollHandler: RollFn | undefined;
let currentRollSplitHandler: RollSplitFn | undefined;

/**
 * Dice panel `rollDice` / split bridge, registered from {@link useDiceState} while the app shell
 * is mounted. Unlike {@link currentRollHandler}, this is not cleared when a character sheet closes,
 * so the campaign host action queue and delegated UI can always use the real dice panel for
 * `localRunner` and host-side roll fulfillment.
 */
let dicePanelRollForCampaignHostQueue: RollFn | undefined;
let dicePanelRollSplitForCampaignHostQueue: RollSplitFn | undefined;

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

export function setDicePanelRollHandlersForCampaignHostQueue(
  roll: RollFn | undefined,
  rollSplit: RollSplitFn | undefined,
): void {
  dicePanelRollForCampaignHostQueue = roll;
  dicePanelRollSplitForCampaignHostQueue = rollSplit;
}

export function getDicePanelRollHandlersForCampaignHostQueue(): {
  roll: RollFn | undefined;
  rollSplit: RollSplitFn | undefined;
} {
  return {
    roll: dicePanelRollForCampaignHostQueue,
    rollSplit: dicePanelRollSplitForCampaignHostQueue,
  };
}
