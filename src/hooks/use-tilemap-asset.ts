import {
  DEFAULT_TILE_RENDER_SIZE,
  MAX_LOCATION_MAP_ASSET_HEIGHT,
  MAX_LOCATION_MAP_ASSET_WIDTH,
} from '@/constants';
import { useLocation, useTilemaps } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Tile, TileData, Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';

type AssetSize = {
  w: number;
  h: number;
};

/**
 * Given a world and location ID, returns a lookup of tilemap assets to dimensions.
 *
 * assetDimensions are tilemap assets that are split into tiles. These are scaled at time of save.
 * mapImageDimensions are scaled at runtime. getStyleTile accounts for the scaling.
 */
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

  const [mapImageDimensions, setMapImageDimensions] = useState<{
    natural: { w: number; h: number };
    scaled: { w: number; h: number };
  } | null>(null);

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

  // Preload tilemap asset images to get dimensions
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
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setAssetDimensions((prev) => ({ ...prev, [assetId]: { w, h } }));
      };
      img.src = dataUrl;
      cancels.push(() => {
        img.src = '';
      });
    });
    return () => cancels.forEach((c) => c());
  }, [tilemaps]);

  // Scale Map images down if naturally larger than max allowed
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
        Math.ceil(w / MAX_LOCATION_MAP_ASSET_WIDTH),
        Math.ceil(h / MAX_LOCATION_MAP_ASSET_HEIGHT),
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

  function getTileStyle(td: TileData): React.CSSProperties {
    if (!td?.tileId) return {};
    const t = tilesById?.get(td.tileId);
    if (!t) return {};

    if (!t.tilemapId) return {};
    const tm = tilemapsById.get(t.tilemapId);
    if (!tm) return {};

    const data = tm.image ?? null;
    if (!data) return {};

    const tw = tm.tileWidth;
    const th = tm.tileHeight;
    const tileX = t.tileX ?? 0;
    const tileY = t.tileY ?? 0;
    const dim = assetDimensions[tm.assetId];
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
  }

  return {
    getTileStyle,
    assetDimensions,
    effectiveTileSize,
    mapImageDimensions,
  };
};
