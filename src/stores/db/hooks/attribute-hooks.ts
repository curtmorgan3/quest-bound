// import { buildDependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import type { Attribute } from '@/types';
import type { DB } from './types';

export function registerAttributeDbHooks(db: DB) {
  // Sync attributes with characterAttributes for all archetype test characters
  db.attributes.hook('creating', (_primKey, obj) => {
    setTimeout(async () => {
      try {
        const archetypes = await db.archetypes.where('rulesetId').equals(obj.rulesetId).toArray();
        const now = new Date().toISOString();
        for (const archetype of archetypes) {
          const testCharacter = await db.characters.get(archetype.testCharacterId);
          if (testCharacter) {
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
        }
      } catch (error) {
        console.error('Failed to create characterAttribute for test characters:', error);
      }
    }, 0);
  });

  db.attributes.hook('updating', (modifications, primKey, obj) => {
    setTimeout(async () => {
      try {
        const archetypes = await db.archetypes.where('rulesetId').equals(obj.rulesetId).toArray();
        const mods = modifications as Partial<Attribute>;
        const now = new Date().toISOString();
        for (const archetype of archetypes) {
          const testCharacter = await db.characters.get(archetype.testCharacterId);
          if (!testCharacter) continue;
          const characterAttributes = await db.characterAttributes
            .where('characterId')
            .equals(testCharacter.id)
            .and((ca) => ca.attributeId === (primKey as string))
            .toArray();
          const characterAttribute = characterAttributes[0];
          if (characterAttribute) {
            await db.characterAttributes.update(characterAttribute.id, {
              title: mods.title ?? obj.title,
              defaultValue: mods.defaultValue ?? obj.defaultValue,
              type: mods.type ?? obj.type,
              description: mods.description ?? obj.description,
              min: mods.min ?? obj.min,
              max: mods.max ?? obj.max,
              options: mods.options ?? obj.options,
              optionsChartRef: mods.optionsChartRef ?? obj.optionsChartRef,
              optionsChartColumnHeader:
                mods.optionsChartColumnHeader ?? obj.optionsChartColumnHeader,
              category: mods.category ?? obj.category,
              allowMultiSelect: mods.allowMultiSelect ?? obj.allowMultiSelect,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        console.error('Failed to update characterAttribute for test characters:', error);
      }
    }, 0);
  });

  db.attributes.hook('deleting', (primKey, obj) => {
    setTimeout(async () => {
      try {
        const archetypes = await db.archetypes.where('rulesetId').equals(obj.rulesetId).toArray();
        for (const archetype of archetypes) {
          const testCharacter = await db.characters.get(archetype.testCharacterId);
          if (!testCharacter) continue;
          const characterAttributes = await db.characterAttributes
            .where('characterId')
            .equals(testCharacter.id)
            .and((ca) => ca.attributeId === (primKey as string))
            .toArray();
          for (const ca of characterAttributes) {
            await db.characterAttributes.delete(ca.id);
          }
        }
      } catch (error) {
        console.error('Failed to delete characterAttribute for test characters:', error);
      }
    }, 0);
  });
}
