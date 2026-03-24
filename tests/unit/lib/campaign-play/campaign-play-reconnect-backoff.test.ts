import {
  CAMPAIGN_PLAY_RECONNECT_MAX_ATTEMPTS,
  nextCampaignPlayReconnectDelayMs,
} from '@/lib/campaign-play/campaign-play-reconnect-backoff';
import { describe, expect, it } from 'vitest';

describe('nextCampaignPlayReconnectDelayMs', () => {
  it('doubles with a 30s cap', () => {
    expect(nextCampaignPlayReconnectDelayMs(0)).toBe(1000);
    expect(nextCampaignPlayReconnectDelayMs(1)).toBe(2000);
    expect(nextCampaignPlayReconnectDelayMs(10)).toBe(30_000);
  });
});

describe('CAMPAIGN_PLAY_RECONNECT_MAX_ATTEMPTS', () => {
  it('matches hook limit', () => {
    expect(CAMPAIGN_PLAY_RECONNECT_MAX_ATTEMPTS).toBe(8);
  });
});
