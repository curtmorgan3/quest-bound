import { useErrorHandler } from '@/hooks';
import { executeArchetypeEvent } from '@/lib/compass-logic/reactive/event-handler-executor';
import { db } from '@/stores';
import type { Archetype, CharacterArchetype } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export type CharacterArchetypeWithArchetype = CharacterArchetype & { archetype: Archetype };

export function useCharacterArchetypes(characterId: string | undefined) {
  const { handleError } = useErrorHandler();

  const characterArchetypes: CharacterArchetypeWithArchetype[] =
    useLiveQuery(
      async () => {
        if (!characterId) return [];
        const cas = await db.characterArchetypes
          .where('characterId')
          .equals(characterId)
          .sortBy('loadOrder');
        const archetypes = await Promise.all(cas.map((ca) => db.archetypes.get(ca.archetypeId)));
        return cas
          .map((ca) => {
            const archetype = archetypes.find((a) => a?.id === ca.archetypeId);
            return archetype ? { ...ca, archetype } : null;
          })
          .filter((x): x is CharacterArchetypeWithArchetype => x !== null);
      },
      [characterId],
    ) ?? [];

  const addArchetype = async (archetypeId: string) => {
    if (!characterId) return;
    const now = new Date().toISOString();
    try {
      const existing = await db.characterArchetypes
        .where('[characterId+archetypeId]')
        .equals([characterId, archetypeId])
        .first();
      if (existing) return;

      const maxOrder =
        (await db.characterArchetypes
          .where('characterId')
          .equals(characterId)
          .sortBy('loadOrder'))
          .pop()?.loadOrder ?? -1;

      await db.characterArchetypes.add({
        id: crypto.randomUUID(),
        characterId,
        archetypeId,
        loadOrder: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      });

      const archetypeResult = await executeArchetypeEvent(
        db,
        archetypeId,
        characterId,
        'on_add',
      );
      if (archetypeResult.error) {
        console.warn('Archetype on_add script failed:', archetypeResult.error);
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterArchetypes/addArchetype',
        severity: 'medium',
      });
    }
  };

  const removeArchetype = async (characterArchetypeId: string) => {
    const ca = await db.characterArchetypes.get(characterArchetypeId);
    if (!ca || ca.characterId !== characterId) return;
    try {
      const archetypeResult = await executeArchetypeEvent(
        db,
        ca.archetypeId,
        ca.characterId,
        'on_remove',
      );
      if (archetypeResult.error) {
        console.warn('Archetype on_remove script failed:', archetypeResult.error);
      }
      await db.characterArchetypes.delete(characterArchetypeId);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterArchetypes/removeArchetype',
        severity: 'medium',
      });
    }
  };

  const reorderArchetypes = async (orderedIds: string[]) => {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.characterArchetypes.update(orderedIds[i], {
          loadOrder: i,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterArchetypes/reorderArchetypes',
        severity: 'medium',
      });
    }
  };

  return {
    characterArchetypes,
    addArchetype,
    removeArchetype,
    reorderArchetypes,
  };
}
