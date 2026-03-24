import {
  expandMergedCampaignDeltaBatches,
  mergeRealtimeBatchesByTable,
} from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import {
  registerPendingCampaignManualUpdate,
  unregisterPendingCampaignManualUpdate,
} from '@/lib/campaign-play/realtime/campaign-play-client-action-bridge';
import { getCampaignPlaySender } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';

export async function sendCampaignPlayManualCharacterUpdate(options: {
  campaignId: string;
  campaignSceneId?: string;
  batches: CampaignRealtimeBulkPutBatchV1[];
}): Promise<void> {
  const send = getCampaignPlaySender(options.campaignId);
  if (!send) {
    throw new Error('Campaign realtime is not connected');
  }

  const updateId = crypto.randomUUID();
  registerPendingCampaignManualUpdate(updateId);

  const merged = mergeRealtimeBatchesByTable(options.batches);
  const expanded = expandMergedCampaignDeltaBatches(merged);

  try {
    await send({
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'manual_character_update',
      updateId,
      campaignId: options.campaignId,
      sentAt: new Date().toISOString(),
      campaignSceneId: options.campaignSceneId,
      batches: expanded,
    });
  } catch (e) {
    unregisterPendingCampaignManualUpdate(updateId);
    throw e;
  }
}
