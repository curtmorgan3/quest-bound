import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Window } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCharacter } from './use-character';

export const useCharacterWindows = (characterId?: string) => {
  const { character } = useCharacter(characterId);
  const rulesetId = character?.rulesetId;

  const { handleError } = useErrorHandler();

  const windows = useLiveQuery(
    () =>
      db.windows
        .where('rulesetId')
        .equals(rulesetId ?? 0)
        .toArray(),
    [rulesetId],
  );

  const updateWindow = async (id: string, data: Partial<Window>) => {
    const now = new Date().toISOString();
    try {
      await db.windows.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useWindows/updateWindow',
        severity: 'medium',
      });
    }
  };

  return { windows: windows ?? [], updateWindow };
};
