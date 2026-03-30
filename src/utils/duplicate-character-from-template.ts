import { db } from '@/stores';
import type { CharacterAttribute, CharacterPage, CharacterWindow, InventoryItem } from '@/types';

/**
 * Duplicates character data from a source (template) character to a target character.
 * Creates characterAttributes from the ruleset defaults (one per ruleset attribute).
 * Copies characterPages (sharing pages), characterWindows, and inventoryItems.
 * Used when creating a new character from an archetype's test character.
 */
export async function duplicateCharacterFromTemplate(
  sourceCharacterId: string,
  targetCharacterId: string,
  targetInventoryId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const sourceCharacter = await db.characters.get(sourceCharacterId);
  if (!sourceCharacter?.inventoryId) {
    throw new Error('Source character has no inventory');
  }
  const sourceInventoryId = sourceCharacter.inventoryId;

  const targetCharacter = await db.characters.get(targetCharacterId);
  if (!targetCharacter?.rulesetId) {
    throw new Error('Target character has no ruleset');
  }

  // 1. Character attributes: one per ruleset attribute, each set to its default value
  const rulesetAttributes = await db.attributes
    .where('rulesetId')
    .equals(targetCharacter.rulesetId)
    .toArray();

  await db.characterAttributes.bulkAdd(
    rulesetAttributes.map(
      (attr) =>
        ({
          ...attr,
          id: crypto.randomUUID(),
          characterId: targetCharacterId,
          attributeId: attr.id,
          value: attr.defaultValue,
          createdAt: now,
          updatedAt: now,
        }) as CharacterAttribute,
    ),
  );

  // 2. Character pages (share same pageIds; create new join records)
  let pagesSourceCharacterId = sourceCharacterId;
  let sourceCharacterPages = await db.characterPages
    .where('characterId')
    .equals(sourceCharacterId)
    .toArray();

  // If the source character has no pages (older/partial templates), fall back
  // to duplicating the pages from the default archetype's test character.
  if (sourceCharacterPages.length === 0) {
    const defaultArchetype = await db.archetypes
      .where('rulesetId')
      .equals(targetCharacter.rulesetId)
      .filter((a) => a.isDefault)
      .first();

    if (!defaultArchetype?.testCharacterId) {
      throw new Error('No default archetype test character found');
    }

    pagesSourceCharacterId = defaultArchetype.testCharacterId;
    sourceCharacterPages = await db.characterPages
      .where('characterId')
      .equals(pagesSourceCharacterId)
      .toArray();
  }

  const characterPageIdMap = new Map<string, string>();

  for (const cp of sourceCharacterPages) {
    const newJoinId = crypto.randomUUID();
    characterPageIdMap.set(cp.id, newJoinId);
    await db.characterPages.add({
      id: newJoinId,
      characterId: targetCharacterId,
      pageId: cp.pageId,
      label: cp.label,
      createdAt: now,
      updatedAt: now,
    } as CharacterPage);
  }

  // 3. Character windows (map characterPageIds)
  const sourceWindows = await db.characterWindows
    .where('characterId')
    .equals(pagesSourceCharacterId)
    .toArray();

  for (const cw of sourceWindows) {
    const mappedCharacterPageId = cw.characterPageId
      ? (characterPageIdMap.get(cw.characterPageId) ?? cw.characterPageId)
      : cw.characterPageId;

    await db.characterWindows.add({
      id: crypto.randomUUID(),
      characterId: targetCharacterId,
      characterPageId: mappedCharacterPageId,
      windowId: cw.windowId,
      title: cw.title,
      x: cw.x,
      y: cw.y,
      isCollapsed: cw.isCollapsed,
      displayScale: cw.displayScale,
      createdAt: now,
      updatedAt: now,
    } as CharacterWindow);
  }

  // 4. Inventory items
  const sourceInventoryItems = await db.inventoryItems
    .where('inventoryId')
    .equals(sourceInventoryId)
    .toArray();

  for (const item of sourceInventoryItems) {
    await db.inventoryItems.add({
      ...item,
      id: crypto.randomUUID(),
      inventoryId: targetInventoryId,
      createdAt: now,
      updatedAt: now,
    } as InventoryItem);
  }
}
