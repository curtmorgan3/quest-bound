import type { DB } from './types';

export function registerArchetypeDbHooks(db: DB) {
  db.archetypes.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const archetypeId = primKey as string;
        const archetype = await db.archetypes.get(archetypeId);
        if (!archetype) return;

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
        if (archetype.testCharacterId) {
          await db.characters.delete(archetype.testCharacterId);
        }
      } catch (error) {
        console.error('Failed to clean up archetype deletion:', error);
      }
    }, 0);
  });
}
