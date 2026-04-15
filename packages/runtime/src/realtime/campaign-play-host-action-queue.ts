import {
  buildCampaignPlayDeltaBatches,
  expandMergedCampaignDeltaBatches,
  resolveCampaignCharacterIdsForActionResultDelta,
} from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import { subscribeCampaignPlayHostDelegatedUiResponses } from '@/lib/campaign-play/realtime/campaign-play-delegated-ui-host';
import { getCampaignPlaySender, subscribeCampaignPlayEnvelopes } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeActionRequestEnvelopeV1,
  CampaignRealtimeActionResultEnvelopeV1,
  CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { validateCampaignActionRequest } from '@/lib/campaign-play/realtime/validate-campaign-action-request';
import { getDicePanelRollHandlersForCampaignHostQueue } from '@/lib/compass-logic/worker/current-roll-handler-ref';
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
  private delegatedUnsub: (() => void) | null = null;

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
    this.delegatedUnsub = subscribeCampaignPlayHostDelegatedUiResponses(this.campaignId);
  }

  stop(): void {
    this.unsub?.();
    this.unsub = null;
    this.delegatedUnsub?.();
    this.delegatedUnsub = null;
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

    const delegatedHostRun =
      request.initiatorUserId != null && request.initiatorUserId !== ''
        ? {
            campaignId: this.campaignId,
            executionRequestId: request.requestId,
            timeoutMs: ACTION_SCRIPT_TIMEOUT_MS,
            delegationSurfaceCharacterId: request.body.characterId,
            initiatorCloudUserId: request.initiatorUserId,
          }
        : undefined;

    try {
      let exec: {
        announceMessages: string[];
        modifiedAttributeIds?: string[];
      };

      const { roll: dicePanelRoll, rollSplit: dicePanelRollSplit } =
        getDicePanelRollHandlersForCampaignHostQueue();

      if (request.body.type === 'execute_action') {
        exec = await client.executeActionEvent(
          request.body.actionId,
          request.body.characterId,
          request.body.targetId ?? null,
          request.body.eventType,
          dicePanelRoll,
          ACTION_SCRIPT_TIMEOUT_MS,
          this.campaignId,
          request.body.callerInventoryItemInstanceId,
          dicePanelRollSplit,
          request.campaignSceneId,
          delegatedHostRun,
        );
      } else {
        exec = await client.executeItemEvent(
          request.body.itemId,
          request.body.characterId,
          request.body.eventType,
          dicePanelRoll,
          ACTION_SCRIPT_TIMEOUT_MS,
          this.campaignId,
          request.body.inventoryItemInstanceId,
          dicePanelRollSplit,
          request.campaignSceneId,
          delegatedHostRun,
        );
      }

      const deltaCharacterIds = await resolveCampaignCharacterIdsForActionResultDelta(
        db,
        this.campaignId,
        {
          actingCharacterId: request.body.characterId,
          startedAtMs,
          modifiedAttributeIds: exec.modifiedAttributeIds,
        },
      );
      const rawBatches = await buildCampaignPlayDeltaBatches(
        db,
        this.campaignId,
        deltaCharacterIds,
        startedAtMs,
      );
      const batches = expandMergedCampaignDeltaBatches(rawBatches);

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
