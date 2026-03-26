import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { resolveActiveCampaignCharacter } from '@/lib/campaign-play/realtime/resolve-active-campaign-character';
import type { DB } from '@/stores/db/hooks/types';

const ALLOWED_MANUAL_TABLES = new Set([
  'characterAttributes',
  'inventoryItems',
  'characterPages',
  'characterWindows',
]);

export type ValidateManualUpdateResult =
  | { ok: true; characterIds: string[] }
  | { ok: false; code: string; message: string };

/** Character IDs explicitly present on rows (does not resolve `inventoryItems` via `inventoryId`). */
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

async function collectResolvedCharacterIdsForManualUpdate(
  database: DB,
  batches: CampaignRealtimeBulkPutBatchV1[],
): Promise<ValidateManualUpdateResult> {
  const ids = new Set<string>();

  for (const b of batches) {
    if (b.table === 'characterAttributes') {
      for (const row of b.rows) {
        const cid = row.characterId;
        if (typeof cid !== 'string' || cid.trim() === '') {
          return {
            ok: false,
            code: 'no_character',
            message: 'Manual update must include rows with characterId',
          };
        }
        ids.add(cid.trim());
      }
      continue;
    }

    if (b.table === 'inventoryItems') {
      for (const row of b.rows) {
        const direct = row.characterId;
        if (typeof direct === 'string' && direct.trim() !== '') {
          ids.add(direct.trim());
          continue;
        }
        const invId = row.inventoryId;
        if (typeof invId !== 'string' || invId.trim() === '') {
          return {
            ok: false,
            code: 'inventory_item_missing_scope',
            message:
              'Inventory item rows must include characterId or inventoryId so the host can validate and persist them',
          };
        }
        const inv = (await database.inventories.get(invId.trim())) as
          | { characterId?: string }
          | undefined;
        const invCid = inv?.characterId;
        if (typeof invCid !== 'string' || invCid.trim() === '') {
          return {
            ok: false,
            code: 'inventory_not_found',
            message:
              'Could not resolve character for inventory item (inventory missing or has no character)',
          };
        }
        ids.add(invCid.trim());
      }
      continue;
    }

    if (b.table === 'characterPages' || b.table === 'characterWindows') {
      for (const row of b.rows) {
        const cid = row.characterId;
        if (typeof cid !== 'string' || cid.trim() === '') {
          return {
            ok: false,
            code: 'no_character',
            message: 'Manual update must include rows with characterId',
          };
        }
        ids.add(cid.trim());
      }
      continue;
    }
  }

  if (ids.size === 0) {
    return {
      ok: false,
      code: 'no_character',
      message: 'Manual update must include rows with characterId',
    };
  }

  return { ok: true, characterIds: Array.from(ids) };
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

  const collected = await collectResolvedCharacterIdsForManualUpdate(database, batches);
  if (!collected.ok) return collected;
  const characterIds = collected.characterIds;

  for (const characterId of characterIds) {
    const cc = await resolveActiveCampaignCharacter(database, campaignId, characterId);
    if (!cc) {
      return {
        ok: false,
        code: 'character_not_in_campaign',
        message: 'One or more characters are not active in this campaign',
      };
    }
  }

  return { ok: true, characterIds };
}
