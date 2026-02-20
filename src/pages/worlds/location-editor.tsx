import { Button, Input, Label } from '@/components';
import { useAssets, useLocation, useLocations, useTilemaps, useWorld } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Action, Tile, TileData, Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Grid3X3 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CellPropertyPanel } from './cell-property-panel';
import { TilePaintBar } from './tilemaps';

const TILE_DISPLAY_SIZE = 32;

function getTilesByKey(tiles: TileData[]): Map<string, TileData> {
  const map = new Map<string, TileData>();
  for (const td of tiles) {
    map.set(`${td.x},${td.y}`, td);
  }
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
  const loc = location ?? undefined;
  const gridWidth = loc?.gridWidth ?? 1;
  const gridHeight = loc?.gridHeight ?? 1;

  const tileIdsInLocation = useMemo(
    () => [...new Set((loc?.tiles ?? []).map((td) => td.tileId))],
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
  const { assets } = useAssets(world?.rulesetId ?? null);
  const actions = useLiveQuery(
    () =>
      world?.rulesetId
        ? db.actions.where('rulesetId').equals(world.rulesetId).toArray()
        : Promise.resolve([] as Action[]),
    [world?.rulesetId],
  );

  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [gridWidthInput, setGridWidthInput] = useState('');
  const [gridHeightInput, setGridHeightInput] = useState('');
  const gridWidthDisplay = gridWidthInput !== '' ? gridWidthInput : String(gridWidth);
  const gridHeightDisplay = gridHeightInput !== '' ? gridHeightInput : String(gridHeight);

  const tilesByKey = useMemo(() => getTilesByKey(loc?.tiles ?? []), [loc?.tiles]);

  const selectedTileData = selectedCell
    ? tilesByKey.get(`${selectedCell.x},${selectedCell.y}`)
    : null;

  const handleSetGridSize = () => {
    const w = Math.max(1, Math.min(100, parseInt(gridWidthDisplay, 10) || 1));
    const h = Math.max(1, Math.min(100, parseInt(gridHeightDisplay, 10) || 1));
    setGridWidthInput('');
    setGridHeightInput('');
    if (loc) updateLocation(loc.id, { gridWidth: w, gridHeight: h });
  };

  const handleCellClick = async (x: number, y: number) => {
    if (!loc) return;
    if (selectedTile) {
      const existing = tilesByKey.get(`${x},${y}`);
      const tileId = selectedTile.id;
      const newTiles = (loc.tiles ?? []).filter((td) => !(td.x === x && td.y === y));
      newTiles.push({
        id: existing?.id ?? crypto.randomUUID(),
        tileId,
        x,
        y,
        isPassable: existing?.isPassable ?? true,
        actionId: existing?.actionId,
      });
      await updateLocation(loc.id, { tiles: newTiles });
    } else if (selectedCell?.x === x && selectedCell?.y === y) {
      setSelectedCell(null);
    } else {
      setSelectedCell({ x, y });
    }
  };

  const handleUpdateTileData = (updates: Partial<TileData>) => {
    if (!loc || !selectedCell) return;
    const existing = tilesByKey.get(`${selectedCell.x},${selectedCell.y}`);
    if (!existing) return;
    const newTiles = (loc.tiles ?? []).map((td) =>
      td.x === selectedCell.x && td.y === selectedCell.y ? { ...td, ...updates } : td,
    );
    updateLocation(loc.id, { tiles: newTiles });
  };

  const handleRemoveTileFromCell = () => {
    if (!loc || !selectedCell) return;
    const newTiles = (loc.tiles ?? []).filter(
      (td) => !(td.x === selectedCell!.x && td.y === selectedCell!.y),
    );
    updateLocation(loc.id, { tiles: newTiles });
  };

  const getAssetData = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    return asset?.data ?? null;
  };

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
    // Scale asset so one tilemap grid cell (tw×th) fills location editor cell (TILE_DISPLAY_SIZE)
    const backgroundSize =
      dim != null
        ? `${(dim.w * TILE_DISPLAY_SIZE) / tw}px ${(dim.h * TILE_DISPLAY_SIZE) / th}px`
        : 'auto';
    // Position in scaled image: one tile = TILE_DISPLAY_SIZE px, so tile (tileX,tileY) is at (tileX*TILE_DISPLAY_SIZE, tileY*TILE_DISPLAY_SIZE)
    const posX = tileX * TILE_DISPLAY_SIZE;
    const posY = tileY * TILE_DISPLAY_SIZE;
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

  const actionsList = actions ?? [];

  return (
    <div className='flex h-full w-full flex-col'>
      {/* Breadcrumb & toolbar */}
      <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link to={`/worlds/${worldId}`} data-testid='location-editor-back'>
            <ArrowLeft className='h-4 w-4' />
            Back to World
          </Link>
        </Button>
        <span className='text-muted-foreground'>|</span>
        {world && (
          <>
            <span className='font-medium'>{world.label}</span>
            <span className='text-muted-foreground'>›</span>
          </>
        )}
        <span className='font-medium'>{location.label}</span>

        <div className='ml-auto flex items-center gap-2'>
          <div className='flex items-center gap-1'>
            <Label htmlFor='grid-width' className='text-xs'>
              W
            </Label>
            <Input
              id='grid-width'
              type='number'
              min={1}
              max={100}
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
              min={1}
              max={100}
              className='w-16'
              value={gridHeightDisplay}
              onChange={(e) => setGridHeightInput(e.target.value)}
              onBlur={handleSetGridSize}
            />
          </div>
          <Button variant='outline' size='sm' onClick={handleSetGridSize}>
            <Grid3X3 className='h-4 w-4' />
            Set grid
          </Button>
        </div>
      </div>

      <div className='flex min-h-0 flex-1 flex-col'>
        {/* Grid + cell panel */}
        <div className='flex min-h-0 flex-1 gap-4 p-4'>
          <div className='flex min-w-0 flex-1 flex-col gap-2'>
            <p className='text-xs text-muted-foreground'>
              {selectedTile
                ? 'Click a cell to paint. Click without a tile to select cell.'
                : 'Select a tile, then click a cell to paint.'}
            </p>
            <div
              className='inline-grid gap-px rounded border bg-muted-foreground/20 p-px'
              style={{
                gridTemplateColumns: `repeat(${gridWidth}, ${TILE_DISPLAY_SIZE}px)`,
                gridTemplateRows: `repeat(${gridHeight}, ${TILE_DISPLAY_SIZE}px)`,
              }}>
              {Array.from({ length: gridHeight }, (_, y) =>
                Array.from({ length: gridWidth }, (_, x) => {
                  const key = `${x},${y}`;
                  const td = tilesByKey.get(key);
                  const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                  return (
                    <button
                      key={key}
                      type='button'
                      className={`h-8 w-8 shrink-0 rounded-sm bg-muted/50 ${
                        isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted'
                      }`}
                      style={
                        td ? { ...getTileStyle(td), backgroundRepeat: 'no-repeat' } : undefined
                      }
                      onClick={() => handleCellClick(x, y)}
                    />
                  );
                }),
              )}
            </div>
          </div>

          {selectedCell && (
            <CellPropertyPanel
              cell={selectedCell}
              tileData={selectedTileData}
              actions={actionsList}
              onUpdateTileData={handleUpdateTileData}
              onRemoveTile={handleRemoveTileFromCell}
            />
          )}
        </div>

        <TilePaintBar
          worldId={worldId!}
          getAssetData={getAssetData}
          assetDimensions={assetDimensions}
          selectedTile={selectedTile}
          onSelectedTileChange={setSelectedTile}
        />
      </div>
    </div>
  );
}
