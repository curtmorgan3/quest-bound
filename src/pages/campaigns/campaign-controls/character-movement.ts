import type { Location } from '@/types';
import type { TileData } from '@/types';

/** Minimal shape for a character/entity that can be moved (has id). */
type MoveableCharacter = { id: string };
/** Minimal shape for an entity in location (has id and optional currentTileId for occupancy). */
type CharacterInLocation = { id: string; currentTileId?: string | null };

interface MoveCharacters {
  location: Location;
  characterToMove: MoveableCharacter[];
  targetTile: { id: string };
  charactersInLocation: CharacterInLocation[];
}

export type ResolvedMovement = {
  characterId: string;
  tileId: string;
};

function getTileData(tiles: TileData[], tileId: string): TileData | undefined {
  return tiles.find((t) => t.id === tileId);
}

function getPassableTiles(tiles: TileData[]): TileData[] {
  return tiles.filter((t) => t.isPassable);
}

function tileDistance(a: TileData, b: TileData): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function nearestEmptyPassableTile(
  tiles: TileData[],
  fromTile: TileData,
  occupiedOrAssigned: Set<string>,
): TileData | null {
  const passable = getPassableTiles(tiles).filter((t) => !occupiedOrAssigned.has(t.id));
  if (passable.length === 0) return null;
  const sorted = [...passable].sort((a, b) => tileDistance(a, fromTile) - tileDistance(b, fromTile));
  return sorted[0] ?? null;
}

export function moveCharacters({
  location,
  targetTile,
  characterToMove,
  charactersInLocation,
}: MoveCharacters): ResolvedMovement[] {
  const tiles = location.tiles ?? [];
  const targetTileData = getTileData(tiles, targetTile.id);
  const passableTarget = targetTileData?.isPassable ?? false;

  const moveIds = new Set(characterToMove.map((c) => c.id));
  const occupiedTileIds = new Set(
    charactersInLocation
      .filter((c) => !moveIds.has(c.id) && c.currentTileId)
      .map((c) => c.currentTileId as string),
  );

  const assigned = new Set<string>();
  const result: ResolvedMovement[] = [];
  const fromTile = targetTileData ?? tiles[0];

  if (!fromTile) return result;

  for (let i = 0; i < characterToMove.length; i++) {
    const character = characterToMove[i]!;
    const candidateTileId =
      i === 0 && passableTarget && !occupiedTileIds.has(targetTile.id) && !assigned.has(targetTile.id)
        ? targetTile.id
        : null;

    const tileToUse =
      candidateTileId ?? nearestEmptyPassableTile(tiles, fromTile, new Set([...occupiedTileIds, ...assigned]))?.id ?? null;

    if (tileToUse) {
      assigned.add(tileToUse);
      result.push({ characterId: character.id, tileId: tileToUse });
    }
  }

  return result;
}
