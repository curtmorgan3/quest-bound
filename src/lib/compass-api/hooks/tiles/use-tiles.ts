/** Tiles feature removed; stub returns empty data and no-op mutations. */
type TileStub = { id: string; tilemapId?: string; tileX?: number; tileY?: number };

export const useTiles = (_tilemapId: string | undefined) => {
  return {
    tiles: [] as TileStub[],
    createTile: async (_tilemapId: string, _data: Record<string, unknown>) =>
      undefined as string | undefined,
    updateTile: async (_id: string, _data: Record<string, unknown>) => {},
    deleteTile: async (_id: string) => {},
  };
};
