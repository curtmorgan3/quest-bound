import { applyCampaignRealtimeBatches } from '@/lib/campaign-play/realtime/apply-campaign-realtime-batches';
import {
  buildCampaignPlayDeltaBatches,
  expandMergedCampaignDeltaBatches,
} from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import { getCampaignPlaySender, subscribeCampaignPlayEnvelopes } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeHostReactiveResultEnvelopeV1,
  CampaignRealtimeManualCharacterUpdateEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import {
  extractCharacterIdsFromManualBatches,
  validateCampaignManualUpdate,
} from '@/lib/campaign-play/realtime/validate-campaign-manual-update';
import { getQBScriptClient } from '@/lib/compass-logic/worker/client';
import { defaultScriptDiceRoller, defaultScriptDiceRollerSplit } from '@/utils/dice-utils';
import { db } from '@/stores';

const MANUAL_REACTIVE_TIMEOUT_MS = 120_000;

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
    const validation = await validateCampaignManualUpdate(db, this.campaignId, env.batches);
    if (!validation.ok) {
      console.warn('[CampaignPlayHostManualQueue]', validation.message);
      return;
    }

    const characterIds = extractCharacterIdsFromManualBatches(env.batches);
    const startedAtMs = Date.now();
    await applyCampaignRealtimeBatches(db, env.batches);

    const client = getQBScriptClient();
    const attrRows = env.batches
      .filter((b) => b.table === 'characterAttributes')
      .flatMap((b) => b.rows);

    const seen = new Set<string>();
    for (const row of attrRows) {
      const characterId = row.characterId;
      const attributeId = row.attributeId;
      if (typeof characterId !== 'string' || typeof attributeId !== 'string') continue;
      const key = `${characterId}:${attributeId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const character = await db.characters.get(characterId);
      if (!character?.rulesetId) continue;

      try {
        await client.onAttributeChange({
          attributeId,
          characterId,
          rulesetId: character.rulesetId,
          campaignId: this.campaignId,
          campaignSceneId: env.campaignSceneId,
          roll: defaultScriptDiceRoller,
          rollSplit: defaultScriptDiceRollerSplit,
          timeout: MANUAL_REACTIVE_TIMEOUT_MS,
        });
      } catch (e) {
        console.warn('[CampaignPlayHostManualQueue] onAttributeChange failed', e);
      }
    }

    const delta = await buildCampaignPlayDeltaBatches(db, this.campaignId, characterIds, startedAtMs);
    const expanded = expandMergedCampaignDeltaBatches(delta);

    const send = getCampaignPlaySender(this.campaignId);
    if (!send) return;

    const payload: CampaignRealtimeHostReactiveResultEnvelopeV1 = {
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'host_reactive_result',
      correlationId: env.updateId,
      campaignId: this.campaignId,
      sentAt: new Date().toISOString(),
      batches: expanded,
    };
    await send(payload);
  }
}
