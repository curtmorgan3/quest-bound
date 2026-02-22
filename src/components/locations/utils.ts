import type { TileData } from '@/types';

export function getTilesByKey(tiles: TileData[]): Map<string, TileData[]> {
  const map = new Map<string, TileData[]>();
  for (const td of tiles) {
    const key = `${td.x},${td.y}`;
    const list = map.get(key) ?? [];
    list.push(td);
    map.set(key, list);
  }
  map.forEach((list) => list.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)));
  return map;
}

/** Topmost TileData at (x, y) by zIndex, or null if no tile. */
export function getTopTileDataAt(tiles: TileData[], x: number, y: number): TileData | null {
  const key = `${x},${y}`;
  const byKey = getTilesByKey(tiles);
  const layers = byKey.get(key) ?? [];
  return layers.length > 0 ? layers[layers.length - 1]! : null;
}

/** First passable tile in the location (for placing character when moving locations). */
export function getFirstPassableTileId(tiles: TileData[]): string | null {
  const passable = tiles.filter((td) => td.isPassable);
  return passable.length > 0 ? passable[0]!.id : null;
}
