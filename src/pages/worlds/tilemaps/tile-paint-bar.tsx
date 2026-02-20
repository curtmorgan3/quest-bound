import { Button, Label } from '@/components';
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
  selectedTile: Tile | null;
  onSelectedTileChange: (tile: Tile | null) => void;
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
  selectedTile,
  onSelectedTileChange,
}: TilePaintBarProps) {
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
              onValueChange={(v) => setSelectedTilemapId(v === '_none' ? null : v)}>
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
                    <Label className='text-xs'>Tile</Label>
                    <div
                      className='inline-grid max-h-64 overflow-auto rounded border bg-muted/30 p-1'
                      style={{
                        gridTemplateColumns:
                          colCount > 0
                            ? `repeat(${colCount}, ${TILE_DISPLAY_SIZE}px)`
                            : undefined,
                        gridTemplateRows:
                          rowCount > 0
                            ? `repeat(${rowCount}, ${TILE_DISPLAY_SIZE}px)`
                            : undefined,
                      }}>
                      {rowIndices.map((y) =>
                        colIndices.map((x) => {
                          const tile = tilesByCoord.get(`${x},${y}`);
                          return (
                            <button
                              key={tile ? tile.id : `empty-${x}-${y}`}
                              type='button'
                              className={`h-8 w-8 shrink-0 rounded border bg-muted ${
                                selectedTile?.id === tile?.id && tile?.id !== undefined
                                  ? 'ring-2 ring-primary'
                                  : ''
                              }`}
                              style={
                                tile && tm
                                  ? getPickerTileStyle(tm, tile, getAssetData, assetDimensions)
                                  : undefined
                              }
                              onClick={() =>
                                onSelectedTileChange(
                                  tile
                                    ? selectedTile?.id === tile.id
                                      ? null
                                      : tile
                                    : selectedTile,
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
                          if (t) onSelectedTileChange(t);
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
