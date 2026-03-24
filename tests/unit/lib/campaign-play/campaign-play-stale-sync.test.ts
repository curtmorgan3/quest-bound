import { campaignPlayEnvelopeRefreshesMultiplayerView } from '@/lib/campaign-play/campaign-play-stale-sync';
import { describe, expect, it } from 'vitest';

describe('campaignPlayEnvelopeRefreshesMultiplayerView', () => {
  it('is true for host data envelopes', () => {
    expect(campaignPlayEnvelopeRefreshesMultiplayerView('action_result')).toBe(true);
    expect(campaignPlayEnvelopeRefreshesMultiplayerView('manual_character_update')).toBe(true);
    expect(campaignPlayEnvelopeRefreshesMultiplayerView('host_reactive_result')).toBe(true);
  });

  it('is false for heartbeats and action requests', () => {
    expect(campaignPlayEnvelopeRefreshesMultiplayerView('session_heartbeat')).toBe(false);
    expect(campaignPlayEnvelopeRefreshesMultiplayerView('action_request')).toBe(false);
  });
});
