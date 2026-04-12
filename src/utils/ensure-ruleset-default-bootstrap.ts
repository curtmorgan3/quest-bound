import { db } from '@/stores';
import type { Character } from '@/types';

/**
 * Ensures a ruleset has a default test character and default archetype pointing at it.
 * Idempotent: matches the `rulesets` `creating` hook behavior so callers can run this
 * synchronously before other work (the hook defers via `setTimeout(0)`, which races
 * `createRuleset` + immediate `addModuleToRuleset`).
 */
export async function ensureRulesetDefaultTestCharacterAndArchetype(
  rulesetId: string,
  createdBy: string,
): Promise<void> {
  const now = new Date().toISOString();

  let testCharacter = await db.characters
    .where('rulesetId')
    .equals(rulesetId)
    .filter((c) => (c as Character).isTestCharacter)
    .first();

  if (!testCharacter) {
    const characterId = crypto.randomUUID();
    await db.characters.add({
      id: characterId,
      rulesetId,
      userId: createdBy,
      name: 'Test Character',
      assetId: null,
      image: null,
      isTestCharacter: true,
      componentData: new Map(),
      pinnedSidebarDocuments: [],
      pinnedSidebarCharts: [],
      lastViewedPageId: null,
      sheetLocked: false,
      createdAt: now,
      updatedAt: now,
    } as unknown as Character);
    testCharacter = (await db.characters.get(characterId)) as Character;
  }

  if (testCharacter) {
    const archetypeCount = await db.archetypes.where('rulesetId').equals(rulesetId).count();
    if (archetypeCount === 0) {
      await db.archetypes.add({
        id: crypto.randomUUID(),
        rulesetId,
        name: 'Default',
        description: '',
        testCharacterId: testCharacter.id,
        isDefault: true,
        loadOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
