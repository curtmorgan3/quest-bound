import { expandCampaignBatchesForRealtimeLimit } from '@/lib/campaign-play/realtime/build-campaign-action-result-batches';
import { mergeRealtimeBatchesByTable } from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import {
  CAMPAIGN_REALTIME_PROTOCOL_VERSION,
  type CampaignRealtimeBulkPutBatchV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { getCampaignPlaySender } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import { db } from '@/stores/db/db';
import type { CampaignCharacter, Character } from '@/types';

function rowRecord<T extends object>(row: T): Record<string, unknown> {
  return { ...row } as Record<string, unknown>;
}

function buildRosterBatches(
  characterRows: Character[],
  campaignCharacterRows: CampaignCharacter[],
): CampaignRealtimeBulkPutBatchV1[] {
  const batches: CampaignRealtimeBulkPutBatchV1[] = [];
  if (characterRows.length > 0) {
    batches.push({
      table: 'characters',
      rows: characterRows.map((r) => rowRecord(r)),
    });
  }
  if (campaignCharacterRows.length > 0) {
    batches.push({
      table: 'campaignCharacters',
      rows: campaignCharacterRows.map((r) => rowRecord(r)),
    });
  }
  return batches;
}

/**
 * Broadcasts character and campaignCharacter rows to other campaign play participants.
 * No-ops when not subscribed to campaign realtime (no registered sender).
 */
export async function sendCampaignRosterUpdate(options: {
  campaignId: string;
  characterRows: Character[];
  campaignCharacterRows: CampaignCharacter[];
}): Promise<void> {
  const send = getCampaignPlaySender(options.campaignId);
  if (!send) return;

  const merged = mergeRealtimeBatchesByTable(
    buildRosterBatches(options.characterRows, options.campaignCharacterRows),
  );
  if (merged.length === 0) return;

  const expanded = expandCampaignBatchesForRealtimeLimit(merged);

  await send({
    v: CAMPAIGN_REALTIME_PROTOCOL_VERSION,
    kind: 'campaign_roster_update',
    updateId: crypto.randomUUID(),
    campaignId: options.campaignId,
    sentAt: new Date().toISOString(),
    batches: expanded,
  });
}

/**
 * Loads current Dexie rows by id and broadcasts them (for use right after a local write).
 */
export async function tryBroadcastCampaignRosterFromDexie(options: {
  campaignId: string;
  characterIds: string[];
  campaignCharacterIds: string[];
}): Promise<void> {
  const send = getCampaignPlaySender(options.campaignId);
  if (!send) return;

  const chars = (await db.characters.bulkGet(options.characterIds)).filter(
    (c): c is Character => c != null,
  );
  const ccs = (await db.campaignCharacters.bulkGet(options.campaignCharacterIds)).filter(
    (cc): cc is CampaignCharacter => cc != null,
  );

  await sendCampaignRosterUpdate({
    campaignId: options.campaignId,
    characterRows: chars,
    campaignCharacterRows: ccs,
  });
}
