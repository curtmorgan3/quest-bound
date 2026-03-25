import type { CampaignRealtimeEnvelopeV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';

/**
 * Joiner-side: host-driven payloads that refresh shared Dexie state after a reconnect (Phase 2.7).
 * Heartbeats alone do not clear "may be stale" — only data envelopes do.
 */
export function campaignPlayEnvelopeRefreshesMultiplayerView(
  kind: CampaignRealtimeEnvelopeV1['kind'],
): boolean {
  return (
    kind === 'action_result' ||
    kind === 'manual_character_update' ||
    kind === 'host_reactive_result' ||
    kind === 'campaign_roster_update'
  );
}
