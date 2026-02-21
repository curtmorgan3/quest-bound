import { Button, Checkbox, Input, Label } from '@/components';
import { cn } from '@/lib/utils';
import type { Action, TileData } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';

export interface CellPropertyPanelProps {
  cell: { x: number; y: number };
  /** All tile layers at this cell (sorted by z-index). */
  layers: TileData[];
  /** The layer currently selected for editing (z-index, passable, action, remove). */
  selectedTileData?: TileData | null;
  /** Called when the user selects a different layer. */
  onSelectLayer: (tileDataId: string) => void;
  /** Returns background style for a tile thumbnail. */
  getTileStyle: (td: TileData) => CSSProperties;
  actions: Action[];
  onUpdateTileData: (updates: Partial<TileData>) => void;
  onRemoveTile: () => void;
  /** Called when the user clicks "Add Tile" to add a blank tile (no tilemap) at this cell. */
  onAddBlankTile?: () => void;
}

export function CellPropertyPanel({
  cell,
  layers,
  selectedTileData,
  onSelectLayer,
  getTileStyle,
  actions,
  onUpdateTileData,
  onRemoveTile,
  onAddBlankTile,
}: CellPropertyPanelProps) {
  const idPrefix = `cell-${cell.x}-${cell.y}`;

  return (
    <div className='flex w-56 shrink-0 flex-col gap-3 rounded-md border bg-muted/30 p-3'>
      <h3 className='text-sm font-semibold'>
        Cell ({cell.x}, {cell.y})
      </h3>
      {layers.length > 0 ? (
        <>
          <div className='grid gap-1'>
            <Label className='text-xs'>Layers</Label>
            <div className='flex flex-wrap gap-1'>
              {layers.map((td) => {
                const isSelected = selectedTileData?.id === td.id;
                const hasStyle = td.tileId != null;
                return (
                  <button
                    key={td.id}
                    type='button'
                    className={cn(
                      'h-8 w-8 shrink-0 overflow-hidden rounded border-2 bg-muted/50 transition-colors hover:bg-muted',
                      isSelected ? 'border-primary ring-1 ring-primary' : 'border-transparent',
                      !hasStyle && 'border-dashed',
                    )}
                    style={getTileStyle(td)}
                    onClick={() => onSelectLayer(td.id)}
                    title={hasStyle ? `Z-index: ${td.zIndex ?? 0}` : `Blank (Z-index: ${td.zIndex ?? 0})`}
                  />
                );
              })}
              {onAddBlankTile && (
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='h-8 w-8 shrink-0'
                  onClick={onAddBlankTile}
                  title='Add blank tile'>
                  <Plus className='h-4 w-4' />
                </Button>
              )}
            </div>
          </div>
          {selectedTileData && (
            <>
              <div className='grid gap-1'>
                <Label className='text-xs'>Z-index</Label>
                <Input
                  type='number'
                  value={selectedTileData.zIndex ?? 0}
                  onChange={(e) => onUpdateTileData({ zIndex: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className='flex items-center gap-2'>
                <Checkbox
                  id={`${idPrefix}-passable`}
                  checked={selectedTileData.isPassable}
                  onCheckedChange={(c) => onUpdateTileData({ isPassable: c === true })}
                />
                <Label htmlFor={`${idPrefix}-passable`} className='text-sm'>
                  Passable
                </Label>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='gap-1 text-destructive hover:text-destructive'
                onClick={onRemoveTile}>
                <Trash2 className='h-4 w-4' />
                {layers.length > 1 ? 'Remove this layer' : 'Remove tile'}
              </Button>
            </>
          )}
        </>
      ) : (
        <div className='flex flex-col gap-2'>
          <p className='text-xs text-muted-foreground'>
            No tile here. Select a tile and click to paint, or add a blank tile.
          </p>
          {onAddBlankTile && (
            <Button variant='outline' size='sm' className='gap-1' onClick={onAddBlankTile}>
              <Plus className='h-4 w-4' />
              Add Tile
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
