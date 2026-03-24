import { parseCampaignRealtimeEnvelope } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { describe, expect, it } from 'vitest';

describe('parseCampaignRealtimeEnvelope', () => {
  it('parses session_heartbeat', () => {
    const raw = {
      v: 1,
      kind: 'session_heartbeat',
      campaignId: 'c1',
      role: 'host',
      sentAt: '2025-01-01T00:00:00.000Z',
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses action_request', () => {
    const raw = {
      v: 1,
      kind: 'action_request',
      requestId: 'r1',
      campaignId: 'c1',
      sentAt: '2025-01-01T00:00:00.000Z',
      body: { type: 'use_item', itemId: 'i1', characterId: 'ch1' },
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('parses action_result with batches', () => {
    const raw = {
      v: 1,
      kind: 'action_result',
      requestId: 'r1',
      campaignId: 'c1',
      batches: [{ table: 'characterAttributes', rows: [{ id: 'a1', value: 1 }] }],
    };
    expect(parseCampaignRealtimeEnvelope(raw)).toEqual(raw);
  });

  it('rejects wrong version', () => {
    expect(parseCampaignRealtimeEnvelope({ v: 2, kind: 'session_heartbeat' })).toBeNull();
  });

  it('rejects invalid batches', () => {
    expect(
      parseCampaignRealtimeEnvelope({
        v: 1,
        kind: 'action_result',
        requestId: 'r1',
        campaignId: 'c1',
        batches: [{ table: 1, rows: [] }],
      }),
    ).toBeNull();
  });
});
