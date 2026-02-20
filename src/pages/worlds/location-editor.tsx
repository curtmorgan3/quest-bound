import { Button, Checkbox, Input, Label } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAssets,
  useLocation,
  useLocations,
  useTilemaps,
  useTiles,
  useWorld,
} from '@/lib/compass-api';
import { db } from '@/stores';
import type { Action, Tile, TileData, Tilemap } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Grid3X3, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

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
  const [selectedTilemapId, setSelectedTilemapId] = useState<string | null>(null);
  const tilesResult = useTiles(selectedTilemapId ?? undefined);
  const tilesForPicker = tilesResult?.tiles ?? [];
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

  const getPickerTileStyle = (tm: Tilemap, t: Tile): React.CSSProperties => {
    const data = getAssetData(tm.assetId);
    if (!data) return {};
    const tw = tm.tileWidth;
    const th = tm.tileHeight;
    const tileX = t.tileX ?? 0;
    const tileY = t.tileY ?? 0;
    const dim = assetDimensions[tm.assetId];
    const backgroundSize =
      dim != null
        ? `${(dim.w * TILE_DISPLAY_SIZE) / tw}px ${(dim.h * TILE_DISPLAY_SIZE) / th}px`
        : 'auto';
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
              gridTemplateColumns: `repeat(${gridWidth}, 32px)`,
              gridTemplateRows: `repeat(${gridHeight}, 32px)`,
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
                    className={`h-8 w-8 shrink-0 rounded-sm border bg-muted/50 ${
                      isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted'
                    }`}
                    style={td ? { ...getTileStyle(td), backgroundRepeat: 'no-repeat' } : undefined}
                    onClick={() => handleCellClick(x, y)}
                  />
                );
              }),
            )}
          </div>
          </div>

        {/* Cell property panel */}
        {selectedCell && (
          <div className='flex w-56 shrink-0 flex-col gap-3 rounded-md border bg-muted/30 p-3'>
            <h3 className='text-sm font-semibold'>
              Cell ({selectedCell.x}, {selectedCell.y})
            </h3>
            {selectedTileData ? (
              <>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='cell-passable'
                    checked={selectedTileData.isPassable}
                    onCheckedChange={(c) => handleUpdateTileData({ isPassable: c === true })}
                  />
                  <Label htmlFor='cell-passable' className='text-sm'>
                    Passable
                  </Label>
                </div>
                <div className='grid gap-1'>
                  <Label className='text-xs'>Action</Label>
                  <Select
                    value={selectedTileData.actionId ?? '_none'}
                    onValueChange={(v) =>
                      handleUpdateTileData({ actionId: v === '_none' ? undefined : v })
                    }>
                    <SelectTrigger className='h-8'>
                      <SelectValue placeholder='None' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='_none'>None</SelectItem>
                      {actionsList.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1 text-destructive hover:text-destructive'
                  onClick={handleRemoveTileFromCell}>
                  <Trash2 className='h-4 w-4' />
                  Remove tile
                </Button>
              </>
            ) : (
              <p className='text-xs text-muted-foreground'>
                No tile here. Select a tile and click to paint.
              </p>
            )}
          </div>
        )}

        </div>

        {/* Tile paint bar - full width at bottom */}
        <div className='flex shrink-0 flex-wrap items-center gap-4 border-t bg-muted/30 px-4 py-3'>
          <h3 className='text-sm font-semibold'>Tile paint</h3>
          {tilemapsList.length === 0 ? (
            <p className='text-xs text-muted-foreground'>
              No tilemaps. Create one from the world&apos;s Tilemaps page.
            </p>
          ) : (
            <>
              <div className='flex items-center gap-2'>
                <Label className='text-xs'>Tilemap</Label>
                <Select
                  value={selectedTilemapId ?? '_none'}
                  onValueChange={(v) =>
                    v === '_none' ? setSelectedTilemapId(null) : setSelectedTilemapId(v)
                  }>
                  <SelectTrigger className='h-8 w-40'>
                    <SelectValue placeholder='Select tilemap' />
                  </SelectTrigger>
                  <SelectContent>
                    {tilemapsList.map((tm) => (
                      <SelectItem key={tm.id} value={tm.id}>
                        {tm.label || `${tm.tileWidth}×${tm.tileHeight}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTilemapId && (() => {
                const tm = tilemapsList.find((m) => m.id === selectedTilemapId);
                if (!tm) return null;
                const dim = assetDimensions[tm.assetId];
                const cols = dim
                  ? Math.ceil(dim.w / tm.tileWidth)
                  : Math.max(1, ...tilesForPicker.map((t) => (t.tileX ?? 0) + 1));
                const rows = dim
                  ? Math.ceil(dim.h / tm.tileHeight)
                  : Math.max(1, ...tilesForPicker.map((t) => (t.tileY ?? 0) + 1));
                const tilesByCoord = new Map(
                  tilesForPicker.map((t) => [`${t.tileX ?? 0},${t.tileY ?? 0}`, t]),
                );
                return (
                  <>
                    <div className='flex items-center gap-2'>
                      <Label className='text-xs'>Tile</Label>
                      <div
                        className='inline-grid max-h-32 overflow-auto rounded border bg-muted/30 p-1'
                        style={{
                          gridTemplateColumns: `repeat(${cols}, ${TILE_DISPLAY_SIZE}px)`,
                          gridTemplateRows: `repeat(${rows}, ${TILE_DISPLAY_SIZE}px)`,
                        }}>
                        {Array.from({ length: rows }, (_, y) =>
                          Array.from({ length: cols }, (_, x) => {
                            const tile = tilesByCoord.get(`${x},${y}`);
                            return (
                              <button
                                key={tile ? tile.id : `empty-${x}-${y}`}
                                type='button'
                                className={`h-8 w-8 shrink-0 rounded border bg-muted ${
                                  selectedTile?.id === tile?.id ? 'ring-2 ring-primary' : ''
                                }`}
                                style={tile && tm ? getPickerTileStyle(tm, tile) : undefined}
                                onClick={() =>
                                  setSelectedTile((current) =>
                                    tile ? (current?.id === tile.id ? null : tile) : current,
                                  )
                                }
                                title={tile ? `Tile ${x},${y}` : `(${x},${y})`}
                              />
                            );
                          }),
                        )}
                      </div>
                    </div>
                    {tilesForPicker.length === 0 && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs'
                        onClick={async () => {
                          if (!selectedTilemapId) return;
                          const id = await tilesResult.createTile(selectedTilemapId, {
                            tileX: 0,
                            tileY: 0,
                          });
                          if (id) {
                            const t = await db.tiles.get(id);
                            if (t) setSelectedTile(t);
                          }
                        }}>
                        Add tile (0,0)
                      </Button>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
