import type { DB } from './types';

export function registerRulesetDbHooks(db: DB) {
  // Create test character and default archetype when a ruleset is created
  db.rulesets.hook('creating', (_primKey, obj) => {
    setTimeout(async () => {
      try {
        const rulesetId = obj.id;
        const now = new Date().toISOString();

        // Check if a test character already exists (e.g., for imported rulesets)
        let testCharacter = await db.characters
          .where('rulesetId')
          .equals(rulesetId)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (!testCharacter) {
          const characterId = crypto.randomUUID();
          await db.characters.add({
            id: characterId,
            rulesetId,
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
          testCharacter = await db.characters.get(characterId);
        }

        if (testCharacter) {
          // Ensure exactly one default archetype (idempotent for imports)
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
              mapHeight: 1,
              mapWidth: 1,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        console.error('Failed to create test character and default archetype for ruleset:', error);
      }
    }, 0);
  });

  // Delete all associated entities when a ruleset is deleted
  db.rulesets.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const rulesetId = primKey as string;

        await db.attributes.where('rulesetId').equals(rulesetId).delete();
        await db.actions.where('rulesetId').equals(rulesetId).delete();
        await db.items.where('rulesetId').equals(rulesetId).delete();

        await db.charts.where('rulesetId').equals(rulesetId).delete();
        await db.documents.where('rulesetId').equals(rulesetId).delete();

        await db.pages.where('rulesetId').equals(rulesetId).delete();
        await db.windows.where('rulesetId').equals(rulesetId).delete();
        await db.rulesetWindows.where('rulesetId').equals(rulesetId).delete();
        await db.components.where('rulesetId').equals(rulesetId).delete();

        await db.archetypes.where('rulesetId').equals(rulesetId).delete();
        await db.characters.where('rulesetId').equals(rulesetId).delete();

        await db.assets.where('rulesetId').equals(rulesetId).delete();
        await db.fonts.where('rulesetId').equals(rulesetId).delete();
        await db.diceRolls.where('rulesetId').equals(rulesetId).delete();
        await db.customProperties.where('rulesetId').equals(rulesetId).delete();

        await db.campaigns.where('rulesetId').equals(rulesetId).delete();

        await db.scripts.where('rulesetId').equals(rulesetId).delete();
        await db.scriptErrors.where('rulesetId').equals(rulesetId).delete();
        await db.scriptLogs.where('rulesetId').equals(rulesetId).delete();
        await db.dependencyGraphNodes.where('rulesetId').equals(rulesetId).delete();
      } catch (error) {
        console.error('Failed to delete associated entities for ruleset:', error);
      }
    }, 0);
  });
}
