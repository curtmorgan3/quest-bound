import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import type { DB } from '@/stores/db/hooks/types';

const ALLOWED_MANUAL_TABLES = new Set([
  'characterAttributes',
  'inventoryItems',
]);

export type ValidateManualUpdateResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function extractCharacterIdsFromManualBatches(
  batches: CampaignRealtimeBulkPutBatchV1[],
): string[] {
  const ids = new Set<string>();
  for (const b of batches) {
    for (const row of b.rows) {
      const cid = row.characterId;
      if (typeof cid === 'string' && cid.length > 0) ids.add(cid);
    }
  }
  return Array.from(ids);
}

export async function validateCampaignManualUpdate(
  database: DB,
  campaignId: string,
  batches: CampaignRealtimeBulkPutBatchV1[],
): Promise<ValidateManualUpdateResult> {
  if (batches.length === 0) {
    return { ok: false, code: 'empty_batches', message: 'No data in manual update' };
  }

  for (const b of batches) {
    if (!ALLOWED_MANUAL_TABLES.has(b.table)) {
      return {
        ok: false,
        code: 'table_not_allowed',
        message: `Table ${b.table} cannot be sent via manual_character_update`,
      };
    }
  }

  const characterIds = extractCharacterIdsFromManualBatches(batches);
  if (characterIds.length === 0) {
    return {
      ok: false,
      code: 'no_character',
      message: 'Manual update must include rows with characterId',
    };
  }

  for (const characterId of characterIds) {
    const cc = await database.campaignCharacters
      .where('[campaignId+characterId]')
      .equals([campaignId, characterId])
      .first();
    if (!cc || cc.deleted === true) {
      return {
        ok: false,
        code: 'character_not_in_campaign',
        message: 'One or more characters are not active in this campaign',
      };
    }
  }

  return { ok: true };
}
