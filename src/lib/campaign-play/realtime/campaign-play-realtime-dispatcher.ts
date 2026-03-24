import type { CampaignRealtimeEnvelopeV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';

type Listener = (envelope: CampaignRealtimeEnvelopeV1) => void;

const byCampaign = new Map<string, Set<Listener>>();

export function subscribeCampaignPlayEnvelopes(
  campaignId: string,
  listener: Listener,
): () => void {
  let set = byCampaign.get(campaignId);
  if (!set) {
    set = new Set();
    byCampaign.set(campaignId, set);
  }
  set.add(listener);
  return () => {
    const s = byCampaign.get(campaignId);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) byCampaign.delete(campaignId);
  };
}

export function dispatchCampaignPlayEnvelope(
  campaignId: string,
  envelope: CampaignRealtimeEnvelopeV1,
): void {
  const set = byCampaign.get(campaignId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(envelope);
    } catch (e) {
      console.error('[CampaignPlay] envelope listener error', e);
    }
  }
}

type SendFn = (
  envelope: CampaignRealtimeEnvelopeV1,
) => Promise<'ok' | 'error' | 'timed out'>;

const senders = new Map<string, SendFn>();

export function registerCampaignPlaySender(campaignId: string, send: SendFn): void {
  senders.set(campaignId, send);
}

export function unregisterCampaignPlaySender(campaignId: string): void {
  senders.delete(campaignId);
}

export function getCampaignPlaySender(campaignId: string): SendFn | undefined {
  return senders.get(campaignId);
}
