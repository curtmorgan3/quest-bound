/**
 * Serializes host-side roster Dexie writes so later envelopes (e.g. manual_character_update
 * with characterAttributes) are not validated before campaignCharacters/characters exist.
 */
const rosterIngestTailByCampaignId = new Map<string, Promise<void>>();

export function chainCampaignRosterIngest(
  campaignId: string,
  work: () => Promise<void>,
): void {
  const prev = rosterIngestTailByCampaignId.get(campaignId) ?? Promise.resolve();
  rosterIngestTailByCampaignId.set(
    campaignId,
    prev.then(work).catch((e) => {
      console.error('[CampaignPlay] roster ingest failed', e);
    }),
  );
}

export function getCampaignRosterIngestTail(campaignId: string): Promise<void> {
  return rosterIngestTailByCampaignId.get(campaignId) ?? Promise.resolve();
}
