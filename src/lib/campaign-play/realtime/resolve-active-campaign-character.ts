import { isNotSoftDeleted } from '@/lib/data/soft-delete';
import type { DB } from '@/stores/db/hooks/types';
import type { CampaignCharacter } from '@/types';

function firstActive(rows: CampaignCharacter[]): CampaignCharacter | undefined {
  return rows.find(isNotSoftDeleted);
}

/**
 * Resolves a non-deleted campaignCharacters row for realtime validation.
 * Uses the compound index first, then falls back to campaignId + in-memory match so we still
 * find the row if the compound index misses (e.g. legacy data) or characterId casing differs.
 *
 * When multiple rows share the same (campaignId, characterId) — e.g. a tombstone plus a new
 * active link — we return the first non-deleted match, not `.first()` on the index alone.
 */
export async function resolveActiveCampaignCharacter(
  database: DB,
  campaignId: string,
  characterId: string,
): Promise<CampaignCharacter | undefined> {
  const c = campaignId.trim();
  const ch = characterId.trim();
  if (!c || !ch) return undefined;

  const compoundMatches = await database.campaignCharacters
    .where('[campaignId+characterId]')
    .equals([c, ch])
    .toArray();
  const fromCompound = firstActive(compoundMatches);
  if (fromCompound) {
    return fromCompound;
  }

  const rows = await database.campaignCharacters.where('campaignId').equals(c).toArray();
  const chLower = ch.toLowerCase();
  const idMatches = rows.filter(
    (r) => r.characterId === ch || r.characterId.toLowerCase() === chLower,
  );
  return firstActive(idMatches);
}
