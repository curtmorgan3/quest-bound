import { db } from '@/stores';

/** Resolves the default archetype's test character for a ruleset, if present and valid. */
export async function getDefaultArchetypeTestCharacterId(rulesetId: string): Promise<string | null> {
  const defaultArchetype = await db.archetypes
    .where('rulesetId')
    .equals(rulesetId)
    .filter((a) => a.isDefault)
    .first();
  if (!defaultArchetype?.testCharacterId) return null;
  const testChar = await db.characters.get(defaultArchetype.testCharacterId);
  if (!testChar?.isTestCharacter) return null;
  return testChar.id;
}

/**
 * For each ruleset window id, updates `characterWindows` rows whose `characterId` has no character
 * row to the default archetype test character for the ruleset (single fallback lookup).
 */
export async function repairOrphanCharacterWindowsForRulesetWindows(
  rulesetId: string,
  windowIds: Iterable<string>,
): Promise<void> {
  const fallbackId = await getDefaultArchetypeTestCharacterId(rulesetId);
  if (!fallbackId) return;

  const now = new Date().toISOString();
  for (const windowId of new Set(windowIds)) {
    const rows = await db.characterWindows.where('windowId').equals(windowId).toArray();
    for (const cw of rows) {
      const character = await db.characters.get(cw.characterId);
      if (character) continue;
      await db.characterWindows.update(cw.id, {
        characterId: fallbackId,
        updatedAt: now,
      });
    }
  }
}
