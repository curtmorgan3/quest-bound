import type { Archetype } from '@quest-bound/types';
import { getSyncState } from '@/lib/cloud/sync/sync-state';
import type { DB } from './types';

export function registerArchetypeDbHooks(db: DB) {
  db.archetypes.hook('deleting', (primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const archetypeId = primKey as string;
    const testCharacterId = (obj as Archetype | undefined)?.testCharacterId;

    setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        const caRows = await db.characterArchetypes.where('archetypeId').equals(archetypeId).toArray();
        for (const row of caRows) {
          await db.characterArchetypes.update(row.id, { deleted: true, updatedAt: now });
        }
        await db.archetypeCustomProperties.where('archetypeId').equals(archetypeId).delete();

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
