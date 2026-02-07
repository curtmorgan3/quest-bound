import type { DB } from './types';

export function registerCharacterDbHooks(db: DB) {
  // Create an inventory when a character is created
  db.characters.hook('creating', (_primKey, obj) => {
    setTimeout(async () => {
      try {
        const now = new Date().toISOString();
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
      } catch (error) {
        console.error('Failed to create inventory for character:', error);
      }
    }, 0);
  });

  // Delete character windows when a character page is deleted
  db.characterPages.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const characterPageId = primKey as string;
        await db.characterWindows
          .where('characterPageId')
          .equals(characterPageId)
          .delete();
      } catch (error) {
        console.error(
          'Failed to delete character windows for character page:',
          error,
        );
      }
    }, 0);
  });

  // Delete all associated entities when a character is deleted
  db.characters.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const characterId = primKey as string;
        await db.characterAttributes.where('characterId').equals(characterId).delete();
        await db.characterPages.where('characterId').equals(characterId).delete();
        await db.characterWindows.where('characterId').equals(characterId).delete();
        await db.inventories.where('characterId').equals(characterId).delete();
      } catch (error) {
        console.error('Failed to delete associated entities for character:', error);
      }
    }, 0);
  });
}
