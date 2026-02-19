import { db } from '@/stores';
import type { CharacterPage, CharacterWindow, InventoryItem } from '@/types';

/**
 * Duplicates character data from a source (template) character to a target character.
 * Copies characterAttributes, characterPages (sharing pages), characterWindows, and inventoryItems.
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

  // 1. Character attributes
  const sourceAttributes = await db.characterAttributes
    .where('characterId')
    .equals(sourceCharacterId)
    .toArray();

  await db.characterAttributes.bulkAdd(
    sourceAttributes.map((ca) => ({
      ...ca,
      id: crypto.randomUUID(),
      characterId: targetCharacterId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  // 2. Character pages (share same pageIds; create new join records)
  const sourceCharacterPages = await db.characterPages
    .where('characterId')
    .equals(sourceCharacterId)
    .toArray();

  const characterPageIdMap = new Map<string, string>();

  for (const cp of sourceCharacterPages) {
    const newJoinId = crypto.randomUUID();
    characterPageIdMap.set(cp.id, newJoinId);
    await db.characterPages.add({
      id: newJoinId,
      characterId: targetCharacterId,
      pageId: cp.pageId,
      createdAt: now,
      updatedAt: now,
    } as CharacterPage);
  }

  // 3. Character windows (map characterPageIds)
  const sourceWindows = await db.characterWindows
    .where('characterId')
    .equals(sourceCharacterId)
    .toArray();

  for (const cw of sourceWindows) {
    const mappedCharacterPageId = cw.characterPageId
      ? characterPageIdMap.get(cw.characterPageId) ?? cw.characterPageId
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
