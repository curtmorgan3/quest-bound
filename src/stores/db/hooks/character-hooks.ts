import { getQBScriptClient } from '@/lib/compass-logic/worker';
import type { DB } from './types';

export function registerCharacterDbHooks(db: DB) {
  // Fire script client onAttributeChange when a character attribute's value is updated
  db.characterAttributes.hook('updating', (modifications, _primKey, obj) => {
    const mods = modifications as { value?: unknown };
    if (mods.value === undefined) return;
    const characterId = (obj as { characterId?: string })?.characterId;
    const attributeId = (obj as { attributeId?: string })?.attributeId;
    if (!characterId || !attributeId) return;
    setTimeout(async () => {
      try {
        const character = obj;
        const rulesetId = (character as { rulesetId?: string } | undefined)?.rulesetId;
        if (!rulesetId) return;
        const client = getQBScriptClient();
        client
          .onAttributeChange({
            attributeId,
            characterId,
            rulesetId,
          })
          .catch((err) => {
            console.warn('Reactive script execution failed:', err);
          });
      } catch (error) {
        console.warn('Reactive script execution failed:', error);
      }
    }, 0);
  });

  // Create an inventory when a character is created
  db.characters.hook('creating', (_primKey, obj) => {
    setTimeout(async () => {
      try {
        const now = new Date().toISOString();

        // Imported characters already have inventories
        if (obj.inventoryId) {
          const existingInventory = await db.inventories.get(obj.inventoryId);
          if (existingInventory) return;
        }

        const inventoryId = crypto.randomUUID();

        await db.inventories.add({
          id: inventoryId,
          characterId: obj.id,
          rulesetId: obj.rulesetId,
          title: `${obj.name}'s Inventory`,
          category: null,
          type: null,
          entities: [],
          createdAt: now,
          updatedAt: now,
        });

        // Update the character with the inventory ID
        await db.characters.update(obj.id, {
          inventoryId: inventoryId,
        });
        // Note: Inventory duplication from archetype test character is handled in createCharacter
      } catch (error) {
        console.error('Failed to create inventory for character:', error);
      }
    }, 0);
  });

  // Delete character windows when a character page (join) is deleted; optionally delete orphaned Page
  db.characterPages.hook('deleting', (primKey, obj) => {
    setTimeout(async () => {
      try {
        const characterPageId = primKey as string;
        const pageId = (obj as { pageId?: string })?.pageId;
        await db.characterWindows.where('characterPageId').equals(characterPageId).delete();
        if (pageId) {
          const otherCharacterPage = await db.characterPages
            .where('pageId')
            .equals(pageId)
            .first();
          const rulesetPage = await db.rulesetPages.where('pageId').equals(pageId).first();
          if (!otherCharacterPage && !rulesetPage) {
            await db.pages.delete(pageId);
          }
        }
      } catch (error) {
        console.error('Failed to delete character windows for character page:', error);
      }
    }, 0);
  });

  // Delete all associated entities when a character is deleted
  db.characters.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const characterId = primKey as string;
        await db.inventoryItems.where('characterId').equals(characterId).delete();
        await db.characterAttributes.where('characterId').equals(characterId).delete();
        await db.characterArchetypes.where('characterId').equals(characterId).delete();
        await db.characterPages.where('characterId').equals(characterId).delete();
        await db.characterWindows.where('characterId').equals(characterId).delete();
        await db.inventories.where('characterId').equals(characterId).delete();
      } catch (error) {
        console.error('Failed to delete associated entities for character:', error);
      }
    }, 0);
  });
}
