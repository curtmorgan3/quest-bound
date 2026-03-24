/** Exponential backoff for campaign realtime resubscribe (Phase 2.7), capped. */
export function nextCampaignPlayReconnectDelayMs(attemptIndex: number): number {
  const base = 1000 * Math.pow(2, Math.max(0, attemptIndex));
  return Math.min(30_000, base);
}

export const CAMPAIGN_PLAY_RECONNECT_MAX_ATTEMPTS = 8;
