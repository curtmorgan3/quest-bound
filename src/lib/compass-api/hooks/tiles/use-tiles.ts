import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Tile } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useTiles = (tilemapId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const tiles = useLiveQuery(
    () =>
      tilemapId
        ? db.tiles.where('tilemapId').equals(tilemapId).toArray()
        : Promise.resolve([] as Tile[]),
    [tilemapId],
  );

  const createTile = async (tilemapId: string, data: Partial<Tile>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.tiles.add({
        ...data,
        id,
        tilemapId,
        tileX: data.tileX,
        tileY: data.tileY,
        createdAt: now,
        updatedAt: now,
      } as Tile);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useTiles/createTile',
        severity: 'medium',
      });
    }
  };

  const updateTile = async (id: string, data: Partial<Tile>) => {
    const now = new Date().toISOString();
    try {
      await db.tiles.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useTiles/updateTile',
        severity: 'medium',
      });
    }
  };

  const deleteTile = async (id: string) => {
    try {
      await db.tiles.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useTiles/deleteTile',
        severity: 'medium',
      });
    }
  };

  return {
    tiles: tiles ?? [],
    createTile,
    updateTile,
    deleteTile,
  };
};
