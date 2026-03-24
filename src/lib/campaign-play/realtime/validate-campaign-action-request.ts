import type { CampaignRealtimeActionRequestBodyV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import type { DB } from '@/stores/db/hooks/types';

export type ValidateCampaignActionResult =
  | { ok: true; rulesetId: string }
  | { ok: false; code: string; message: string };

/**
 * Host-side validation: membership in campaign (non-deleted) and ruleset match for action/item.
 */
export async function validateCampaignActionRequest(
  database: DB,
  campaignId: string,
  body: CampaignRealtimeActionRequestBodyV1,
): Promise<ValidateCampaignActionResult> {
  const campaign = await database.campaigns.get(campaignId);
  if (!campaign) {
    return { ok: false, code: 'campaign_not_found', message: 'Campaign not found' };
  }

  const cc = await database.campaignCharacters
    .where('[campaignId+characterId]')
    .equals([campaignId, body.characterId])
    .first();
  if (!cc || cc.deleted === true) {
    return {
      ok: false,
      code: 'character_not_in_campaign',
      message: 'Character is not an active member of this campaign',
    };
  }

  if (body.type === 'execute_action') {
    const action = await database.actions.get(body.actionId);
    if (!action) {
      return { ok: false, code: 'action_not_found', message: 'Action not found' };
    }
    if (action.rulesetId !== campaign.rulesetId) {
      return { ok: false, code: 'ruleset_mismatch', message: 'Action does not belong to this campaign ruleset' };
    }
    return { ok: true, rulesetId: campaign.rulesetId };
  }

  const item = await database.items.get(body.itemId);
  if (!item) {
    return { ok: false, code: 'item_not_found', message: 'Item not found' };
  }
  if (item.rulesetId !== campaign.rulesetId) {
    return { ok: false, code: 'ruleset_mismatch', message: 'Item does not belong to this campaign ruleset' };
  }
  return { ok: true, rulesetId: campaign.rulesetId };
}
