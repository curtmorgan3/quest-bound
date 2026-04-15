import {
  getCampaignPlayClientActionPendingCount,
  subscribeCampaignPlayClientActionPending,
} from '@/lib/campaign-play/realtime/campaign-play-client-action-bridge';
import { useSyncExternalStore } from 'react';

/** In-flight host action requests for this campaign (joiner client awaiting `action_result`). */
export function useCampaignPlayClientActionPending(campaignId: string | undefined): number {
  return useSyncExternalStore(
    (onStoreChange) =>
      campaignId ? subscribeCampaignPlayClientActionPending(campaignId, onStoreChange) : () => {},
    () => (campaignId ? getCampaignPlayClientActionPendingCount(campaignId) : 0),
    () => 0,
  );
}
