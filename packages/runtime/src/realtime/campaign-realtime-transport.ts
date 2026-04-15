import {
  CAMPAIGN_PLAY_BROADCAST_EVENT,
  CAMPAIGN_REALTIME_PROTOCOL_VERSION,
  type CampaignRealtimeEnvelopeV1,
  parseCampaignRealtimeEnvelope,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { getCampaignPlayBroadcastTopic } from '@/lib/campaign-play/realtime/campaign-channel-name';
import type { CampaignPlayRole } from '@/stores/campaign-play-session-store';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/** Matches `@supabase/realtime-js` REALTIME_SUBSCRIBE_STATES (string literals). */
export type CampaignPlaySubscribeStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR';

export const CAMPAIGN_PLAY_HEARTBEAT_INTERVAL_MS = 15_000;
export const CAMPAIGN_PLAY_HOST_STALE_AFTER_MS = 45_000;

export interface CampaignPlayTransportOptions {
  campaignId: string;
  role: CampaignPlayRole;
  /** Called for every valid v1 envelope (including heartbeats). */
  onEnvelope: (envelope: CampaignRealtimeEnvelopeV1) => void;
  onSubscribeStatus: (status: CampaignPlaySubscribeStatus, err?: Error) => void;
}

export interface CampaignPlayTransportHandle {
  channelName: string;
  sendEnvelope: (envelope: CampaignRealtimeEnvelopeV1) => Promise<'ok' | 'error' | 'timed out'>;
  unsubscribe: () => Promise<void>;
}

function extractBroadcastPayload(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'payload' in payload) {
    return (payload as { payload: unknown }).payload;
  }
  return payload;
}

/**
 * Subscribe to the private Broadcast channel for this campaign. Caller must be authenticated for
 * `private: true` per project Realtime authorization rules.
 */
export function subscribeCampaignPlayTransport(
  client: SupabaseClient,
  options: CampaignPlayTransportOptions,
): CampaignPlayTransportHandle {
  const channelName = getCampaignPlayBroadcastTopic(options.campaignId);
  const channel: RealtimeChannel = client.channel(channelName, {
    config: {
      private: true,
      broadcast: { self: false },
    },
  });

  channel.on('broadcast', { event: CAMPAIGN_PLAY_BROADCAST_EVENT }, (payload) => {
    const inner = extractBroadcastPayload(payload);
    const parsed = parseCampaignRealtimeEnvelope(inner);
    if (parsed) options.onEnvelope(parsed);
  });

  channel.subscribe((status, err) => {
    options.onSubscribeStatus(status as CampaignPlaySubscribeStatus, err as Error | undefined);
  });

  return {
    channelName,
    sendEnvelope: async (envelope) => {
      if (envelope.v !== CAMPAIGN_REALTIME_PROTOCOL_VERSION) return 'error';
      return channel.send({
        type: 'broadcast',
        event: CAMPAIGN_PLAY_BROADCAST_EVENT,
        payload: envelope,
      });
    },
    unsubscribe: async () => {
      await channel.unsubscribe();
      await client.removeChannel(channel);
    },
  };
}
