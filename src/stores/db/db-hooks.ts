import type { Attribute } from '@/types';
import type Dexie from 'dexie';
import { memoizedCharts } from './chart-options-middleware';

type DB = Dexie & {
  rulesets: Dexie.Table;
  attributes: Dexie.Table;
  items: Dexie.Table;
  actions: Dexie.Table;
  charts: Dexie.Table;
  assets: Dexie.Table;
  windows: Dexie.Table;
  components: Dexie.Table;
  fonts: Dexie.Table;
  characters: Dexie.Table;
  characterAttributes: Dexie.Table;
  characterWindows: Dexie.Table;
  characterInventories: Dexie.Table;
};

export function registerDbHooks(db: DB) {
  // Keep chart cache in sync when charts are modified
  db.charts.hook('creating', (_primKey, obj) => {
    try {
      memoizedCharts[obj.id] = JSON.parse(obj.data);
    } catch {
      // Invalid JSON, skip
    }
  });

  db.charts.hook('updating', (modifications, primKey) => {
    console.log('mods: ', modifications);
    if ((modifications as any).data !== undefined) {
      try {
        memoizedCharts[primKey as string] = JSON.parse((modifications as any).data);
      } catch {
        delete memoizedCharts[primKey as string];
      }
    }
  });

  db.charts.hook('deleting', (primKey) => {
    delete memoizedCharts[primKey as string];
  });

  // Sync attributes with characterAttributes for test characters
  db.attributes.hook('creating', (_primKey, obj) => {
    // Use setTimeout to defer the characterAttribute creation until after the attribute is committed
    setTimeout(async () => {
      try {
        const testCharacter = await db.characters
          .where('rulesetId')
          .equals(obj.rulesetId)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (testCharacter) {
          const now = new Date().toISOString();
          await db.characterAttributes.add({
            ...obj,
            id: crypto.randomUUID(),
            characterId: testCharacter.id,
            attributeId: obj.id,
            createdAt: now,
            updatedAt: now,
            value: obj.defaultValue,
          });
        }
      } catch (error) {
        console.error('Failed to create characterAttribute for test character:', error);
      }
    }, 0);
  });

  db.attributes.hook('updating', (modifications, primKey, obj) => {
    setTimeout(async () => {
      try {
        const testCharacter = await db.characters
          .where('rulesetId')
          .equals(obj.rulesetId)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (testCharacter) {
          const characterAttribute = await db.characterAttributes.get({
            characterId: testCharacter.id,
            attributeId: primKey as string,
          });

          if (characterAttribute) {
            const now = new Date().toISOString();
            const mods = modifications as Partial<Attribute>;
            await db.characterAttributes.update(characterAttribute.id, {
              title: mods.title,
              defaultValue: mods.defaultValue,
              type: mods.type,
              description: mods.description,
              min: mods.min,
              max: mods.max,
              options: mods.options,
              optionsChartRef: mods.optionsChartRef,
              optionsChartColumnHeader: mods.optionsChartColumnHeader,
              category: mods.category,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        console.error('Failed to update characterAttribute for test character:', error);
      }
    }, 0);
  });

  db.attributes.hook('deleting', (primKey, obj) => {
    setTimeout(async () => {
      try {
        const testCharacter = await db.characters
          .where('rulesetId')
          .equals(obj.rulesetId)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (testCharacter) {
          const characterAttribute = await db.characterAttributes.get({
            characterId: testCharacter.id,
            attributeId: primKey as string,
          });

          if (characterAttribute) {
            await db.characterAttributes.delete(characterAttribute.id);
          }
        }
      } catch (error) {
        console.error('Failed to delete characterAttribute for test character:', error);
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
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        console.error('Failed to create test character for ruleset:', error);
      }
    }, 0);
  });

  // Delete all associated entities when a character is deleted
  db.characters.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const characterId = primKey as string;
        await db.characterAttributes.where('characterId').equals(characterId).delete();
        await db.characterWindows.where('characterId').equals(characterId).delete();
        await db.characterInventories.where('characterId').equals(characterId).delete();
      } catch (error) {
        console.error('Failed to delete associated entities for character:', error);
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

        // Find and delete only the test character (not regular characters)
        const testCharacter = await db.characters
          .where('rulesetId')
          .equals(rulesetId)
          .filter((c: any) => c.isTestCharacter)
          .first();

        if (testCharacter) {
          await db.characters.where('id').equals(testCharacter.id).delete();
          await db.characterAttributes.where('characterId').equals(testCharacter.id).delete();
          await db.characterWindows.where('characterId').equals(testCharacter.id).delete();
          await db.characterInventories.where('characterId').equals(testCharacter.id).delete();
        }
      } catch (error) {
        console.error('Failed to delete associated entities for ruleset:', error);
      }
    }, 0);
  });
}
