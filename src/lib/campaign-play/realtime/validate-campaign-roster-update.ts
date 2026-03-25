import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import type { DB } from '@/stores/db/hooks/types';

const ROSTER_TABLES = new Set(['characters', 'campaignCharacters']);
const MAX_ROSTER_ROWS_PER_ENVELOPE = 50;

export type ValidateCampaignRosterUpdateResult =
  | { ok: true }
  | { ok: false; message: string };

function rowCampaignId(row: Record<string, unknown>): string | undefined {
  const v = row.campaignId;
  return typeof v === 'string' ? v : undefined;
}

function rowRulesetId(row: Record<string, unknown>): string | undefined {
  const v = row.rulesetId;
  return typeof v === 'string' ? v : undefined;
}

/**
 * Ensures roster bulkPut batches only touch allowed tables and match the host campaign ruleset.
 */
export async function validateCampaignRosterUpdateBatches(
  database: DB,
  campaignId: string,
  batches: CampaignRealtimeBulkPutBatchV1[],
): Promise<ValidateCampaignRosterUpdateResult> {
  if (batches.length === 0) {
    return { ok: false, message: 'Empty roster batches' };
  }

  const campaign = await database.campaigns.get(campaignId);
  if (!campaign) {
    return { ok: false, message: 'Unknown campaign' };
  }
  const rulesetId = campaign.rulesetId;

  let rowCount = 0;
  for (const b of batches) {
    if (!ROSTER_TABLES.has(b.table)) {
      return { ok: false, message: `Roster update cannot include table ${b.table}` };
    }
    rowCount += b.rows.length;
    if (rowCount > MAX_ROSTER_ROWS_PER_ENVELOPE) {
      return { ok: false, message: 'Too many roster rows in one update' };
    }

    if (b.table === 'campaignCharacters') {
      for (const row of b.rows) {
        if (rowCampaignId(row) !== campaignId) {
          return { ok: false, message: 'campaignCharacter row campaignId mismatch' };
        }
      }
    }

    if (b.table === 'characters') {
      for (const row of b.rows) {
        if (rowRulesetId(row) !== rulesetId) {
          return { ok: false, message: 'Character row rulesetId mismatch' };
        }
      }
    }
  }

  return { ok: true };
}
