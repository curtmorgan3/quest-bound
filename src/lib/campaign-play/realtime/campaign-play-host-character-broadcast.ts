import {
  buildCampaignPlayDeltaBatches,
  expandMergedCampaignDeltaBatches,
  mergeRealtimeBatchesByTable,
} from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import { getCampaignRosterIngestTail } from '@/lib/campaign-play/realtime/campaign-play-host-roster-ingest-tail';
import { runManualUpdateAttributeReactives } from '@/lib/campaign-play/realtime/campaign-play-manual-attribute-reactives';
import { getCampaignPlaySender } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeBulkPutBatchV1,
  CampaignRealtimeHostReactiveResultEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { validateCampaignManualUpdate } from '@/lib/campaign-play/realtime/validate-campaign-manual-update';
import { db } from '@/stores';

/**
 * After the host edits Dexie locally, runs the same attribute reactives as the joiner manual queue,
 * then broadcasts a data-only `host_reactive_result` so clients `bulkPut` the merged rows (no scripts on joiners).
 */
export async function broadcastHostCharacterDataAfterHostReactives(options: {
  campaignId: string;
  campaignSceneId?: string;
  batches: CampaignRealtimeBulkPutBatchV1[];
}): Promise<void> {
  console.log('batches: ', options.batches);
  if (options.batches.length === 0) return;

  await getCampaignRosterIngestTail(options.campaignId);
  let validation = await validateCampaignManualUpdate(db, options.campaignId, options.batches);

  if (!validation.ok && validation.code === 'character_not_in_campaign') {
    for (let i = 0; i < 8; i++) {
      await new Promise<void>((r) => setTimeout(r, 64));
      await getCampaignRosterIngestTail(options.campaignId);
      validation = await validateCampaignManualUpdate(db, options.campaignId, options.batches);
      if (validation.ok) break;
      if (validation.code !== 'character_not_in_campaign') break;
    }
  }

  if (!validation.ok) {
    console.warn('[broadcastHostCharacterDataAfterHostReactives]', validation.message);
    return;
  }

  const { characterIds } = validation;
  const startedAtMs = Date.now();

  await runManualUpdateAttributeReactives({
    database: db,
    campaignId: options.campaignId,
    campaignSceneId: options.campaignSceneId,
    batches: options.batches,
  });

  const delta = await buildCampaignPlayDeltaBatches(
    db,
    options.campaignId,
    characterIds,
    startedAtMs,
  );
  const merged = mergeRealtimeBatchesByTable([...options.batches, ...delta]);
  const expanded = expandMergedCampaignDeltaBatches(merged);

  const send = getCampaignPlaySender(options.campaignId);
  if (!send) {
    console.warn(
      '[broadcastHostCharacterDataAfterHostReactives] no campaign realtime sender (not subscribed yet?)',
    );
    return;
  }

  const payload: CampaignRealtimeHostReactiveResultEnvelopeV1 = {
    v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
    kind: 'host_reactive_result',
    correlationId: crypto.randomUUID(),
    campaignId: options.campaignId,
    sentAt: new Date().toISOString(),
    batches: expanded,
  };
  const sendResult = await send(payload);
  if (sendResult !== 'ok') {
    console.warn(
      '[broadcastHostCharacterDataAfterHostReactives] realtime send failed:',
      sendResult,
    );
  }
}
