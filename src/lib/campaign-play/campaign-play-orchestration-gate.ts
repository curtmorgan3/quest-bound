import { CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG } from '@/lib/campaign-play/campaign-play-constants';
import { getFeatureFlag } from '@/utils/feature-flags';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';

/** Host-only flows: scene turn advance, campaign event activation, turn-mode toggles, etc. */
export function shouldBlockCampaignOrchestration(campaignId: string | undefined): boolean {
  if (!campaignId) return false;
  if (!getFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG)) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  if (!session || session.campaignId !== campaignId) return false;
  return session.role === 'client';
}

/**
 * When the guest's UI should treat scripted / host-driven actions as disabled (client role, or host offline).
 */
export function shouldDisableCampaignGuestActions(campaignId: string | undefined): boolean {
  if (!campaignId) return false;
  if (!getFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG)) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  if (!session || session.campaignId !== campaignId) return false;
  if (session.role !== 'client') return false;
  return !session.hostSessionActive;
}

export function getCampaignPlayGuestNotice(
  campaignId: string | undefined,
): { variant: 'guest' | 'hostOffline' } | null {
  if (!campaignId) return null;
  if (!getFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG)) return null;
  const session = useCampaignPlaySessionStore.getState().session;
  if (!session || session.campaignId !== campaignId || session.role !== 'client') return null;
  if (!session.hostSessionActive) return { variant: 'hostOffline' };
  return { variant: 'guest' };
}
