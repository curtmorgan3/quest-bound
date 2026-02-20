import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useTilemaps = (worldId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const tilemaps = useLiveQuery(
    () =>
      worldId
        ? db.tilemaps.where('worldId').equals(worldId).toArray()
        : Promise.resolve([] as Tilemap[]),
    [worldId],
  );

  const createTilemap = async (worldId: string, data: Partial<Tilemap>) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.tilemaps.add({
        ...data,
        id,
        worldId,
        assetId: data.assetId ?? '',
        tileHeight: data.tileHeight ?? 32,
        tileWidth: data.tileWidth ?? 32,
        createdAt: now,
        updatedAt: now,
      } as Tilemap);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useTilemaps/createTilemap',
        severity: 'medium',
      });
    }
  };

  const updateTilemap = async (id: string, data: Partial<Tilemap>) => {
    const now = new Date().toISOString();
    try {
      await db.tilemaps.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useTilemaps/updateTilemap',
        severity: 'medium',
      });
    }
  };

  const deleteTilemap = async (id: string) => {
    try {
      const tiles = await db.tiles.where('tilemapId').equals(id).toArray();
      await db.tiles.bulkDelete(tiles.map((t) => t.id));
      await db.tilemaps.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useTilemaps/deleteTilemap',
        severity: 'medium',
      });
    }
  };

  return {
    tilemaps: tilemaps ?? [],
    createTilemap,
    updateTilemap,
    deleteTilemap,
  };
};
