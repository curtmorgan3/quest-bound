import { db } from '@/stores';
import type { World } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useWorld = (worldId: string | undefined) => {
  const world = useLiveQuery(
    () => (worldId ? db.worlds.get(worldId) : Promise.resolve(undefined)),
    [worldId],
  );

  return world as World | undefined;
};
