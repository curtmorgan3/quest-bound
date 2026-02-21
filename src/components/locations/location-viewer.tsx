import { Button } from '@/components/ui/button';
import { useLocation, useTilemaps } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Tile, TileData, Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTilesByKey } from './utils';

const DEFAULT_TILE_RENDER_SIZE = 32;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export type LocationViewerDragPayload =
  | { type: 'campaign-character'; id: string }
  | { type: 'campaign-item'; id: string };

export type LocationViewerOverlayNode = {
  id: string;
  tileId: string;
  type: 'character' | 'item';
  imageUrl: string | null;
  label: string;
  /** Size in tiles (default 1). */
  mapWidth?: number;
  mapHeight?: number;
  /** When set, the overlay is draggable and this payload is passed on drop. */
  dragPayload?: LocationViewerDragPayload;
};

export interface LocationViewerProps {
  locationId: string | undefined;
  worldId: string | undefined;
  /** Optional: resolve asset data for tile images. If not provided, tiles may not show images. */
  getAssetData?: (assetId: string) => string | null;
  /** Optional: called when a cell is clicked (x, y). Event provided for menu positioning. */
  onSelectCell?: (x: number, y: number, event?: React.MouseEvent) => void;
  /** Optional: tile render size in pixels. */
  tileRenderSize?: number;
  /** Optional: campaign entities to draw on the grid (character/item icons). */
  overlayNodes?: LocationViewerOverlayNode[];
  /** Optional: tile IDs that have a campaign event (highlight). */
  eventTileIds?: string[];
  /** Optional: called when something is dropped on a cell (e.g. drag payload from overlay). */
  onDrop?: (x: number, y: number, e: React.DragEvent) => void;
  /** Optional: called when an overlay node (e.g. character/item) is clicked. Use to open context menu at that tile. */
  onOverlayClick?: (tileId: string, e: React.MouseEvent) => void;
}

export function LocationViewer({
  locationId,
  worldId,
  getAssetData = () => null,
  onSelectCell,
  tileRenderSize: tileRenderSizeProp,
  overlayNodes = [],
  eventTileIds = [],
  onDrop,
  onOverlayClick,
}: LocationViewerProps) {
  const location = useLocation(locationId);
  const { tilemaps } = useTilemaps(worldId);
  const tilemapsList = tilemaps ?? [];
  const loc = location ?? undefined;
  const gridWidth = loc?.gridWidth ?? 1;
  const gridHeight = loc?.gridHeight ?? 1;
  const baseTileSize = tileRenderSizeProp ?? loc?.tileRenderSize ?? DEFAULT_TILE_RENDER_SIZE;

  const [zoom, setZoom] = useState(1);
  const effectiveTileSize = baseTileSize * zoom;

  const [assetDimensions, setAssetDimensions] = useState<Record<string, { w: number; h: number }>>(
    {},
  );
  const assetDimensionsRef = useRef(assetDimensions);
  assetDimensionsRef.current = assetDimensions;

  const tileIdsInLocation = useMemo(
    () => [
      ...new Set(
        (loc?.tiles ?? []).map((td) => td.tileId).filter((id): id is string => id != null),
      ),
    ],
    [loc?.tiles],
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
  const tilemapsById = useMemo(() => {
    const map = new Map<string, Tilemap>();
    tilemapsList.forEach((tm) => map.set(tm.id, tm));
    return map;
  }, [tilemapsList]);

  const tilesByKey = useMemo(() => getTilesByKey(loc?.tiles ?? []), [loc?.tiles]);
  const tileIdToCoord = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    (loc?.tiles ?? []).forEach((td) => map.set(td.id, { x: td.x, y: td.y }));
    return map;
  }, [loc?.tiles]);
  const mapImageUrl = loc?.mapAssetId ? getAssetData(loc.mapAssetId) : null;

  useEffect(() => {
    const dataUrls = new Map<string, string>();
    tilemapsList.forEach((tm) => {
      if (tm.assetId) {
        const data = getAssetData(tm.assetId);
        if (data) dataUrls.set(tm.assetId, data);
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
  }, [tilemapsList, getAssetData]);

  const getTileStyle = (td: TileData): React.CSSProperties => {
    if (!td.tileId) return {}; // Placeholder tile (no tileset)
    const tile = tilesById?.get(td.tileId);
    if (!tile) return {};
    const tilemap = tilemapsById.get(tile.tilemapId ?? '');
    if (!tilemap) return {};
    const data = getAssetData(tilemap.assetId);
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

  if (!locationId || !worldId) return null;
  if (location === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }
  if (!location) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Location not found.</p>
      </div>
    );
  }

  return (
    <div className='relative h-full w-full flex justify-center items-center'>
      <div className='fixed bottom-2 right-2 z-10 flex flex-col gap-0.5'>
        <Button
          type='button'
          variant='secondary'
          size='icon'
          className='h-8 w-8 shrink-0 shadow'
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
          disabled={zoom >= ZOOM_MAX}
          title='Zoom in'
          aria-label='Zoom in'>
          <ZoomIn className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='secondary'
          size='icon'
          className='h-8 w-8 shrink-0 shadow'
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
          disabled={zoom <= ZOOM_MIN}
          title='Zoom out'
          aria-label='Zoom out'>
          <ZoomOut className='h-4 w-4' />
        </Button>
      </div>
      <div className='h-full w-full overflow-auto flex'>
        <div
          className='relative'
          style={{
            width: gridWidth * effectiveTileSize,
            height: gridHeight * effectiveTileSize,
          }}>
          {mapImageUrl && (
            <img
              src={mapImageUrl}
              alt='Location map'
              className='absolute inset-0 size-full object-cover pointer-events-none'
            />
          )}
          <div
            className='inline-grid border bg-muted-foreground/20 p-px'
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, ${effectiveTileSize}px)`,
              gridTemplateRows: `repeat(${gridHeight}, ${effectiveTileSize}px)`,
            }}>
            {Array.from({ length: gridHeight }, (_, y) =>
              Array.from({ length: gridWidth }, (_, x) => {
                const key = `${x},${y}`;
                const layers = tilesByKey.get(key) ?? [];
                const hasEvent = layers.some((td) => eventTileIds.includes(td.id));
                return (
                  <div
                    key={key}
                    role={onSelectCell ? 'button' : undefined}
                    className='shrink-0 bg-muted/50 hover:bg-muted relative'
                    style={{ width: effectiveTileSize, height: effectiveTileSize }}
                    onClick={(e) => onSelectCell?.(x, y, e)}
                    onDragOver={
                      onDrop
                        ? (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }
                        : undefined
                    }
                    onDrop={
                      onDrop
                        ? (e) => {
                            e.preventDefault();
                            onDrop(x, y, e);
                          }
                        : undefined
                    }>
                    {layers.length > 0 && (
                      <span className='relative block size-full overflow-hidden'>
                        {layers.map((td) => (
                          <span
                            key={td.id}
                            className='absolute inset-0 bg-no-repeat'
                            style={getTileStyle(td)}
                          />
                        ))}
                      </span>
                    )}
                    {hasEvent && (
                      <span
                        className='absolute inset-0 border-2 border-amber-500 rounded pointer-events-none'
                        title='Campaign event'
                        aria-hidden
                      />
                    )}
                  </div>
                );
              }),
            )}
          </div>
          {overlayNodes.length > 0 &&
            overlayNodes.map((node) => {
              const coord = tileIdToCoord.get(node.tileId);
              if (coord == null) return null;
              const isDraggable = Boolean(node.dragPayload);
              const w = node.mapWidth ?? 1;
              const h = node.mapHeight ?? 1;
              const padding = 2;
              return (
                <div
                  key={node.id}
                  className='absolute flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing'
                  style={{
                    backgroundColor: 'transparent',
                    left: coord.x * effectiveTileSize + padding,
                    top: coord.y * effectiveTileSize + padding,
                    width: effectiveTileSize * w - padding * 2,
                    height: effectiveTileSize * h - padding * 2,
                    pointerEvents: isDraggable ? 'auto' : 'none',
                    ...(isDraggable ? { border: '2px solid transparent', borderRadius: 4 } : {}),
                  }}
                  title={node.label}
                  draggable={isDraggable}
                  onDragStart={
                    isDraggable && node.dragPayload
                      ? (e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify(node.dragPayload),
                          );
                        }
                      : undefined
                  }
                  onClick={
                    onOverlayClick && isDraggable
                      ? (e) => {
                          e.stopPropagation();
                          onOverlayClick(node.tileId, e);
                        }
                      : undefined
                  }>
                  {node.imageUrl ? (
                    <img
                      src={node.imageUrl}
                      alt={node.label}
                      className='max-w-full max-h-full object-contain pointer-events-none'
                      draggable={false}
                    />
                  ) : (
                    <span className='text-xs truncate px-0.5 pointer-events-none'>
                      {node.label}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
