import { get, set } from 'idb-keyval';

const KEY_PREFIX = 'qb.gameLogResetAt';

function getKey(rulesetId: string, characterId: string): string {
  return `${KEY_PREFIX}_${rulesetId}_${characterId}`;
}

/**
 * Get the timestamp after which the game log should show entries for this character.
 * Returns null if never cleared (show all up to limit).
 */
export async function getGameLogResetAt(
  rulesetId: string,
  characterId: string,
): Promise<number | null> {
  const value = await get<number>(getKey(rulesetId, characterId));
  return value ?? null;
}

/**
 * Set the game log "visible after" timestamp for this character.
 * After this, only logs with timestamp > resetAt are shown (clear = reset view, no delete).
 */
export async function setGameLogResetAt(
  rulesetId: string,
  characterId: string,
  resetAt: number,
): Promise<void> {
  await set(getKey(rulesetId, characterId), resetAt);
}
