import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { getQBScriptClient } from '@/lib/compass-logic/worker/client';
import type { DB } from '@/stores/db/hooks/types';
import { defaultScriptDiceRoller, defaultScriptDiceRollerSplit } from '@/utils/dice-utils';

export const MANUAL_UPDATE_ATTRIBUTE_REACTIVE_TIMEOUT_MS = 120_000;

/**
 * Runs `onAttributeChange` for each distinct characterId/attributeId in `characterAttributes` batches.
 * Used after manual character rows are applied on the host (joiner relay or host sheet edits).
 */
export async function runManualUpdateAttributeReactives(options: {
  database: DB;
  campaignId: string;
  campaignSceneId?: string;
  batches: CampaignRealtimeBulkPutBatchV1[];
}): Promise<void> {
  const client = getQBScriptClient();
  const attrRows = options.batches
    .filter((b) => b.table === 'characterAttributes')
    .flatMap((b) => b.rows);

  const seen = new Set<string>();
  for (const row of attrRows) {
    const characterId = row.characterId;
    const attributeId = row.attributeId;
    if (typeof characterId !== 'string' || typeof attributeId !== 'string') continue;
    const key = `${characterId}:${attributeId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const character = await options.database.characters.get(characterId);
    if (!character?.rulesetId) continue;

    try {
      await client.onAttributeChange({
        attributeId,
        characterId,
        rulesetId: character.rulesetId,
        campaignId: options.campaignId,
        campaignSceneId: options.campaignSceneId,
        roll: defaultScriptDiceRoller,
        rollSplit: defaultScriptDiceRollerSplit,
        timeout: MANUAL_UPDATE_ATTRIBUTE_REACTIVE_TIMEOUT_MS,
      });
    } catch (e) {
      console.warn('[runManualUpdateAttributeReactives] onAttributeChange failed', e);
    }
  }
}
