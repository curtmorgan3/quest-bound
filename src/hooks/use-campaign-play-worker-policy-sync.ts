import { syncCampaignPlayScriptPolicyToWorker } from '@/lib/campaign-play/sync-campaign-play-script-policy';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import { useEffect } from 'react';

/**
 * Keeps the QBScript worker's campaign play policy in sync with the Zustand session + feature flags.
 */
export function useCampaignPlayWorkerPolicySync(): void {
  useEffect(() => {
    const push = () => syncCampaignPlayScriptPolicyToWorker();
    push();
    const unsubStore = useCampaignPlaySessionStore.subscribe(push);
    window.addEventListener('feature-flag-change', push);
    return () => {
      unsubStore();
      window.removeEventListener('feature-flag-change', push);
    };
  }, []);
}
