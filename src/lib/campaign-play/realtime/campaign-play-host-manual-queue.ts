import { applyCampaignRealtimeBatches } from '@/lib/campaign-play/realtime/apply-campaign-realtime-batches';
import { getCampaignRosterIngestTail } from '@/lib/campaign-play/realtime/campaign-play-host-roster-ingest-tail';
import {
  buildCampaignPlayDeltaBatches,
  expandMergedCampaignDeltaBatches,
} from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import {
  getCampaignPlaySender,
  subscribeCampaignPlayEnvelopes,
} from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeHostReactiveResultEnvelopeV1,
  CampaignRealtimeManualCharacterUpdateEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { runManualUpdateAttributeReactives } from '@/lib/campaign-play/realtime/campaign-play-manual-attribute-reactives';
import { validateCampaignManualUpdate } from '@/lib/campaign-play/realtime/validate-campaign-manual-update';
import { db } from '@/stores';

/**
 * Serialized host queue for `manual_character_update` (Phase 2.5): validate → apply → reactives → `host_reactive_result`.
 */
export class CampaignPlayHostManualQueue {
  private readonly campaignId: string;
  private chain: Promise<void> = Promise.resolve();
  private unsub: (() => void) | null = null;

  constructor(campaignId: string) {
    this.campaignId = campaignId;
  }

  start(): void {
    if (this.unsub) return;
    this.unsub = subscribeCampaignPlayEnvelopes(this.campaignId, (envelope) => {
      if (envelope.kind !== 'manual_character_update') return;
      if (envelope.campaignId !== this.campaignId) return;
      this.enqueue(envelope);
    });
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
    this.chain = Promise.resolve();
  }

  private enqueue(request: CampaignRealtimeManualCharacterUpdateEnvelopeV1): void {
    this.chain = this.chain
      .then(() => this.processOne(request))
      .catch((err) => console.error('[CampaignPlayHostManualQueue]', err));
  }

  private async processOne(env: CampaignRealtimeManualCharacterUpdateEnvelopeV1): Promise<void> {
    await getCampaignRosterIngestTail(this.campaignId);
    let validation = await validateCampaignManualUpdate(db, this.campaignId, env.batches);

    if (!validation.ok && validation.code === 'character_not_in_campaign') {
      for (let i = 0; i < 8; i++) {
        await new Promise<void>((r) => setTimeout(r, 64));
        await getCampaignRosterIngestTail(this.campaignId);
        validation = await validateCampaignManualUpdate(db, this.campaignId, env.batches);
        if (validation.ok) break;
        if (validation.code !== 'character_not_in_campaign') break;
      }
    }

    if (!validation.ok) {
      console.warn('[CampaignPlayHostManualQueue]', validation.message);
      return;
    }

    const { characterIds } = validation;
    const startedAtMs = Date.now();
    await applyCampaignRealtimeBatches(db, env.batches);

    await runManualUpdateAttributeReactives({
      database: db,
      campaignId: this.campaignId,
      campaignSceneId: env.campaignSceneId,
      batches: env.batches,
    });

    const delta = await buildCampaignPlayDeltaBatches(
      db,
      this.campaignId,
      characterIds,
      startedAtMs,
    );
    const expanded = expandMergedCampaignDeltaBatches(delta);

    const send = getCampaignPlaySender(this.campaignId);
    if (!send) {
      console.warn('[CampaignPlayHostManualQueue] no campaign realtime sender (not subscribed yet?)');
      return;
    }

    const payload: CampaignRealtimeHostReactiveResultEnvelopeV1 = {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'host_reactive_result',
      correlationId: env.updateId,
      campaignId: this.campaignId,
      sentAt: new Date().toISOString(),
      batches: expanded,
    };
    const sendResult = await send(payload);
    if (sendResult !== 'ok') {
      console.warn('[CampaignPlayHostManualQueue] realtime send failed:', sendResult);
    }
  }
}
