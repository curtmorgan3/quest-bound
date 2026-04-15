import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';

export function isCampaignPlayClientRelayForCampaign(campaignId: string | undefined): boolean {
  if (!campaignId) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  return session?.role === 'client' && session.campaignId === campaignId;
}

/** Host sheet edits: fan-out data-only batches after host reactives (see `broadcastHostCharacterDataAfterHostReactives`). */
export function isCampaignPlayHostBroadcastForCampaign(campaignId: string | undefined): boolean {
  if (!campaignId) return false;
  const session = useCampaignPlaySessionStore.getState().session;
  return session?.role === 'host' && session.campaignId === campaignId;
}
