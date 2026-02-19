import { db } from '@/stores';

/**
 * Delete a ruleset and all its related data (characters, attributes, actions, etc.).
 * Used when replacing a ruleset on import and when cleaning up a temp ruleset after add-module-from-zip.
 */
export async function deleteRulesetAndRelatedData(rulesetId: string): Promise<void> {
  const characters = await db.characters.where('rulesetId').equals(rulesetId).toArray();
  const characterIds = characters.map((c) => c.id);
  for (const cid of characterIds) {
    const characterInventories = await db.inventories.where('characterId').equals(cid).toArray();
    const inventoryIds = characterInventories.map((inv) => inv.id);
    if (inventoryIds.length > 0) {
      await db.inventoryItems.where('inventoryId').anyOf(inventoryIds).delete();
    }
    await db.characterAttributes.where('characterId').equals(cid).delete();
    await db.inventories.where('characterId').equals(cid).delete();
    await db.characterWindows.where('characterId').equals(cid).delete();
    await db.characterPages.where('characterId').equals(cid).delete();
  }
  await db.characters.where('rulesetId').equals(rulesetId).delete();
  const windowIds = (await db.windows.where('rulesetId').equals(rulesetId).toArray()).map(
    (w) => w.id,
  );
  if (windowIds.length > 0) {
    await db.components.where('windowId').anyOf(windowIds).delete();
  }
  await db.attributes.where('rulesetId').equals(rulesetId).delete();
  await db.items.where('rulesetId').equals(rulesetId).delete();
  await db.actions.where('rulesetId').equals(rulesetId).delete();
  await db.charts.where('rulesetId').equals(rulesetId).delete();
  await db.assets.where('rulesetId').equals(rulesetId).delete();
  await db.windows.where('rulesetId').equals(rulesetId).delete();
  await db.rulesetPages.where('rulesetId').equals(rulesetId).delete();
  await db.rulesetWindows.where('rulesetId').equals(rulesetId).delete();
  await db.fonts.where('rulesetId').equals(rulesetId).delete();
  await db.documents.where('rulesetId').equals(rulesetId).delete();
  await db.scripts.where('rulesetId').equals(rulesetId).delete();
  await db.diceRolls.where('rulesetId').equals(rulesetId).delete();
  await db.scriptErrors.where('rulesetId').equals(rulesetId).delete();
  await db.scriptLogs.where('rulesetId').equals(rulesetId).delete();
  await db.dependencyGraphNodes.where('rulesetId').equals(rulesetId).delete();
  await db.rulesets.delete(rulesetId);
}
