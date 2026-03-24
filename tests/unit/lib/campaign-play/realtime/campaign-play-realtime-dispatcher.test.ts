import {
  dispatchCampaignPlayEnvelope,
  subscribeCampaignPlayEnvelopes,
} from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import { describe, expect, it } from 'vitest';

describe('campaign-play-realtime-dispatcher', () => {
  it('delivers envelopes to subscribers', () => {
    const seen: string[] = [];
    const unsub = subscribeCampaignPlayEnvelopes('c1', (e) => {
      if (e.kind === 'session_heartbeat') seen.push(e.sentAt);
    });
    dispatchCampaignPlayEnvelope('c1', {
      v: 1,
      kind: 'session_heartbeat',
      campaignId: 'c1',
      role: 'host',
      sentAt: 't1',
    });
    expect(seen).toEqual(['t1']);
    unsub();
  });

  it('does not notify after unsubscribe', () => {
    let n = 0;
    const unsub = subscribeCampaignPlayEnvelopes('c2', () => {
      n++;
    });
    unsub();
    dispatchCampaignPlayEnvelope('c2', {
      v: 1,
      kind: 'session_heartbeat',
      campaignId: 'c2',
      role: 'host',
      sentAt: 't',
    });
    expect(n).toBe(0);
  });
});
