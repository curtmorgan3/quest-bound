import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';

/** Host-only flows: scene turn advance, campaign event activation, turn-mode toggles, etc. */
export function shouldBlockCampaignOrchestration(campaignId: string | undefined): boolean {
  if (!campaignId) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  if (!session || session.campaignId !== campaignId) return false;
  return session.role === 'client';
}

/**
 * When the guest's UI should treat scripted / host-driven actions as disabled (client role, or host offline).
 */
export function shouldDisableCampaignGuestActions(campaignId: string | undefined): boolean {
  if (!campaignId) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  if (!session || session.campaignId !== campaignId) return false;
  if (session.role !== 'client') return false;
  return !session.hostSessionActive;
}

export function getCampaignPlayGuestNotice(
  campaignId: string | undefined,
): { variant: 'guest' | 'hostOffline' } | null {
  if (!campaignId) return null;
  const session = useCampaignPlaySessionStore.getState().session;
  if (!session || session.campaignId !== campaignId || session.role !== 'client') return null;
  if (!session.hostSessionActive) return { variant: 'hostOffline' };
  return { variant: 'guest' };
}
