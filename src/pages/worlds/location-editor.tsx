import { Button, Input, Label } from '@/components';
import { useAssets, useLocation, useLocations, useTilemaps, useWorld } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Tile, TileData, Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CellPropertyPanel } from './cell-property-panel';
import { TilePaintBar } from './tilemaps';

const DEFAULT_TILE_RENDER_SIZE = 32;

function getTilesByKey(tiles: TileData[]): Map<string, TileData[]> {
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

export function LocationEditor() {
  const { worldId, locationId } = useParams<{ worldId: string; locationId: string }>();
  const world = useWorld(worldId);
  const location = useLocation(locationId);
  const { updateLocation } = useLocations(worldId);
  const { tilemaps } = useTilemaps(worldId);
  const tilemapsList = tilemaps ?? [];
  const [assetDimensions, setAssetDimensions] = useState<Record<string, { w: number; h: number }>>(
    {},
  );
  const assetDimensionsRef = useRef(assetDimensions);
  assetDimensionsRef.current = assetDimensions;
  const [mapImageDimensions, setMapImageDimensions] = useState<{
    natural: { w: number; h: number };
    scaled: { w: number; h: number };
  } | null>(null);

  const loc = location ?? undefined;
  const gridWidth = loc?.gridWidth ?? 1;
  const gridHeight = loc?.gridHeight ?? 1;

  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const tileIdsInLocation = useMemo(
    () => [
      ...new Set([...(loc?.tiles ?? []).map((td) => td.tileId), ...selectedTiles.map((t) => t.id)]),
    ],
    [loc?.tiles, selectedTiles],
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
  const { assets } = useAssets();

  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [paintLayer, setPaintLayer] = useState(0);
  const [gridWidthInput, setGridWidthInput] = useState('');
  const [gridHeightInput, setGridHeightInput] = useState('');
  const gridWidthDisplay = gridWidthInput !== '' ? gridWidthInput : String(gridWidth);
  const gridHeightDisplay = gridHeightInput !== '' ? gridHeightInput : String(gridHeight);
  const tileRenderSize = loc?.tileRenderSize ?? DEFAULT_TILE_RENDER_SIZE;

  const tilesByKey = useMemo(() => getTilesByKey(loc?.tiles ?? []), [loc?.tiles]);
  const isPaintingRef = useRef(false);

  useEffect(() => {
    const onMouseUp = () => {
      isPaintingRef.current = false;
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  const selectedCellLayers = selectedCell
    ? (tilesByKey.get(`${selectedCell.x},${selectedCell.y}`) ?? [])
    : [];
  const selectedTileData =
    selectedCellLayers.length > 0
      ? (selectedCellLayers.find((td) => td.id === selectedLayerId) ??
        selectedCellLayers[selectedCellLayers.length - 1])
      : null;

  const handleSetGridSize = () => {
    const w = Math.max(1, Math.min(100, parseInt(gridWidthDisplay, 10) || 1));
    const h = Math.max(1, Math.min(100, parseInt(gridHeightDisplay, 10) || 1));
    setGridWidthInput('');
    setGridHeightInput('');
    if (loc) updateLocation(loc.id, { gridWidth: w, gridHeight: h });
  };

  const applyTileToCell = (x: number, y: number) => {
    if (!loc || selectedTiles.length === 0) return;
    if (selectedTiles.length === 1) {
      const t = selectedTiles[0];
      const newTile: TileData = {
        id: crypto.randomUUID(),
        tileId: t.id,
        x,
        y,
        zIndex: paintLayer,
        isPassable: true,
      };
      updateLocation(loc.id, { tiles: [...(loc.tiles ?? []), newTile] });
      return;
    }
    const topLeft = selectedTiles.reduce((best, t) =>
      (t.tileY ?? 0) < (best.tileY ?? 0) ||
      ((t.tileY ?? 0) === (best.tileY ?? 0) && (t.tileX ?? 0) < (best.tileX ?? 0))
        ? t
        : best,
    );
    const baseX = topLeft.tileX ?? 0;
    const baseY = topLeft.tileY ?? 0;
    const newTilesData: TileData[] = [];
    for (const t of selectedTiles) {
      const cx = x + (t.tileX ?? 0) - baseX;
      const cy = y + (t.tileY ?? 0) - baseY;
      if (cx >= 0 && cx < gridWidth && cy >= 0 && cy < gridHeight) {
        newTilesData.push({
          id: crypto.randomUUID(),
          tileId: t.id,
          x: cx,
          y: cy,
          zIndex: paintLayer,
          isPassable: true,
        });
      }
    }
    updateLocation(loc.id, { tiles: [...(loc.tiles ?? []), ...newTilesData] });
  };

  const handleCellClick = (x: number, y: number) => {
    if (!loc) return;
    if (selectedTiles.length > 0) {
      // Tile(s) already applied in handleCellMouseDown; click only used for drag or to select
      return;
    }
    if (selectedCell?.x === x && selectedCell?.y === y) {
      setSelectedCell(null);
      setSelectedLayerId(null);
    } else {
      setSelectedCell({ x, y });
      const layers = tilesByKey.get(`${x},${y}`) ?? [];
      setSelectedLayerId(layers[layers.length - 1]?.id ?? null);
    }
  };

  const handleCellMouseDown = (x: number, y: number) => {
    if (selectedTiles.length > 0) {
      applyTileToCell(x, y);
      isPaintingRef.current = true;
    }
  };

  const handleCellMouseEnter = (x: number, y: number) => {
    if (isPaintingRef.current && selectedTiles.length > 0) {
      applyTileToCell(x, y);
    }
  };

  const handleUpdateTileData = (updates: Partial<TileData>) => {
    if (!loc || !selectedTileData) return;
    const newTiles = (loc.tiles ?? []).map((td) =>
      td.id === selectedTileData.id ? { ...td, ...updates } : td,
    );
    updateLocation(loc.id, { tiles: newTiles });
  };

  const handleRemoveTileFromCell = () => {
    if (!loc || !selectedTileData) return;
    const newTiles = (loc.tiles ?? []).filter((td) => td.id !== selectedTileData.id);
    updateLocation(loc.id, { tiles: newTiles });
  };

  const getAssetData = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    return asset?.data ?? null;
  };
  const mapImageUrl = loc?.mapAssetId ? (getAssetData(loc.mapAssetId) ?? null) : null;

  // Preload tilemap asset images to get dimensions; scale tiles by tilemap tileWidth/tileHeight
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
  }, [tilemapsList, assets]);

  const MAP_IMAGE_MAX_WIDTH = 900;
  const MAP_IMAGE_MAX_HEIGHT = 1200;

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
    const dim = assetDimensions[tilemap.assetId];
    // Scale asset so one tilemap grid cell (tw×th) fills location editor cell (tileRenderSize)
    const backgroundSize =
      dim != null
        ? `${(dim.w * tileRenderSize) / tw}px ${(dim.h * tileRenderSize) / th}px`
        : 'auto';
    // Position in scaled image: one tile = tileRenderSize px
    const posX = tileX * tileRenderSize;
    const posY = tileY * tileRenderSize;
    return {
      backgroundImage: `url(${data})`,
      backgroundPosition: `-${posX}px -${posY}px`,
      backgroundSize,
      backgroundRepeat: 'no-repeat',
    };
  };

  if (!worldId || !locationId) return null;
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
        <Button asChild variant='link'>
          <Link to={`/worlds/${worldId}`}>Back to World</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col'>
      {/* Breadcrumb & toolbar */}
      <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
        {world && (
          <>
            <span className='font-medium'>{world.label}</span>
            <span className='text-muted-foreground'>›</span>
          </>
        )}
        <Link
          to={`/worlds/${worldId}/locations/${locationId}`}
          className='font-medium hover:underline'>
          {location.label}
        </Link>

        <div className='ml-auto flex items-center gap-2'>
          <div className='flex items-center gap-1'>
            <Label htmlFor='tile-render-size' className='text-xs'>
              Tile size
            </Label>
            <Input
              id='tile-render-size'
              type='number'
              className='w-16'
              value={tileRenderSize}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && loc)
                  updateLocation(loc.id, {
                    tileRenderSize: Math.max(8, Math.min(128, v)),
                  });
              }}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Label htmlFor='grid-width' className='text-xs'>
              W
            </Label>
            <Input
              id='grid-width'
              type='number'
              className='w-16'
              value={gridWidthDisplay}
              onChange={(e) => setGridWidthInput(e.target.value)}
              onBlur={handleSetGridSize}
            />
          </div>
          <div className='flex items-center gap-1'>
            <Label htmlFor='grid-height' className='text-xs'>
              H
            </Label>
            <Input
              id='grid-height'
              type='number'
              className='w-16'
              value={gridHeightDisplay}
              onChange={(e) => setGridHeightInput(e.target.value)}
              onBlur={handleSetGridSize}
            />
          </div>
          <Button
            variant='outline'
            size='sm'
            className='gap-1 text-muted-foreground hover:text-destructive'
            onClick={() => loc && updateLocation(loc.id, { tiles: [] })}>
            <Trash2 className='h-4 w-4' />
            Clear
          </Button>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col'>
        <div className='flex flex-wrap items-end gap-4 pl-4 pr-4 pt-2'>
          <div className='flex items-center gap-1'>
            <Label htmlFor='paint-layer' className='text-xs'>
              Editing Layer
            </Label>
            <Input
              id='paint-layer'
              type='number'
              className='w-14'
              value={paintLayer}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) setPaintLayer(v);
              }}
            />
          </div>
        </div>
        {/* Grid + cell panel */}
        <div className='flex min-h-0 flex-1 gap-4 p-4 max-h-[60dvh]'>
          <div className='flex min-w-0 flex-1 flex-col gap-2 max-w-[60dvw] overflow-x-auto'>
            <p className='text-xs text-muted-foreground'>
              {selectedTiles.length > 0
                ? 'Click or drag over cells to paint. Top-left of selection aligns to cell. Click without a tile to select cell.'
                : 'Select one or more (Shift+click) tiles in the tile paint panel, then click or drag to paint.'}
            </p>
            <div
              id='location-editor-grid'
              className='inline-grid border bg-muted-foreground/20'
              style={{
                gridTemplateColumns: `repeat(${gridWidth}, ${tileRenderSize}px)`,
                gridTemplateRows: `repeat(${gridHeight}, ${tileRenderSize}px)`,

                ...(mapImageUrl && mapImageDimensions
                  ? {
                      backgroundImage: `url(${mapImageUrl})`,
                      width: `${mapImageDimensions.scaled.w}px`,
                      height: `${mapImageDimensions.scaled.h}px`,
                      backgroundSize: `${mapImageDimensions.scaled.w}px ${mapImageDimensions.scaled.h}px`,
                      backgroundPosition: '0 0',
                      backgroundRepeat: 'no-repeat',
                    }
                  : mapImageUrl
                    ? {
                        backgroundImage: `url(${mapImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: '0 0',
                        backgroundRepeat: 'no-repeat',
                      }
                    : {}),
              }}>
              {Array.from({ length: gridHeight }, (_, y) =>
                Array.from({ length: gridWidth }, (_, x) => {
                  const key = `${x},${y}`;
                  const layers = tilesByKey.get(key) ?? [];
                  const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                  return (
                    <button
                      key={key}
                      type='button'
                      className={`group relative shrink-0 cursor-pointer transition-colors ${
                        mapImageUrl ? 'bg-muted/50' : 'border border-border bg-muted'
                      } ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
                      style={{ width: tileRenderSize, height: tileRenderSize }}
                      onClick={() => handleCellClick(x, y)}
                      onMouseDown={() => handleCellMouseDown(x, y)}
                      onMouseEnter={() => handleCellMouseEnter(x, y)}>
                      <span
                        className='pointer-events-none absolute inset-0 bg-primary/25 opacity-0 transition-opacity group-hover:opacity-100'
                        aria-hidden
                      />
                      {layers.length > 0 && (
                        <span className='relative block size-full overflow-hidden pointer-events-none'>
                          {layers.map((td) => (
                            <span
                              key={td.id}
                              className='absolute inset-0 bg-no-repeat'
                              style={getTileStyle(td)}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          {selectedCell && (
            <CellPropertyPanel
              cell={selectedCell}
              layers={selectedCellLayers}
              selectedTileData={selectedTileData}
              onSelectLayer={setSelectedLayerId}
              getTileStyle={getTileStyle}
              actions={[]}
              onUpdateTileData={handleUpdateTileData}
              onRemoveTile={handleRemoveTileFromCell}
            />
          )}
        </div>

        <TilePaintBar
          worldId={worldId!}
          getAssetData={getAssetData}
          assetDimensions={assetDimensions}
          selectedTiles={selectedTiles}
          onSelectedTilesChange={setSelectedTiles}
          mapImage={mapImageUrl}
          onMapImageUpload={(id) => loc && updateLocation(loc.id, { mapAssetId: id })}
          onMapImageRemove={() => loc && updateLocation(loc.id, { mapAssetId: null })}
          rulesetId={world?.rulesetId ?? undefined}
        />
      </div>
    </div>
  );
}
