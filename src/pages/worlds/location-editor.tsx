import { Button, Input, Label } from '@/components';
import { getTilesByKey } from '@/components/locations';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEFAULT_TILE_RENDER_SIZE } from '@/constants';
import { useTilemapAsset } from '@/hooks';
import { useLocation, useLocations, useWorld } from '@/lib/compass-api';
import type { Tile, TileData } from '@/types';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CellPropertyPanel } from './cell-property-panel';
import { TilePaintBar } from './tilemaps';

export function LocationEditor() {
  const { worldId, locationId } = useParams<{ worldId: string; locationId: string }>();
  const world = useWorld(worldId);
  const location = useLocation(locationId);
  const { updateLocation } = useLocations(worldId);

  const mapImageUrl = location?.mapAsset ?? null;

  const { getTileStyle, mapImageStyle } = useTilemapAsset({
    worldId,
    locationId,
  });

  const loc = location ?? undefined;
  const gridWidth = loc?.gridWidth ?? 1;
  const gridHeight = loc?.gridHeight ?? 1;

  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);

  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [paintLayer, setPaintLayer] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [gridWidthInput, setGridWidthInput] = useState(gridWidth);
  const [gridHeightInput, setGridHeightInput] = useState(gridHeight);
  const tileRenderSize = loc?.tileRenderSize ?? DEFAULT_TILE_RENDER_SIZE;

  const tilesByKey = useMemo(() => getTilesByKey(loc?.tiles ?? []), [loc?.tiles]);
  const isPaintingRef = useRef(false);
  const pendingPaintKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onMouseUp = () => {
      isPaintingRef.current = false;
      pendingPaintKeysRef.current = new Set();
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    setGridWidthInput(gridWidth);
    setGridHeightInput(gridHeight);
  }, [gridWidth, gridHeight]);

  const selectedCellLayers = selectedCell
    ? (tilesByKey.get(`${selectedCell.x},${selectedCell.y}`) ?? [])
    : [];
  const selectedTileData =
    selectedCellLayers.length > 0
      ? (selectedCellLayers.find((td) => td.id === selectedLayerId) ??
        selectedCellLayers[selectedCellLayers.length - 1])
      : null;

  const handleSetGridSize = () => {
    if (!loc) return;
    const wRaw = gridWidthInput;
    const hRaw = gridHeightInput;
    const w = Math.max(1, Math.min(100, Number.isNaN(wRaw) ? gridWidth : wRaw));
    const h = Math.max(1, Math.min(100, Number.isNaN(hRaw) ? gridHeight : hRaw));
    const widthChanged = w !== gridWidth;
    const heightChanged = h !== gridHeight;
    if (widthChanged || heightChanged) {
      updateLocation(loc.id, { gridWidth: w, gridHeight: h });
      setGridWidthInput(w);
      setGridHeightInput(h);
    }
  };

  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const td of loc?.tiles ?? []) {
      keys.add(`${td.x},${td.y},${td.tileId},${td.zIndex ?? 0}`);
    }
    return keys;
  }, [loc?.tiles]);

  const applyTileToCell = (x: number, y: number) => {
    if (!loc || selectedTiles.length === 0) return;
    const hasKey = (key: string) => existingKeys.has(key) || pendingPaintKeysRef.current.has(key);
    if (selectedTiles.length === 1) {
      const t = selectedTiles[0];
      const key = `${x},${y},${t.id},${paintLayer}`;
      if (hasKey(key)) return;
      pendingPaintKeysRef.current.add(key);
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
        const key = `${cx},${cy},${t.id},${paintLayer}`;
        if (hasKey(key)) continue;
        pendingPaintKeysRef.current.add(key);
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
    if (newTilesData.length === 0) return;
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
      setPanelOpen(true);
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

  const handleAddBlankTileToCell = () => {
    if (!loc || !selectedCell) return;
    const newTile: TileData = {
      id: crypto.randomUUID(),
      x: selectedCell.x,
      y: selectedCell.y,
      zIndex: paintLayer,
      isPassable: true,
    };
    updateLocation(loc.id, { tiles: [...(loc.tiles ?? []), newTile] });
    setSelectedLayerId(newTile.id);
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
              value={gridWidthInput}
              onChange={(e) => setGridWidthInput(parseInt(e.target.value, 10))}
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
              value={gridHeightInput}
              onChange={(e) => setGridHeightInput(parseInt(e.target.value, 10))}
            />
          </div>
          <Button variant='outline' size='sm' onClick={handleSetGridSize}>
            Set
          </Button>
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
        {/* Grid */}
        <div
          className={`flex min-h-0 flex-1 flex-col gap-2 overflow-x-auto p-4 max-h-[${panelOpen ? '60dvh' : '80dvh'}]`}>
          <p className='text-xs text-muted-foreground'>
            {selectedTiles.length > 0
              ? 'Click or drag over cells to paint. Top-left of selection aligns to cell. Click without a tile to select cell.'
              : 'Select one or more (Shift+click) tiles in the tile paint panel, then click or drag to paint.'}
          </p>
          <div
            id='location-editor-grid'
            className='inline-grid w-fit border bg-muted-foreground/20'
            style={{
              gridTemplateColumns: `repeat(${gridWidth}, ${tileRenderSize}px)`,
              gridTemplateRows: `repeat(${gridHeight}, ${tileRenderSize}px)`,
              ...mapImageStyle,
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
                      mapImageUrl ? 'bg-muted/20' : 'border border-border bg-muted'
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

        <Collapsible
          open={panelOpen}
          onOpenChange={setPanelOpen}
          className='flex shrink-0 flex-col border-t bg-muted/30'>
          <Tabs defaultValue='tilemap' className='flex min-h-0 flex-1 flex-col'>
            <div className='flex items-center justify-between gap-2 px-4 py-2'>
              <TabsList className='w-full max-w-sm'>
                <TabsTrigger value='tilemap' className='flex-1'>
                  Tilemap
                </TabsTrigger>
                <TabsTrigger value='image' className='flex-1'>
                  Image
                </TabsTrigger>
                <TabsTrigger value='cell' className='flex-1'>
                  Cell
                </TabsTrigger>
              </TabsList>
              <CollapsibleTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 shrink-0'
                  aria-label={panelOpen ? 'Collapse panel' : 'Expand panel'}>
                  {panelOpen ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronUp className='h-4 w-4' />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent asChild>
              <div className='max-h-[45dvh] overflow-auto px-4 pb-3'>
                <TabsContent value='tilemap' className='mt-2'>
                  <TilePaintBar
                    worldId={worldId!}
                    selectedTiles={selectedTiles}
                    onSelectedTilesChange={setSelectedTiles}
                    mapImage={mapImageUrl}
                    onMapImageUpload={(id) => loc && updateLocation(loc.id, { mapAssetId: id })}
                    onMapImageRemove={() =>
                      loc &&
                      updateLocation(loc.id, {
                        mapAssetId: null,
                        hasMap: false,
                        mapAsset: null,
                      })
                    }
                    mode='tilemap'
                  />
                </TabsContent>
                <TabsContent value='image' className='mt-2'>
                  <TilePaintBar
                    worldId={worldId!}
                    selectedTiles={selectedTiles}
                    onSelectedTilesChange={setSelectedTiles}
                    mapImage={mapImageUrl}
                    onMapImageUpload={(id) => loc && updateLocation(loc.id, { mapAssetId: id })}
                    onMapImageRemove={() =>
                      loc &&
                      updateLocation(loc.id, {
                        mapAssetId: null,
                        hasMap: false,
                        mapAsset: null,
                      })
                    }
                    mode='image'
                  />
                </TabsContent>
                <TabsContent value='cell' className='mt-2'>
                  {selectedCell ? (
                    <CellPropertyPanel
                      cell={selectedCell}
                      layers={selectedCellLayers}
                      selectedTileData={selectedTileData}
                      onSelectLayer={setSelectedLayerId}
                      getTileStyle={getTileStyle}
                      actions={[]}
                      onUpdateTileData={handleUpdateTileData}
                      onRemoveTile={handleRemoveTileFromCell}
                      onAddBlankTile={handleAddBlankTileToCell}
                    />
                  ) : (
                    <p className='text-xs text-muted-foreground'>
                      Select a cell on the grid to edit its tiles and properties.
                    </p>
                  )}
                </TabsContent>
              </div>
            </CollapsibleContent>
          </Tabs>
        </Collapsible>
      </div>
    </div>
  );
}
