import { applyCampaignRealtimeBatches } from '@/lib/campaign-play/realtime/apply-campaign-realtime-batches';
import {
  getCampaignPlaySender,
  subscribeCampaignPlayEnvelopes,
} from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import type {
  CampaignRealtimeActionRequestBodyV1,
  CampaignRealtimeEnvelopeV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { CAMPAIGN_REALTIME_PROTOCOL_VERSION } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { cloudClient } from '@/lib/cloud/client';
import { db } from '@/stores';

const DEFAULT_CLIENT_ACTION_TIMEOUT_MS = 60_000;

type Pending = {
  resolve: () => void;
  reject: (e: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingByRequestId = new Map<string, Pending>();
const pendingManualCorrelationIds = new Set<string>();

let unsub: (() => void) | null = null;
let activeCampaignId: string | null = null;

export function registerPendingCampaignManualUpdate(correlationId: string): void {
  pendingManualCorrelationIds.add(correlationId);
}

export function unregisterPendingCampaignManualUpdate(correlationId: string): void {
  pendingManualCorrelationIds.delete(correlationId);
}

function onEnvelope(campaignId: string, envelope: CampaignRealtimeEnvelopeV1): void {
  if (envelope.campaignId !== campaignId) return;

  if (envelope.kind === 'manual_character_update') {
    void (async () => {
      try {
        await applyCampaignRealtimeBatches(db, envelope.batches);
      } catch (e) {
        console.error('[CampaignPlayClientBridge] manual_character_update ingest failed', e);
      }
    })();
    return;
  }

  if (envelope.kind === 'host_reactive_result') {
    void (async () => {
      try {
        await applyCampaignRealtimeBatches(db, envelope.batches);
        for (const msg of envelope.announceMessages ?? []) {
          window.dispatchEvent(new CustomEvent('qbscript:announce', { detail: { message: msg } }));
        }
        pendingManualCorrelationIds.delete(envelope.correlationId);
      } catch (e) {
        console.error('[CampaignPlayClientBridge] host_reactive_result ingest failed', e);
      }
    })();
    return;
  }

  if (envelope.kind !== 'action_result') return;
  const entry = pendingByRequestId.get(envelope.requestId);

  void (async () => {
    try {
      if (envelope.error) {
        if (entry) {
          clearTimeout(entry.timeoutId);
          pendingByRequestId.delete(envelope.requestId);
          entry.reject(new Error(envelope.error.message));
        }
        return;
      }
      // All joiners ingest host-authored rows (e.g. another character's attributes updated by script).
      // Only the initiator has `entry` to settle the action_request promise.
      await applyCampaignRealtimeBatches(db, envelope.batches);
      for (const msg of envelope.announceMessages ?? []) {
        window.dispatchEvent(new CustomEvent('qbscript:announce', { detail: { message: msg } }));
      }
      if (entry) {
        clearTimeout(entry.timeoutId);
        pendingByRequestId.delete(envelope.requestId);
        entry.resolve();
      }
    } catch (e) {
      if (entry) {
        clearTimeout(entry.timeoutId);
        pendingByRequestId.delete(envelope.requestId);
        entry.reject(e instanceof Error ? e : new Error(String(e)));
      }
    }
  })();
}

export function startCampaignPlayClientActionBridge(campaignId: string): void {
  if (unsub && activeCampaignId === campaignId) return;
  stopCampaignPlayClientActionBridge();
  activeCampaignId = campaignId;
  unsub = subscribeCampaignPlayEnvelopes(campaignId, (env) => onEnvelope(campaignId, env));
}

export function stopCampaignPlayClientActionBridge(): void {
  unsub?.();
  unsub = null;
  activeCampaignId = null;
  pendingManualCorrelationIds.clear();
  for (const [, p] of pendingByRequestId) {
    clearTimeout(p.timeoutId);
    p.reject(new Error('Campaign realtime session ended'));
  }
  pendingByRequestId.clear();
}

export async function sendCampaignPlayClientActionRequest(options: {
  campaignId: string;
  campaignSceneId?: string;
  body: CampaignRealtimeActionRequestBodyV1;
  timeoutMs?: number;
  /** When omitted, filled from Supabase session user id when cloud is configured. */
  initiatorUserId?: string;
}): Promise<void> {
  const send = getCampaignPlaySender(options.campaignId);
  if (!send) {
    throw new Error('Campaign realtime is not connected');
  }

  let initiatorUserId = options.initiatorUserId;
  if (initiatorUserId === undefined && cloudClient) {
    const { data } = await cloudClient.auth.getSession();
    initiatorUserId = data.session?.user?.id;
  }

  const requestId = crypto.randomUUID();
  const timeoutMs = options.timeoutMs ?? DEFAULT_CLIENT_ACTION_TIMEOUT_MS;

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (pendingByRequestId.delete(requestId)) {
        reject(new Error('Action request timed out'));
      }
    }, timeoutMs);

    pendingByRequestId.set(requestId, {
      resolve: () => resolve(),
      reject: (e) => reject(e),
      timeoutId,
    });

    void send({
      v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
      kind: 'action_request',
      requestId,
      campaignId: options.campaignId,
      sentAt: new Date().toISOString(),
      campaignSceneId: options.campaignSceneId,
      ...(initiatorUserId ? { initiatorUserId } : {}),
      body: options.body,
    }).catch((err) => {
      const p = pendingByRequestId.get(requestId);
      if (p) {
        clearTimeout(p.timeoutId);
        pendingByRequestId.delete(requestId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}
