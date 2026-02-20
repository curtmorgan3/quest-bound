import { db } from '@/stores';
import type { Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useTilemap = (tilemapId: string | undefined) => {
  const tilemap = useLiveQuery(
    () =>
      tilemapId
        ? db.tilemaps.get(tilemapId)
        : Promise.resolve(undefined),
    [tilemapId],
  );

  return tilemap as Tilemap | undefined;
};
