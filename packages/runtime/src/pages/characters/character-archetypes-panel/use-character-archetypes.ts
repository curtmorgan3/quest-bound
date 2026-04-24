import { filterNotSoftDeleted, softDeletePatch } from '@/lib/data/soft-delete';
import { useErrorHandler } from '@/hooks';
import { getQBScriptClient } from '@/lib/compass-logic/worker/client';
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

      try {
        await getQBScriptClient().executeArchetypeEvent(
          archetypeId,
          characterId,
          'on_add',
          options?.roll,
          undefined,
          options?.campaignId,
          options?.rollSplit,
          options?.campaignSceneId,
        );
      } catch (scriptError) {
        console.warn('Archetype on_add script failed:', scriptError);
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
      try {
        await getQBScriptClient().executeArchetypeEvent(
          ca.archetypeId,
          ca.characterId,
          'on_remove',
          options?.roll,
          undefined,
          options?.campaignId,
          options?.rollSplit,
          options?.campaignSceneId,
        );
      } catch (scriptError) {
        console.warn('Archetype on_remove script failed:', scriptError);
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
