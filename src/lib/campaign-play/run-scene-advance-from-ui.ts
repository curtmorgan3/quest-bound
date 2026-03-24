import { shouldBlockCampaignOrchestration } from '@/lib/campaign-play/campaign-play-orchestration-gate';
import { useCharacterSelectModalStore } from '@/stores/character-select-modal-store';
import { usePromptModalStore } from '@/stores/prompt-modal-store';
import type {
  PromptFn,
  PromptInputFn,
  PromptMultipleFn,
  SelectCharacterFn,
  SelectCharactersFn,
} from '@/types';
import {
  ScriptRunner,
  type ScriptExecutionContext,
} from '@/lib/compass-logic/runtime/script-runner';

/**
 * Run the shared advance-turn flow from the UI (e.g. "Next turn" button).
 * Uses the same logic as Scene.advanceTurnOrder() in script: advances state and runs callbacks.
 */
export async function runSceneAdvanceFromUI(
  context: Pick<
    ScriptExecutionContext,
    'db' | 'rulesetId' | 'campaignId' | 'campaignSceneId' | 'roll'
  >,
): Promise<void> {
  if (shouldBlockCampaignOrchestration(context.campaignId)) {
    return;
  }

  const prompt: PromptFn = (msg: string, choices: string[]) =>
    usePromptModalStore.getState().show(msg, choices);

  const promptMultiple: PromptMultipleFn = (msg: string, choices: string[]) =>
    usePromptModalStore.getState().showMultiple(msg, choices);

  const promptInput: PromptInputFn = (msg: string) => usePromptModalStore.getState().showInput(msg);

  const selectCharacter: SelectCharacterFn = async (title?: string, description?: string) => {
    const { characterIds } = await useCharacterSelectModalStore.getState().show({
      mode: 'single',
      title,
      description,
      rulesetId: context.rulesetId,
      campaignId: context.campaignId,
    });

    return characterIds[0] ?? null;
  };

  const selectCharacters: SelectCharactersFn = async (title?: string, description?: string) => {
    const { characterIds } = await useCharacterSelectModalStore.getState().show({
      mode: 'multi',
      title,
      description,
      rulesetId: context.rulesetId,
      campaignId: context.campaignId,
    });

    return characterIds;
  };

  const runner = new ScriptRunner({
    ...(context as ScriptExecutionContext),
    prompt,
    promptMultiple,
    promptInput,
    selectCharacter,
    selectCharacters,
  });
  await runner.runAdvanceTurnOrder();
}
