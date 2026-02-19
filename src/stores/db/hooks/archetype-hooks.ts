import type { DB } from './types';
import type { Archetype } from '@/types';

export function registerArchetypeDbHooks(db: DB) {
  db.archetypes.hook('deleting', (primKey, obj) => {
    const archetypeId = primKey as string;
    const testCharacterId = (obj as Archetype | undefined)?.testCharacterId;

    setTimeout(async () => {
      try {
        // Delete all CharacterArchetype rows for this archetype
        await db.characterArchetypes.where('archetypeId').equals(archetypeId).delete();

        // Clear Script.entityId for scripts that pointed to this archetype
        const scripts = await db.scripts
          .where('entityType')
          .equals('archetype')
          .and((s) => s.entityId === archetypeId)
          .toArray();
        for (const script of scripts) {
          await db.scripts.update(script.id, { entityId: null });
        }

        // Cascade delete test character (and its related entities via character-hooks)
        // Check existence first to avoid errors when ruleset deletion already removed it
        if (testCharacterId) {
          const char = await db.characters.get(testCharacterId);
          if (char) await db.characters.delete(testCharacterId);
        }
      } catch (error) {
        console.error('Failed to clean up archetype deletion:', error);
      }
    }, 0);
  });
}
