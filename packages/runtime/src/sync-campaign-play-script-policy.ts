import { getQBScriptClient } from '@/lib/compass-logic/worker/client';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';

/** Push current feature flag + session to the QBScript worker (idempotent). */
export function syncCampaignPlayScriptPolicyToWorker(): void {
  const session = useCampaignPlaySessionStore.getState().session;
  getQBScriptClient().setCampaignPlayScriptPolicy({
    featureEnabled: true,
    role: session?.role ?? null,
    sessionCampaignId: session?.campaignId ?? null,
  });
}
