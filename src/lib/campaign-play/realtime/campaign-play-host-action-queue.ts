import {
  buildCampaignActionResultBatches,
  expandCampaignBatchesForRealtimeLimit,
} from '@/lib/campaign-play/realtime/build-campaign-action-result-batches';
import { getCampaignPlaySender, subscribeCampaignPlayEnvelopes } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeActionRequestEnvelopeV1,
  CampaignRealtimeActionResultEnvelopeV1,
  CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { validateCampaignActionRequest } from '@/lib/campaign-play/realtime/validate-campaign-action-request';
import { getQBScriptClient } from '@/lib/compass-logic/worker/client';
import { db } from '@/stores';

const ACTION_SCRIPT_TIMEOUT_MS = 120_000;

/**
 * Serialized host queue for `action_request` (Phase 2.4). Order is preserved under rapid requests.
 */
export class CampaignPlayHostActionQueue {
  private readonly campaignId: string;
  private chain: Promise<void> = Promise.resolve();
  private unsub: (() => void) | null = null;

  constructor(campaignId: string) {
    this.campaignId = campaignId;
  }

  start(): void {
    if (this.unsub) return;
    this.unsub = subscribeCampaignPlayEnvelopes(this.campaignId, (envelope) => {
      if (envelope.kind !== 'action_request') return;
      if (envelope.campaignId !== this.campaignId) return;
      this.enqueue(envelope);
    });
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
    this.chain = Promise.resolve();
  }

  private enqueue(request: CampaignRealtimeActionRequestEnvelopeV1): void {
    this.chain = this.chain
      .then(() => this.processOne(request))
      .catch((err) => console.error('[CampaignPlayHostQueue]', err));
  }

  private async sendResult(payload: CampaignRealtimeActionResultEnvelopeV1): Promise<void> {
    const send = getCampaignPlaySender(this.campaignId);
    if (!send) return;
    await send(payload as CampaignRealtimeEnvelopeV1);
  }

  private async processOne(request: CampaignRealtimeActionRequestEnvelopeV1): Promise<void> {
    const validation = await validateCampaignActionRequest(db, this.campaignId, request.body);
    if (!validation.ok) {
      await this.sendResult({
        v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
        kind: 'action_result',
        requestId: request.requestId,
        campaignId: this.campaignId,
        batches: [],
        error: { code: validation.code, message: validation.message },
      });
      return;
    }

    const startedAtMs = Date.now();
    const client = getQBScriptClient();

    try {
      let exec: {
        announceMessages: string[];
        modifiedAttributeIds?: string[];
      };

      if (request.body.type === 'execute_action') {
        exec = await client.executeActionEvent(
          request.body.actionId,
          request.body.characterId,
          request.body.targetId ?? null,
          request.body.eventType,
          undefined,
          ACTION_SCRIPT_TIMEOUT_MS,
          this.campaignId,
          request.body.callerInventoryItemInstanceId,
          undefined,
          request.campaignSceneId,
        );
      } else {
        exec = await client.executeItemEvent(
          request.body.itemId,
          request.body.characterId,
          request.body.eventType,
          undefined,
          ACTION_SCRIPT_TIMEOUT_MS,
          this.campaignId,
          request.body.inventoryItemInstanceId,
          undefined,
          request.campaignSceneId,
        );
      }

      const rawBatches = await buildCampaignActionResultBatches(
        db,
        request.body.characterId,
        exec.modifiedAttributeIds ?? [],
        startedAtMs,
      );
      const batches = expandCampaignBatchesForRealtimeLimit(rawBatches);

      await this.sendResult({
        v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
        kind: 'action_result',
        requestId: request.requestId,
        campaignId: this.campaignId,
        batches,
        announceMessages: exec.announceMessages,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.sendResult({
        v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
        kind: 'action_result',
        requestId: request.requestId,
        campaignId: this.campaignId,
        batches: [],
        error: { code: 'execution_failed', message },
      });
    }
  }
}
