import { expandCampaignBatchesForRealtimeLimit } from '@/lib/campaign-play/realtime/build-campaign-action-result-batches';
import { mergeRealtimeBatchesByTable } from '@/lib/campaign-play/realtime/build-campaign-play-delta-batches';
import { getCampaignPlaySender } from '@/lib/campaign-play/realtime/campaign-play-realtime-dispatcher';
import {
  CAMPAIGN_REALTIME_PROTOCOL_VERSION,
  type CampaignRealtimeBulkPutBatchV1,
} from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { MAX_ROSTER_ROWS_PER_ENVELOPE } from '@/lib/campaign-play/realtime/validate-campaign-roster-update';
import { filterNotSoftDeleted, softDeletePatch } from '@/lib/data/soft-delete';
import { db } from '@/stores/db/db';
import type {
  CampaignCharacter,
  Character,
  CharacterArchetype,
  CharacterAttribute,
  InventoryItem,
} from '@/types';

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

type LeaveRosterDataRow =
  | { table: 'characterAttributes'; row: CharacterAttribute }
  | { table: 'inventoryItems'; row: InventoryItem }
  | { table: 'characterArchetypes'; row: CharacterArchetype };

/**
 * Notifies other participants (e.g. host) that this player left: tombstones campaignCharacter,
 * mirrored character row, attributes, inventory, and archetypes. Does not mutate local Dexie
 * (caller soft-deletes the campaignCharacter after this). No-op when not connected to realtime.
 */
export async function tryBroadcastCampaignPlayerLeave(options: {
  campaignId: string;
  campaignCharacterId: string;
}): Promise<void> {
  const send = getCampaignPlaySender(options.campaignId);
  if (!send) return;

  const cc = await db.campaignCharacters.get(options.campaignCharacterId);
  if (!cc || cc.deleted === true) return;

  const characterId = cc.characterId;
  const patch = softDeletePatch();
  const ccTomb: CampaignCharacter = { ...cc, ...patch };

  const character = await db.characters.get(characterId);
  const charTomb: Character | null = character ? { ...character, ...patch } : null;

  const attrs = filterNotSoftDeleted(
    await db.characterAttributes.where('characterId').equals(characterId).toArray(),
  );
  const items = filterNotSoftDeleted(
    await db.inventoryItems.where('characterId').equals(characterId).toArray(),
  );
  const archetypes = filterNotSoftDeleted(
    await db.characterArchetypes.where('characterId').equals(characterId).toArray(),
  );

  const data: LeaveRosterDataRow[] = [
    ...attrs.map((row) => ({ table: 'characterAttributes' as const, row: { ...row, ...patch } })),
    ...items.map((row) => ({ table: 'inventoryItems' as const, row: { ...row, ...patch } })),
    ...archetypes.map((row) => ({
      table: 'characterArchetypes' as const,
      row: { ...row, ...patch },
    })),
  ];

  const staticRowCount = 1 + (charTomb ? 1 : 0);
  const dataSlots = Math.max(1, MAX_ROSTER_ROWS_PER_ENVELOPE - staticRowCount);

  const sendLeaveChunk = async (dataSlice: LeaveRosterDataRow[]) => {
    const batches: CampaignRealtimeBulkPutBatchV1[] = [
      { table: 'campaignCharacters', rows: [rowRecord(ccTomb)] },
    ];
    if (charTomb) {
      batches.push({ table: 'characters', rows: [rowRecord(charTomb)] });
    }
    const byTable = new Map<string, Record<string, unknown>[]>();
    for (const entry of dataSlice) {
      const cur = byTable.get(entry.table) ?? [];
      cur.push(rowRecord(entry.row));
      byTable.set(entry.table, cur);
    }
    for (const [table, rows] of byTable) {
      batches.push({ table, rows });
    }

    const merged = mergeRealtimeBatchesByTable(batches);
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
  };

  if (data.length === 0) {
    await sendLeaveChunk([]);
    return;
  }

  for (let i = 0; i < data.length; i += dataSlots) {
    await sendLeaveChunk(data.slice(i, i + dataSlots));
  }
}
