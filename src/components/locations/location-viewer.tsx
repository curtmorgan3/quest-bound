import { SpriteStack } from '@/components/composites/sprite-stack';
import { Button } from '@/components/ui/button';
import { useTilemapAsset } from '@/hooks';
import { useLocation } from '@/lib/compass-api';
import type { SheetViewerBackdropClickDetail } from '@/lib/compass-planes/sheet-viewer';
import { SHEET_VIEWER_BACKDROP_CLICK } from '@/lib/compass-planes/sheet-viewer';
import { cn } from '@/lib/utils';
import type { TileData, TileMenuPayload } from '@/types';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTilesByKey } from './utils';

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
  /** Fallback when sprites not provided. */
  imageUrl: string | null;
  label: string;
  /** Asset IDs or URLs for map sprites (stacked by z-index). When set, used instead of imageUrl. */
  sprites?: string[];
  /** Size in tiles (default 1). */
  mapWidth?: number;
  mapHeight?: number;
  /** When set, the overlay is draggable and this payload is passed on drop. */
  dragPayload?: LocationViewerDragPayload;
  selected?: boolean;
};

export interface LocationViewerProps {
  locationId: string | undefined;
  worldId: string | undefined;
  /** Optional: called when a cell is clicked (x, y). Event provided for menu positioning. */
  onSelectCell?: (x: number, y: number, event?: React.MouseEvent) => void;
  /** Optional: tile render size in pixels. */
  tileRenderSize?: number;
  /** Optional: campaign entities to draw on the grid (character/item icons). */
  overlayNodes?: LocationViewerOverlayNode[];
  /** Optional: tile IDs that have a campaign event (highlight). */
  eventTileIds?: string[];
  /** Optional: tile ID to highlight (e.g. when tile menu is open). Shown as orange overlay. */
  highlightedTileId?: string | null;
  /** Optional: called when something is dropped on a cell (e.g. drag payload from overlay). */
  onDrop?: (x: number, y: number, e: React.DragEvent) => void;
  /** Optional: called when an overlay node (e.g. character/item) is clicked. Use to open context menu at that tile. */
  onOverlayClick?: (tileId: string, e: React.MouseEvent) => void;
  /** When true, clicking a tile opens a menu with "Move Character" instead of calling onSelectCell. */
  playMode?: boolean;
  /** In play mode, called when the user chooses "Move Character" for a tile. */
  onMoveCharacter?: (tileId: string) => void;
  /** In play mode, called when the user clicks a tile (and not an overlay). Parent can open a tile menu and then call onMoveCharacter when user chooses "Move Character". */
  onTileMenuRequest?: (payload: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    tileId: string;
  }) => void;
  /** In play mode, called when the user clicks a cell with no tile. Should create a tile and return its id, or null on failure. */
  onCreateTileAt?: (x: number, y: number) => Promise<string | null>;
  /** Called when the sheet viewer backdrop is clicked and the position is over this viewer's grid. x,y are cell coords; tileId is the top tile at that cell or null. */
  onSheetBackdropClick?: (payload: TileMenuPayload) => void;
}

export function LocationViewer({
  locationId,
  worldId,
  onSelectCell,
  tileRenderSize: tileRenderSizeProp,
  overlayNodes = [],
  eventTileIds = [],
  highlightedTileId = null,
  onDrop,
  onOverlayClick,
  playMode = false,
  onMoveCharacter,
  onTileMenuRequest,
  onCreateTileAt,
  onSheetBackdropClick,
}: LocationViewerProps) {
  const location = useLocation(locationId);
  const loc = location ?? undefined;
  const gridWidth = loc?.gridWidth ?? 1;
  const gridHeight = loc?.gridHeight ?? 1;

  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        e.stopPropagation();
        setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
      } else if (e.key === '-') {
        e.preventDefault();
        e.stopPropagation();
        setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  const { getTileStyle, effectiveTileSize } = useTilemapAsset({
    worldId,
    locationId,
    zoom,
    overrideTileRendersize: tileRenderSizeProp,
  });

  const tilesByKey = useMemo(() => getTilesByKey(loc?.tiles ?? []), [loc?.tiles]);
  const tileIdToCoord = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    (loc?.tiles ?? []).forEach((td) => map.set(td.id, { x: td.x, y: td.y }));
    return map;
  }, [loc?.tiles]);
  const mapImageUrl = loc?.mapAsset ?? null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridStateRef = useRef({
    effectiveTileSize: 0,
    gridWidth: 0,
    gridHeight: 0,
    tilesByKey: new Map<string, TileData[]>(),
  });
  gridStateRef.current = {
    effectiveTileSize,
    gridWidth,
    gridHeight,
    tilesByKey,
  };

  useEffect(() => {
    if (!onSheetBackdropClick) return;
    const handler = (e: CustomEvent<SheetViewerBackdropClickDetail>) => {
      const { clientX, clientY } = e.detail;
      const container = scrollContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX >= rect.right ||
        clientY < rect.top ||
        clientY >= rect.bottom
      )
        return;
      const {
        effectiveTileSize: size,
        gridWidth: gw,
        gridHeight: gh,
        tilesByKey: tbk,
      } = gridStateRef.current;
      if (size <= 0) return;
      const localX = clientX - rect.left + container.scrollLeft;
      const localY = clientY - rect.top + container.scrollTop;
      const x = Math.floor(localX / size);
      const y = Math.floor(localY / size);
      if (x < 0 || x >= gw || y < 0 || y >= gh) return;
      const layers = tbk.get(`${x},${y}`) ?? [];
      const topTile = layers.length > 0 ? layers[layers.length - 1]! : null;
      if (!topTile) return;
      onSheetBackdropClick({
        clientX,
        clientY,
        x,
        y,
        tileId: topTile.id,
      });
    };
    window.addEventListener(SHEET_VIEWER_BACKDROP_CLICK, handler as EventListener);
    return () => window.removeEventListener(SHEET_VIEWER_BACKDROP_CLICK, handler as EventListener);
  }, [onSheetBackdropClick]);

  const handleCellClick = useCallback(
    async (x: number, y: number, e: React.MouseEvent) => {
      if (playMode && (onMoveCharacter || onTileMenuRequest)) {
        // Find top layered tile at this cell
        const layers = tilesByKey.get(`${x},${y}`) ?? [];
        let topTile = layers.length > 0 ? layers[layers.length - 1]! : null;

        // Create a tile if there isn't one
        if (!topTile && onCreateTileAt) {
          const newTileId = await onCreateTileAt(x, y);
          if (newTileId) topTile = { id: newTileId, x, y, zIndex: 0 } as TileData;
        }

        if (topTile) {
          // If clicking on a character/item sprite (overlay at this tile), callback on overlay select and skip the menu
          const overlayAtTile = overlayNodes.find((node) => node.tileId === topTile!.id);
          if (overlayAtTile && onOverlayClick) {
            onOverlayClick(topTile.id, e);
            return;
          }
          onTileMenuRequest?.({
            x,
            y,
            clientX: e.clientX,
            clientY: e.clientY,
            tileId: topTile.id,
          });
        }
        return;
      }
      onSelectCell?.(x, y, e);
    },
    [
      playMode,
      onMoveCharacter,
      onTileMenuRequest,
      onCreateTileAt,
      tilesByKey,
      overlayNodes,
      onOverlayClick,
      onSelectCell,
    ],
  );

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
      <div className='fixed bottom-12 right-2 z-10 flex flex-col gap-0.5'>
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
      <div ref={scrollContainerRef} className='h-full w-full overflow-auto flex'>
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
            className='inline-grid bg-muted-foreground/20'
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, ${effectiveTileSize}px)`,
              gridTemplateRows: `repeat(${gridHeight}, ${effectiveTileSize}px)`,
            }}>
            {Array.from({ length: gridHeight }, (_, y) =>
              Array.from({ length: gridWidth }, (_, x) => {
                const key = `${x},${y}`;
                const layers = tilesByKey.get(key) ?? [];
                const hasEvent = layers.some((td) => eventTileIds.includes(td.id));
                const isHighlighted =
                  highlightedTileId != null &&
                  layers.some((td) => td.id === highlightedTileId);
                return (
                  <div
                    key={key}
                    role={
                      onSelectCell || (playMode && (onMoveCharacter || onTileMenuRequest))
                        ? 'button'
                        : undefined
                    }
                    className='shrink-0 bg-muted/50 hover:bg-muted relative'
                    style={{ width: effectiveTileSize, height: effectiveTileSize }}
                    onClick={(e) => handleCellClick(x, y, e)}
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
                    {isHighlighted && (
                      <span
                        className='absolute inset-0 bg-orange-500/40 rounded pointer-events-none border-2 border-orange-500'
                        title='Selected'
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
                  className={cn(
                    'absolute flex items-center justify-center overflow-hidden',
                    isDraggable && 'cursor-grab active:cursor-grabbing',
                    node.selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
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
                  {node.sprites && node.sprites.length > 0 ? (
                    <SpriteStack
                      entity={{ sprites: node.sprites }}
                      className='pointer-events-none'
                      alt={node.label}
                    />
                  ) : node.imageUrl ? (
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
