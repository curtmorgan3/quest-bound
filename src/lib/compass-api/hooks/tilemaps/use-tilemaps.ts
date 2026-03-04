import type { Tilemap } from '@/types';

/** Tilemaps feature removed; stub returns empty data and no-op mutations. */
export const useTilemaps = (_worldId: string | undefined) => {
  return {
    tilemaps: [] as Tilemap[],
    createTilemap: async (_worldId: string, _data: Partial<Tilemap>) =>
      undefined as string | undefined,
    updateTilemap: async (_id: string, _data: Partial<Tilemap>) => {},
    deleteTilemap: async (_id: string) => {},
  };
};
