import { filterNotSoftDeleted, softDeletePatch } from '@/lib/data/soft-delete';
import { useErrorHandler } from '@/hooks';
import { executeArchetypeEvent } from '@/lib/compass-logic/reactive/event-handler-executor';
import { db } from '@/stores';
import type { Archetype, CharacterArchetype, RollFn, RollSplitFn } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export type CharacterArchetypeWithArchetype = CharacterArchetype & { archetype: Archetype };

export function useCharacterArchetypes(
  characterId: string | undefined,
  options?: {
    campaignId?: string;
    campaignSceneId?: string;
    roll?: RollFn;
    rollSplit?: RollSplitFn;
  },
) {
  const { handleError } = useErrorHandler();

  const characterArchetypes: CharacterArchetypeWithArchetype[] =
    useLiveQuery(async () => {
      if (!characterId) return [];
      const cas = filterNotSoftDeleted(
        await db.characterArchetypes.where('characterId').equals(characterId).sortBy('loadOrder'),
      );
      const archetypes = await Promise.all(cas.map((ca) => db.archetypes.get(ca.archetypeId)));
      return cas
        .map((ca) => {
          const archetype = archetypes.find((a) => a?.id === ca.archetypeId);
          return archetype ? { ...ca, archetype } : null;
        })
        .filter((x): x is CharacterArchetypeWithArchetype => x !== null);
    }, [characterId]) ?? [];

  const addArchetype = async (archetypeId: string, variant?: string) => {
    if (!characterId) return;
    const now = new Date().toISOString();
    try {
      const existing = await db.characterArchetypes
        .where('[characterId+archetypeId]')
        .equals([characterId, archetypeId])
        .first();
      const activeOrdered = filterNotSoftDeleted(
        await db.characterArchetypes.where('characterId').equals(characterId).sortBy('loadOrder'),
      );
      const maxOrder =
        activeOrdered.length > 0 ? (activeOrdered[activeOrdered.length - 1]!.loadOrder ?? 0) : -1;

      if (existing && existing.deleted !== true) return;

      if (existing && existing.deleted === true) {
        await db.characterArchetypes.update(existing.id, {
          deleted: false,
          variant,
          loadOrder: maxOrder + 1,
          updatedAt: now,
        });
        return;
      }

      await db.characterArchetypes.add({
        id: crypto.randomUUID(),
        characterId,
        archetypeId,
        variant,
        loadOrder: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        deleted: false,
      });

      const archetypeResult = await executeArchetypeEvent(
        db,
        archetypeId,
        characterId,
        'on_add',
        options?.roll,
        options?.campaignId,
        options?.rollSplit,
        options?.campaignSceneId,
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
        options?.roll,
        options?.campaignId,
        options?.rollSplit,
        options?.campaignSceneId,
      );
      if (archetypeResult.error) {
        console.warn('Archetype on_remove script failed:', archetypeResult.error);
      }
      await db.characterArchetypes.update(characterArchetypeId, softDeletePatch());
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
