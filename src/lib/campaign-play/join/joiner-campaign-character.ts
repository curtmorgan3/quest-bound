import { tryBroadcastCampaignRosterFromDexie } from '@/lib/campaign-play/realtime/broadcast-campaign-roster-update';
import type { CampaignRealtimeBulkPutBatchV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { sendCampaignPlayManualCharacterUpdate } from '@/lib/campaign-play/realtime/campaign-play-manual-broadcast';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { db } from '@/stores';
import type { CampaignCharacter, Character } from '@/types';

function rowRecord<T extends object>(row: T): Record<string, unknown> {
  return { ...row } as Record<string, unknown>;
}

/**
 * Sends attribute and inventory rows for the character when campaign realtime is connected.
 * No-ops when offline from the channel (joiner often connects after navigating to play).
 */
export async function tryBroadcastJoinerCharacterAssociatedRows(
  campaignId: string,
  characterId: string,
): Promise<void> {
  const attrs = filterNotSoftDeleted(
    await db.characterAttributes.where('characterId').equals(characterId).toArray(),
  );
  const items = filterNotSoftDeleted(
    await db.inventoryItems.where('characterId').equals(characterId).toArray(),
  );
  const batches: CampaignRealtimeBulkPutBatchV1[] = [];
  if (attrs.length > 0) {
    batches.push({
      table: 'characterAttributes',
      rows: attrs.map((r) => rowRecord(r)),
    });
  }
  if (items.length > 0) {
    batches.push({
      table: 'inventoryItems',
      rows: items.map((r) => rowRecord(r)),
    });
  }
  if (batches.length === 0) return;
  try {
    await sendCampaignPlayManualCharacterUpdate({ campaignId, batches });
  } catch {
    // No registered sender (e.g. not yet in campaign play view).
  }
}

/** Pushes character + campaignCharacter rows and related attributes/inventory over campaign realtime. */
export async function syncJoinerCharacterStateToCampaignRealtime(options: {
  campaignId: string;
  characterId: string;
  campaignCharacterId: string;
}): Promise<void> {
  await tryBroadcastCampaignRosterFromDexie({
    campaignId: options.campaignId,
    characterIds: [options.characterId],
    campaignCharacterIds: [options.campaignCharacterId],
  });
  await tryBroadcastJoinerCharacterAssociatedRows(options.campaignId, options.characterId);
}

/**
 * True when this local user already has a non-NPC character linked to the campaign (e.g. re-join).
 */
export async function joinerHasPlayableCampaignCharacter(
  campaignId: string,
  localUserId: string,
): Promise<boolean> {
  const ccs = filterNotSoftDeleted(
    await db.campaignCharacters.where('campaignId').equals(campaignId).toArray(),
  );
  if (ccs.length === 0) return false;
  const chars = await db.characters.bulkGet(ccs.map((c) => c.characterId));
  for (const ch of chars) {
    if (!ch || ch.isNpc === true || ch.isTestCharacter) continue;
    if (ch.userId === localUserId) return true;
  }
  return false;
}

/**
 * Playable characters for this ruleset owned by the local user that are not yet in the campaign.
 */
export async function listJoinableCharactersForCampaign(
  campaignId: string,
  rulesetId: string,
  localUserId: string,
): Promise<Character[]> {
  const ccs = filterNotSoftDeleted(
    await db.campaignCharacters.where('campaignId').equals(campaignId).toArray(),
  );
  const inCampaign = new Set(ccs.map((c) => c.characterId));
  const rows = await db.characters.where('rulesetId').equals(rulesetId).toArray();
  return rows.filter(
    (c) =>
      c.isNpc !== true &&
      !c.isTestCharacter &&
      c.userId === localUserId &&
      !inCampaign.has(c.id),
  );
}

export async function createJoinerCampaignCharacter(options: {
  campaignId: string;
  characterId: string;
  campaignSceneId?: string | null;
}): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.campaignCharacters.add({
    id,
    campaignId: options.campaignId,
    characterId: options.characterId,
    campaignSceneId: options.campaignSceneId ?? undefined,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  } as CampaignCharacter);
  void tryBroadcastCampaignRosterFromDexie({
    campaignId: options.campaignId,
    characterIds: [options.characterId],
    campaignCharacterIds: [id],
  })
    .then(() =>
      tryBroadcastJoinerCharacterAssociatedRows(options.campaignId, options.characterId),
    )
    .catch(() => {});
  return id;
}
