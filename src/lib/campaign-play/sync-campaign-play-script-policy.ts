import { CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG } from '@/lib/campaign-play/campaign-play-constants';
import { getQBScriptClient } from '@/lib/compass-logic/worker/client';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import { getFeatureFlag } from '@/utils/feature-flags';

/** Push current feature flag + session to the QBScript worker (idempotent). */
export function syncCampaignPlayScriptPolicyToWorker(): void {
  const session = useCampaignPlaySessionStore.getState().session;
  getQBScriptClient().setCampaignPlayScriptPolicy({
    featureEnabled: getFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG),
    role: session?.role ?? null,
    sessionCampaignId: session?.campaignId ?? null,
  });
}
