/**
 * Minimal types for world/location/map UI that still exists.
 * DB and data-model no longer use these; kept only for components that reference them.
 */

export interface TileData {
  id: string;
  tileId?: string;
  x: number;
  y: number;
  zIndex?: number;
  isPassable: boolean;
  actionId?: string;
}

export interface World {
  id: string;
  label: string;
  description?: string;
  assetId?: string | null;
  image?: string | null;
  rulesetId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tilemap {
  id: string;
  label?: string;
  worldId: string;
  assetId: string;
  image?: string | null;
  tileHeight: number;
  tileWidth: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tile {
  id: string;
  tilemapId?: string;
  tileX?: number;
  tileY?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Location {
  id: string;
  label: string;
  worldId: string;
  nodeX: number;
  nodeY: number;
  nodeWidth: number;
  nodeHeight: number;
  parentLocationId?: string | null;
  gridWidth: number;
  gridHeight: number;
  hasMap?: boolean;
  tileRenderSize?: number;
  tiles: TileData[];
  nodeZIndex?: number;
  labelVisible?: boolean;
  backgroundColor?: string | null;
  opacity?: number;
  backgroundAssetId?: string | null;
  backgroundImage?: string | null;
  backgroundSize?: string | null;
  backgroundPosition?: string | null;
  mapAssetId?: string | null;
  mapAsset?: string | null;
  scaledMapHeight?: number;
  scaledMapWidth?: number;
  createdAt?: string;
  updatedAt?: string;
}
