import type {
  Archetype,
  ArchetypeCustomProperty,
  Character,
  CustomProperty,
  CustomPropertyType,
} from '@quest-bound/types';
import { getSyncState } from '@/lib/cloud/sync/sync-state';
import type { DB } from './types';

function getTypeDefault(type: CustomPropertyType): string | number | boolean {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'color':
    case 'image':
      return '';
    default:
      return '';
  }
}

function getEffectiveDefault(
  acp: ArchetypeCustomProperty,
  cp: CustomProperty,
): string | number | boolean {
  if (acp.defaultValue !== undefined) {
    return acp.defaultValue;
  }
  if (cp.defaultValue !== undefined) {
    return cp.defaultValue;
  }
  return getTypeDefault(cp.type);
}

async function updateTestCharacterCustomProperty(
  db: DB,
  archetypeId: string,
  customPropertyId: string,
): Promise<void> {
  const archetype = (await db.archetypes.get(archetypeId)) as Archetype | undefined;
  if (!archetype?.testCharacterId) return;

  const testCharacter = (await db.characters.get(archetype.testCharacterId)) as
    | Character
    | undefined;
  if (!testCharacter) return;

  const acp = (await db.archetypeCustomProperties
    .where('[archetypeId+customPropertyId]')
    .equals([archetypeId, customPropertyId])
    .first()) as ArchetypeCustomProperty | undefined;

  const cp = (await db.customProperties.get(customPropertyId)) as CustomProperty | undefined;
  if (!cp) return;

  const customProperties = { ...(testCharacter.customProperties ?? {}) };

  if (!acp || acp.defaultValue === undefined) {
    // No archetype override – remove key so character falls back to CustomProperty default.
    delete customProperties[cp.id];
  } else {
    customProperties[cp.id] = getEffectiveDefault(acp, cp);
  }

  const now = new Date().toISOString();
  await db.characters.update(testCharacter.id, {
    customProperties,
    updatedAt: now,
  });
}

export function registerCustomPropertyDbHooks(db: DB) {
  // Keep archetype test characters' customProperties in sync with ArchetypeCustomProperties
  db.archetypeCustomProperties.hook('creating', (_primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const acp = obj as ArchetypeCustomProperty;
    setTimeout(() => {
      updateTestCharacterCustomProperty(db, acp.archetypeId, acp.customPropertyId).catch(
        (error) => {
          console.error(
            'Failed to sync archetype custom property (creating) to test character:',
            error,
          );
        },
      );
    }, 0);
  });

  db.archetypeCustomProperties.hook('updating', (_modifications, primKey, _obj) => {
    if (getSyncState().isSyncing) return;
    const id = primKey as string;
    setTimeout(async () => {
      try {
        const acp = (await db.archetypeCustomProperties.get(id)) as
          | ArchetypeCustomProperty
          | undefined;
        if (!acp) return;
        await updateTestCharacterCustomProperty(db, acp.archetypeId, acp.customPropertyId);
      } catch (error) {
        console.error(
          'Failed to sync archetype custom property (updating) to test character:',
          error,
        );
      }
    }, 0);
  });

  db.archetypeCustomProperties.hook('deleting', (_primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const acp = obj as ArchetypeCustomProperty | undefined;
    if (!acp) return;
    setTimeout(() => {
      updateTestCharacterCustomProperty(db, acp.archetypeId, acp.customPropertyId).catch(
        (error) => {
          console.error(
            'Failed to sync archetype custom property (deleting) to test character:',
            error,
          );
        },
      );
    }, 0);
  });
}

