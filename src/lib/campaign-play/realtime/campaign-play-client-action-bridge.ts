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
import { db } from '@/stores';

const DEFAULT_CLIENT_ACTION_TIMEOUT_MS = 60_000;

type Pending = {
  resolve: () => void;
  reject: (e: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

const pendingByRequestId = new Map<string, Pending>();

let unsub: (() => void) | null = null;
let activeCampaignId: string | null = null;

function onEnvelope(campaignId: string, envelope: CampaignRealtimeEnvelopeV1): void {
  if (envelope.kind !== 'action_result') return;
  if (envelope.campaignId !== campaignId) return;
  const entry = pendingByRequestId.get(envelope.requestId);
  if (!entry) return;

  void (async () => {
    try {
      if (envelope.error) {
        clearTimeout(entry.timeoutId);
        pendingByRequestId.delete(envelope.requestId);
        entry.reject(new Error(envelope.error.message));
        return;
      }
      await applyCampaignRealtimeBatches(db, envelope.batches);
      for (const msg of envelope.announceMessages ?? []) {
        window.dispatchEvent(
          new CustomEvent('qbscript:announce', { detail: { message: msg } }),
        );
      }
      clearTimeout(entry.timeoutId);
      pendingByRequestId.delete(envelope.requestId);
      entry.resolve();
    } catch (e) {
      clearTimeout(entry.timeoutId);
      pendingByRequestId.delete(envelope.requestId);
      entry.reject(e instanceof Error ? e : new Error(String(e)));
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
}): Promise<void> {
  const send = getCampaignPlaySender(options.campaignId);
  if (!send) {
    throw new Error('Campaign realtime is not connected');
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
