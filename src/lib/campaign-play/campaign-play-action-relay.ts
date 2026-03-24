import { CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG } from '@/lib/campaign-play/campaign-play-constants';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import { getFeatureFlag } from '@/utils/feature-flags';

export function isCampaignPlayClientRelayForCampaign(campaignId: string | undefined): boolean {
  if (!campaignId || !getFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG)) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  return session?.role === 'client' && session.campaignId === campaignId;
}
