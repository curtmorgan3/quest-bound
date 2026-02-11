import type { Attribute } from '@/types';
import type { DB } from './types';

export function registerAttributeDbHooks(db: DB) {
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
}
