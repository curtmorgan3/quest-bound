import { tryBroadcastCampaignRosterFromDexie } from '@/lib/campaign-play/realtime/broadcast-campaign-roster-update';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { db } from '@/stores';
import type { CampaignCharacter, Character } from '@/types';

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
  }).catch(() => {});
  return id;
}
