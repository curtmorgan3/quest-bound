/**
 * Broadcast topic naming for campaign play (Phase 2.3).
 * Phase 2.6 may persist `channel_name` on the invite row; until then host and peers
 * derive the same string from `campaignId` so dev/staging can subscribe without RPC.
 */
export function getCampaignPlayBroadcastTopic(campaignId: string): string {
  return `campaign-play:${campaignId}`;
}
