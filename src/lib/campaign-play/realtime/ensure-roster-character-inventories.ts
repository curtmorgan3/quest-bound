import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { isNotSoftDeleted } from '@/lib/data/soft-delete';
import type { DB } from '@/stores/db/hooks/types';
import type { Character } from '@/types';

function collectRosterLinkedCharacterIds(batches: CampaignRealtimeBulkPutBatchV1[]): Set<string> {
  const ids = new Set<string>();
  for (const b of batches) {
    if (b.table === 'characters') {
      for (const row of b.rows) {
        if (row.deleted === true) continue;
        const id = row.id;
        if (typeof id === 'string' && id.trim() !== '') ids.add(id.trim());
      }
    } else if (b.table === 'campaignCharacters') {
      for (const row of b.rows) {
        if (row.deleted === true) continue;
        const cid = row.characterId;
        if (typeof cid === 'string' && cid.trim() !== '') ids.add(cid.trim());
      }
    }
  }
  return ids;
}

/**
 * Ensures each non-deleted character touched by a roster ingest has an `inventories` row.
 * Character `creating` hooks do not run during realtime `bulkPut` (`isSyncing`), so the host
 * must backfill inventories after applying peer roster data (mirrors local character-hooks).
 */
async function ensureInventoryForCharacterOnHost(database: DB, characterId: string): Promise<void> {
  const character = await database.characters.get(characterId);
  if (!isNotSoftDeleted(character)) return;

  const ch = character as Character;
  const now = new Date().toISOString();
  const invId = typeof ch.inventoryId === 'string' ? ch.inventoryId.trim() : '';

  if (invId !== '') {
    const existing = await database.inventories.get(invId);
    if (existing) return;
    await database.inventories.add({
      id: invId,
      characterId: ch.id,
      rulesetId: ch.rulesetId,
      title: `${ch.name}'s Inventory`,
      category: null,
      type: null,
      entities: [],
      createdAt: ch.createdAt ?? now,
      updatedAt: now,
    });
    return;
  }

  const newInvId = crypto.randomUUID();
  await database.inventories.add({
    id: newInvId,
    characterId: ch.id,
    rulesetId: ch.rulesetId,
    title: `${ch.name}'s Inventory`,
    category: null,
    type: null,
    entities: [],
    createdAt: now,
    updatedAt: now,
  });
  await database.characters.update(ch.id, { inventoryId: newInvId, updatedAt: now });
}

export async function ensureInventoriesAfterCampaignRosterIngest(
  database: DB,
  batches: CampaignRealtimeBulkPutBatchV1[],
): Promise<void> {
  const ids = collectRosterLinkedCharacterIds(batches);
  for (const id of ids) {
    await ensureInventoryForCharacterOnHost(database, id);
  }
}
