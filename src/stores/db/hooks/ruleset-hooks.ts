import { getSyncState } from '@/lib/cloud/sync/sync-state';
import type { DB } from './types';

export function registerRulesetDbHooks(db: DB) {
  // Create test character and default archetype when a ruleset is created
  db.rulesets.hook('creating', (_primKey, obj) => {
    if (getSyncState().isSyncing) return;
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

}
