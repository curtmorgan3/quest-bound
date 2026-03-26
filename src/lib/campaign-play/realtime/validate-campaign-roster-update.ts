import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import type { DB } from '@/stores/db/hooks/types';

const ROSTER_TABLES = new Set([
  'characters',
  'campaignCharacters',
  'characterAttributes',
  'inventoryItems',
  'characterArchetypes',
]);

/** Exported for leave broadcasts that chunk tombstones under this cap per envelope. */
export const MAX_ROSTER_ROWS_PER_ENVELOPE = 50;

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

function rowCharacterId(row: Record<string, unknown>): string | undefined {
  const v = row.characterId;
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

  const rosterCharacterIds = new Set<string>();
  for (const b of batches) {
    if (b.table !== 'campaignCharacters') continue;
    for (const row of b.rows) {
      const cid = rowCharacterId(row);
      if (cid) rosterCharacterIds.add(cid);
    }
  }

  const hasLeaveSideTables = batches.some(
    (b) =>
      b.table === 'characterAttributes' ||
      b.table === 'inventoryItems' ||
      b.table === 'characterArchetypes',
  );
  if (hasLeaveSideTables && rosterCharacterIds.size === 0) {
    return {
      ok: false,
      message: 'Roster update with attribute/inventory rows requires campaignCharacter rows',
    };
  }

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

    if (b.table === 'characterAttributes' || b.table === 'inventoryItems' || b.table === 'characterArchetypes') {
      for (const row of b.rows) {
        if (row.deleted !== true) {
          return { ok: false, message: 'Roster-linked sheet rows must be tombstones (deleted: true)' };
        }
        const cid = rowCharacterId(row);
        if (!cid || !rosterCharacterIds.has(cid)) {
          return { ok: false, message: 'Roster sheet row characterId does not match campaignCharacter in envelope' };
        }
      }
    }
  }

  return { ok: true };
}
