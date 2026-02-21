import { DEFAULT_TILE_RENDER_SIZE } from '@/constants';
import { useLocation, useTilemaps } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Tile, TileData, Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';

const MAP_IMAGE_MAX_WIDTH = 900;
const MAP_IMAGE_MAX_HEIGHT = 1200;

type AssetSize = {
  w: number;
  h: number;
};

export const useTilemapAsset = ({
  worldId,
  locationId,
  overrideTileRendersize,
  zoom = 1,
  imageUrl: imageUrlOverride,
}: {
  worldId?: string;
  locationId?: string;
  overrideTileRendersize?: number;
  zoom?: number;
  /** When set, used for mapImageDimensions instead of the location's map asset (e.g. tilemap editor). */
  imageUrl?: string | null;
}) => {
  const { tilemaps } = useTilemaps(worldId);
  const location = useLocation(locationId);
  const mapImageUrl = imageUrlOverride ?? location?.mapAsset ?? null;

  const [assetDimensions, setAssetDimensions] = useState<Record<string, AssetSize>>({});
  const assetDimensionsRef = useRef(assetDimensions);
  assetDimensionsRef.current = assetDimensions;

  const baseTileSize =
    overrideTileRendersize ?? location?.tileRenderSize ?? DEFAULT_TILE_RENDER_SIZE;
  const effectiveTileSize = baseTileSize * zoom;

  const tilemapsById = useMemo(() => {
    const map = new Map<string, Tilemap>();
    tilemaps.forEach((tm) => map.set(tm.id, tm));
    return map;
  }, [tilemaps]);

  const tileIdsInLocation = useMemo(
    () => [
      ...new Set(
        (location?.tiles ?? []).map((td) => td.tileId).filter((id): id is string => id != null),
      ),
    ],
    [location?.tiles],
  );

  const tilesById = useLiveQuery(
    () =>
      tileIdsInLocation.length > 0
        ? db.tiles.bulkGet(tileIdsInLocation).then((arr) => {
            const map = new Map<string, Tile>();
            arr.forEach((t) => t && map.set(t.id, t));
            return map;
          })
        : Promise.resolve(new Map<string, Tile>()),
    [tileIdsInLocation.join(',')],
  );

  // Preload tilemap asset images to get dimensions; scale tiles by tilemap tileWidth/tileHeight
  useEffect(() => {
    const dataUrls = new Map<string, string>();
    tilemaps.forEach((tm) => {
      if (tm.assetId && tm.image) {
        dataUrls.set(tm.assetId, tm.image);
      }
    });
    const cancels: Array<() => void> = [];
    dataUrls.forEach((dataUrl, assetId) => {
      if (assetDimensionsRef.current[assetId]) return;
      const img = new Image();
      img.onload = () => {
        setAssetDimensions((prev) => ({
          ...prev,
          [assetId]: { w: img.naturalWidth, h: img.naturalHeight },
        }));
      };
      img.src = dataUrl;
      cancels.push(() => {
        img.src = '';
      });
    });
    return () => cancels.forEach((c) => c());
  }, [tilemaps]);

  const [mapImageDimensions, setMapImageDimensions] = useState<{
    natural: { w: number; h: number };
    scaled: { w: number; h: number };
  } | null>(null);

  useEffect(() => {
    if (!mapImageUrl) {
      setMapImageDimensions(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const scaleDivisor = Math.max(
        1,
        Math.ceil(w / MAP_IMAGE_MAX_WIDTH),
        Math.ceil(h / MAP_IMAGE_MAX_HEIGHT),
      );
      const scaledW = Math.round(w / scaleDivisor);
      const scaledH = Math.round(h / scaleDivisor);
      setMapImageDimensions({
        natural: { w, h },
        scaled: { w: scaledW, h: scaledH },
      });
    };
    img.src = mapImageUrl;
    return () => {
      img.src = '';
    };
  }, [mapImageUrl]);

  const getTileStyle = (td: TileData): React.CSSProperties => {
    if (!td.tileId) return {}; // Placeholder tile (no tileset)
    const tile = tilesById?.get(td.tileId);
    if (!tile) return {};
    const tilemap = tilemapsById.get(tile.tilemapId ?? '');
    if (!tilemap) return {};
    const data = tilemap.image ?? null;
    if (!data) return {};
    const tw = tilemap.tileWidth;
    const th = tilemap.tileHeight;
    const tileX = tile.tileX ?? 0;
    const tileY = tile.tileY ?? 0;
    const dim = assetDimensionsRef.current[tilemap.assetId];
    const backgroundSize =
      dim != null
        ? `${(dim.w * effectiveTileSize) / tw}px ${(dim.h * effectiveTileSize) / th}px`
        : 'auto';

    const posX = tileX * effectiveTileSize;
    const posY = tileY * effectiveTileSize;
    return {
      backgroundImage: `url(${data})`,
      backgroundPosition: `-${posX}px -${posY}px`,
      backgroundSize,
      backgroundRepeat: 'no-repeat',
    };
  };

  return {
    assetDimensions,
    getTileStyle,
    effectiveTileSize,
    mapImageDimensions,
  };
};
