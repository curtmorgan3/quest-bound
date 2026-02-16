import type { DB } from './types';

export function registerRulesetDbHooks(db: DB) {
  // When a ruleset-page join is deleted, delete the page if no other refs
  db.rulesetPages.hook('deleting', (primKey, obj) => {
    setTimeout(async () => {
      try {
        const pageId = (obj as { pageId?: string })?.pageId;
        if (pageId) {
          const otherRulesetPage = await db.rulesetPages
            .where('pageId')
            .equals(pageId)
            .first();
          const characterPage = await db.characterPages
            .where('pageId')
            .equals(pageId)
            .first();
          if (!otherRulesetPage && !characterPage) {
            await db.pages.delete(pageId);
          }
        }
      } catch (error) {
        console.error('Failed to delete orphaned page after ruleset page:', error);
      }
    }, 0);
  });

  // Create test character when a ruleset is created
  db.rulesets.hook('creating', (_primKey, obj) => {
    setTimeout(async () => {
      try {
        // Check if a test character already exists (e.g., for imported rulesets)
        const existingTestCharacter = await db.characters
          .where('rulesetId')
          .equals(obj.id)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (!existingTestCharacter) {
          const now = new Date().toISOString();
          const characterId = crypto.randomUUID();

          await db.characters.add({
            id: characterId,
            rulesetId: obj.id,
            userId: obj.createdBy,
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
          });
        }
      } catch (error) {
        console.error('Failed to create test character for ruleset:', error);
      }
    }, 0);
  });

  // Delete all associated entities when a ruleset is deleted
  db.rulesets.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const rulesetId = primKey as string;

        // Delete ruleset-level entities
        await db.attributes.where('rulesetId').equals(rulesetId).delete();
        await db.items.where('rulesetId').equals(rulesetId).delete();
        await db.actions.where('rulesetId').equals(rulesetId).delete();
        await db.charts.where('rulesetId').equals(rulesetId).delete();
        await db.assets.where('rulesetId').equals(rulesetId).delete();
        await db.windows.where('rulesetId').equals(rulesetId).delete();
        await db.components.where('rulesetId').equals(rulesetId).delete();
        await db.fonts.where('rulesetId').equals(rulesetId).delete();
        await db.documents.where('rulesetId').equals(rulesetId).delete();
        await db.diceRolls.where('rulesetId').equals(rulesetId).delete();
        await db.scripts.where('rulesetId').equals(rulesetId).delete();
        await db.scriptErrors.where('rulesetId').equals(rulesetId).delete();
        await db.scriptLogs.where('rulesetId').equals(rulesetId).delete();

        const rulesetPageJoins = await db.rulesetPages
          .where('rulesetId')
          .equals(rulesetId)
          .toArray();
        for (const rp of rulesetPageJoins) {
          await db.rulesetPages.delete(rp.id);
        }
        // Orphaned pages are cleaned up by rulesetPages.hook('deleting')

        // Find and delete only the test character (not regular characters)
        const testCharacter = await db.characters
          .where('rulesetId')
          .equals(rulesetId)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (testCharacter) {
          await db.characters.where('id').equals(testCharacter.id).delete();
          await db.characterAttributes.where('characterId').equals(testCharacter.id).delete();
          await db.characterPages.where('characterId').equals(testCharacter.id).delete();
          await db.characterWindows.where('characterId').equals(testCharacter.id).delete();
          await db.inventories.where('characterId').equals(testCharacter.id).delete();
          await db.inventoryItems.where('characterId').equals(testCharacter.id).delete();
        }
      } catch (error) {
        console.error('Failed to delete associated entities for ruleset:', error);
      }
    }, 0);
  });
}
