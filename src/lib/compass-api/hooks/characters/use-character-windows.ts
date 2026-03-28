import { getDefaultArchetypeTestCharacterId } from '@/lib/compass-api/utils/default-archetype-test-character';
import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CharacterWindow } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export type CharacterWindowUpdate = {
  id: string;
  x?: number;
  y?: number;
  isCollapsed?: boolean;
};

/**
 * Character windows are keyed by characterId. If that character no longer exists, reassign rows to
 * the default archetype test character for the window's ruleset (persists). The live query then
 * returns [] for the stale id; reassigned windows appear on the default test character's sheet.
 */
async function repairCharacterWindowsForViewer(characterId: string): Promise<CharacterWindow[]> {
  const rows = await db.characterWindows.where('characterId').equals(characterId).toArray();
  if (rows.length === 0) return [];

  if (await db.characters.get(characterId)) {
    return rows;
  }

  const now = new Date().toISOString();
  const fallbackByRuleset = new Map<string, string | null>();

  for (const w of rows) {
    const winDef = await db.windows.get(w.windowId);
    if (!winDef) continue;

    let fallback = fallbackByRuleset.get(winDef.rulesetId);
    if (fallback === undefined) {
      fallback = await getDefaultArchetypeTestCharacterId(winDef.rulesetId);
      fallbackByRuleset.set(winDef.rulesetId, fallback);
    }
    if (!fallback) continue;

    await db.characterWindows.update(w.id, {
      characterId: fallback,
      updatedAt: now,
    });
  }

  return [];
}

export const useCharacterWindows = (characterId?: string) => {
  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(async (): Promise<CharacterWindow[]> => {
    if (!characterId) return [];
    try {
      return await repairCharacterWindowsForViewer(characterId);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/liveQuery',
        severity: 'medium',
      });
      return [];
    }
  }, [characterId]);

  const createCharacterWindow = async (
    data: Omit<CharacterWindow, 'id' | 'createdAt' | 'updatedAt' | 'rulesetId'>,
  ) => {
    if (!characterId) return;
    const now = new Date().toISOString();
    try {
      await db.characterWindows.add({
        ...data,
        id: crypto.randomUUID(),
        characterId: characterId,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/createCharacterWindow',
        severity: 'medium',
      });
    }
  };

  const updateCharacterWindow = async (id: string, data: Partial<CharacterWindow>) => {
    const now = new Date().toISOString();
    try {
      await db.characterWindows.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/updateWindow',
        severity: 'medium',
      });
    }
  };

  const deleteCharacterWindow = async (id: string) => {
    try {
      await db.characterWindows.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacterWindows/deleteCharacterWindow',
        severity: 'medium',
      });
    }
  };

  return {
    windows: windows ?? [],
    createCharacterWindow,
    updateCharacterWindow,
    deleteCharacterWindow,
  };
};
