import { getCampaignPlayBroadcastTopic } from '@/lib/campaign-play/realtime/campaign-channel-name';
import { cloudClient } from '@/lib/cloud/client';
import { generateCampaignJoinToken } from '@/lib/campaign-play/join/generate-join-token';

const TOKEN_COLLISION_RETRIES = 8;

export type CampaignPlayInviteRow = {
  join_token: string;
  channel_name: string;
  campaign_id: string;
  ruleset_id: string;
};

export async function fetchCampaignPlayInvite(
  campaignId: string,
): Promise<CampaignPlayInviteRow | null> {
  if (!cloudClient) return null;
  const { data, error } = await cloudClient
    .from('campaign_play_invites')
    .select('join_token, channel_name, campaign_id, ruleset_id')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error || !data) return null;
  return data as CampaignPlayInviteRow;
}

/**
 * Creates or replaces the invite for this campaign (new `join_token` each call = rotate).
 * Requires host session + `cloud_sync_enabled()` for the host (RLS).
 */
export async function upsertCampaignPlayInvite(options: {
  campaignId: string;
  rulesetId: string;
  campaignLabel?: string | null;
}): Promise<{ row: CampaignPlayInviteRow } | { error: string }> {
  if (!cloudClient) {
    return { error: 'Cloud is not configured' };
  }
  const {
    data: { session },
  } = await cloudClient.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) {
    return { error: 'Sign in required' };
  }

  const channelName = getCampaignPlayBroadcastTopic(options.campaignId);
  let lastError: string | null = null;

  for (let i = 0; i < TOKEN_COLLISION_RETRIES; i++) {
    const join_token = generateCampaignJoinToken();
    const payload = {
      campaign_id: options.campaignId,
      host_user_id: uid,
      join_token,
      channel_name: channelName,
      ruleset_id: options.rulesetId,
      campaign_label: options.campaignLabel ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await cloudClient
      .from('campaign_play_invites')
      .upsert(payload, { onConflict: 'campaign_id' })
      .select('join_token, channel_name, campaign_id, ruleset_id')
      .single();

    if (!error && data) {
      return { row: data as CampaignPlayInviteRow };
    }

    const msg = error?.message ?? 'Failed to save invite';
    lastError = msg;
    if (error?.code !== '23505') {
      return { error: msg };
    }
  }

  return { error: lastError ?? 'Could not generate a unique join token' };
}
