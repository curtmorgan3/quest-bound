import type { DelegatedUiCharacterSelectRosterPayloadV1 } from '@/lib/campaign-play/realtime/campaign-realtime-envelopes';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { db } from '@/stores';
import type { Character } from '@/types';

export type CharacterSelectModalDelegatedRoster = {
  npcs: Array<{ character: Pick<Character, 'id' | 'name' | 'image' | 'isNpc'> }>;
  pcs: Array<{ character: Pick<Character, 'id' | 'name' | 'image' | 'isNpc'> }>;
};

/**
 * Builds the character picker roster on the **host** Dexie for a delegated `select_*` request.
 * Joiners often lack full `campaignCharacters` / `characters` rows; they render this snapshot instead.
 *
 * Eligibility matches the campaign branch of `CharacterSelectModal` / `useCharacterLists`: all PCs on
 * the roster, NPCs with `campaignCharacters.active === true`, optional `rulesetId` filter on rows.
 */
export async function buildDelegatedCharacterSelectRoster(
  campaignId: string,
  rulesetId: string,
): Promise<DelegatedUiCharacterSelectRosterPayloadV1> {
  const campaignCharacters = filterNotSoftDeleted(
    await db.campaignCharacters.where('campaignId').equals(campaignId).toArray(),
  );
  if (campaignCharacters.length === 0) {
    return { rosterNpcs: [], rosterPcs: [] };
  }

  const characters = await db.characters.bulkGet(campaignCharacters.map((cc) => cc.characterId));

  type Pair = { cc: (typeof campaignCharacters)[number]; character: NonNullable<(typeof characters)[number]> };
  const pairs: Pair[] = [];
  for (const cc of campaignCharacters) {
    const character = characters.find((c) => c?.id === cc.characterId);
    if (!character) continue;
    if (rulesetId && character.rulesetId !== rulesetId) continue;
    pairs.push({ cc, character });
  }

  const pcPairs = pairs
    .filter(({ cc, character }) => character.isNpc !== true || cc?.active === true)
    .filter(({ character }) => character.isNpc !== true)
    .sort((a, b) => (a.character.name ?? '').localeCompare(b.character.name ?? '', 'en'));

  const npcPairs = pairs
    .filter(({ character }) => character.isNpc === true)
    .filter(({ cc }) => cc?.active === true)
    .sort((a, b) => (a.character.name ?? '').localeCompare(b.character.name ?? '', 'en'));

  const toEntry = (p: Pair) => ({
    characterId: p.character.id,
    name: p.character.name ?? '',
    image: p.character.image ?? null,
  });

  return {
    rosterPcs: pcPairs.map(toEntry),
    rosterNpcs: npcPairs.map(toEntry),
  };
}

/** Maps wire payload to the character-select modal list shape (joiner or host local fallback). */
export function toCharacterSelectModalDelegatedRoster(
  payload: DelegatedUiCharacterSelectRosterPayloadV1,
): CharacterSelectModalDelegatedRoster {
  return {
    npcs: payload.rosterNpcs.map((e) => ({
      character: {
        id: e.characterId,
        name: e.name,
        image: e.image ?? undefined,
        isNpc: true,
      },
    })),
    pcs: payload.rosterPcs.map((e) => ({
      character: {
        id: e.characterId,
        name: e.name,
        image: e.image ?? undefined,
        isNpc: false,
      },
    })),
  };
}
