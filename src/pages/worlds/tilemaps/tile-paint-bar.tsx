import { Button } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTilemaps, useTiles } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Tile, Tilemap } from '@/types';
import { useMemo, useState } from 'react';

const TILE_DISPLAY_SIZE = 32;

export interface TilePaintBarProps {
  worldId: string;
  getAssetData: (assetId: string) => string | null;
  assetDimensions: Record<string, { w: number; h: number }>;
  selectedTiles: Tile[];
  onSelectedTilesChange: (tiles: Tile[]) => void;
}

function getPickerTileStyle(
  tm: Tilemap,
  t: Tile,
  getAssetData: (assetId: string) => string | null,
  assetDimensions: Record<string, { w: number; h: number }>,
): React.CSSProperties {
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
}

export function TilePaintBar({
  worldId,
  getAssetData,
  assetDimensions,
  selectedTiles,
  onSelectedTilesChange,
}: TilePaintBarProps) {
  const selectedIds = useMemo(() => new Set(selectedTiles.map((t) => t.id)), [selectedTiles]);

  const handleTileClick = (e: React.MouseEvent, tile: Tile | undefined) => {
    if (e.shiftKey) {
      if (!tile) return;
      if (selectedIds.has(tile.id)) {
        onSelectedTilesChange(selectedTiles.filter((t) => t.id !== tile.id));
      } else {
        onSelectedTilesChange([...selectedTiles, tile]);
      }
    } else {
      if (tile) {
        onSelectedTilesChange(selectedIds.has(tile.id) && selectedTiles.length === 1 ? [] : [tile]);
      } else {
        onSelectedTilesChange([]);
      }
    }
  };
  const { tilemaps } = useTilemaps(worldId);
  const [selectedTilemapId, setSelectedTilemapId] = useState<string | null>(null);
  const tilesResult = useTiles(selectedTilemapId ?? undefined);
  const tilesForPicker = tilesResult?.tiles ?? [];
  const tilemapsList = tilemaps ?? [];
  const rowIndices = useMemo(() => {
    const ys = new Set(tilesForPicker.map((t) => t.tileY ?? 0));
    return Array.from(ys).sort((a, b) => a - b);
  }, [tilesForPicker]);
  const colIndices = useMemo(() => {
    const xs = new Set(tilesForPicker.map((t) => t.tileX ?? 0));
    return Array.from(xs).sort((a, b) => a - b);
  }, [tilesForPicker]);

  return (
    <div className='flex shrink-0 max-h-[45dvh] overflow-auto flex-wrap items-start gap-4 border-t bg-muted/30 px-4 py-3'>
      {tilemapsList.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          No tilemaps. Create one from the world&apos;s Tilemaps page.
        </p>
      ) : (
        <>
          <div className='flex flex-col gap-2'>
            <h3 className='text-sm font-semibold'>Tile paint</h3>
            <Select
              value={selectedTilemapId ?? '_none'}
              onValueChange={(v) => {
                setSelectedTilemapId(v === '_none' ? null : v);
                if (v === '_none') onSelectedTilesChange([]);
              }}>
              <SelectTrigger className='h-8 w-40'>
                <SelectValue placeholder='Select tilemap' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='_none'>None</SelectItem>
                {tilemapsList.map((tm) => (
                  <SelectItem key={tm.id} value={tm.id}>
                    {tm.label || `${tm.tileWidth}×${tm.tileHeight}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedTilemapId &&
            (() => {
              const tm = tilemapsList.find((m) => m.id === selectedTilemapId);
              if (!tm) return null;
              const tilesByCoord = new Map(
                tilesForPicker.map((t) => [`${t.tileX ?? 0},${t.tileY ?? 0}`, t]),
              );
              const rowCount = rowIndices.length;
              const colCount = colIndices.length;
              return (
                <>
                  <div className='flex items-center gap-2'>
                    <div
                      className='inline-grid rounded border bg-muted/30 p-1'
                      style={{
                        gridTemplateColumns:
                          colCount > 0 ? `repeat(${colCount}, ${TILE_DISPLAY_SIZE}px)` : undefined,
                        gridTemplateRows:
                          rowCount > 0 ? `repeat(${rowCount}, ${TILE_DISPLAY_SIZE}px)` : undefined,
                      }}>
                      {rowIndices.map((y) =>
                        colIndices.map((x) => {
                          const tile = tilesByCoord.get(`${x},${y}`);
                          return (
                            <button
                              key={tile ? tile.id : `empty-${x}-${y}`}
                              type='button'
                              className={`h-8 w-8 shrink-0 rounded border bg-muted ${
                                tile && selectedIds.has(tile.id) ? 'ring-2 ring-primary' : ''
                              }`}
                              style={
                                tile && tm
                                  ? getPickerTileStyle(tm, tile, getAssetData, assetDimensions)
                                  : undefined
                              }
                              onClick={(e) => handleTileClick(e, tile)}
                              title={
                                tile
                                  ? `Tile ${x},${y} (Shift+click to multi-select)`
                                  : `(${x},${y})`
                              }
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
                          if (t) onSelectedTilesChange([t]);
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
  );
}
