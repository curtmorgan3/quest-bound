import { cloudClient } from '@/lib/cloud/client';

export type ResolvedCampaignJoin = {
  channelName: string;
  campaignId: string;
  rulesetId: string;
  campaignLabel: string | null;
  defaultCampaignSceneId: string | null;
};

/**
 * Calls `resolve_campaign_join_token` (SECURITY DEFINER). Requires an authenticated Supabase session.
 */
export async function resolveCampaignJoinToken(
  joinToken: string,
): Promise<ResolvedCampaignJoin | { error: string }> {
  if (!cloudClient) {
    return { error: 'Cloud is not configured' };
  }
  const trimmed = joinToken.trim();
  if (!trimmed) {
    return { error: 'Join token is required' };
  }

  const { data, error } = await cloudClient.rpc('resolve_campaign_join_token', {
    p_token: trimmed,
  });

  if (error) {
    return { error: error.message || 'Could not resolve join token' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    return { error: 'Invalid or expired join token' };
  }

  const r = row as Record<string, unknown>;
  const channelName = r.channel_name;
  const campaignId = r.campaign_id;
  const rulesetId = r.ruleset_id;
  if (typeof channelName !== 'string' || typeof campaignId !== 'string' || typeof rulesetId !== 'string') {
    return { error: 'Invalid or expired join token' };
  }

  const campaignLabel = r.campaign_label;
  const defaultScene = r.default_campaign_scene_id;

  return {
    channelName,
    campaignId,
    rulesetId,
    campaignLabel: typeof campaignLabel === 'string' ? campaignLabel : null,
    defaultCampaignSceneId: typeof defaultScene === 'string' ? defaultScene : null,
  };
}
