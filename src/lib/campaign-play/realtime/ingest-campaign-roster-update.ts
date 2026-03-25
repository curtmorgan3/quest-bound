import { applyCampaignRealtimeBatches } from '@/lib/campaign-play/realtime/apply-campaign-realtime-batches';
import type { CampaignRealtimeRosterUpdateEnvelopeV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { validateCampaignRosterUpdateBatches } from '@/lib/campaign-play/realtime/validate-campaign-roster-update';
import type { DB } from '@/stores/db/hooks/types';

export async function ingestCampaignRosterUpdateIfValid(
  database: DB,
  envelope: CampaignRealtimeRosterUpdateEnvelopeV1,
): Promise<void> {
  const validation = await validateCampaignRosterUpdateBatches(
    database,
    envelope.campaignId,
    envelope.batches,
  );
  if (!validation.ok) {
    console.warn('[CampaignPlay] roster update rejected:', validation.message);
    return;
  }
  await applyCampaignRealtimeBatches(database, envelope.batches);
}
