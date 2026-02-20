import { Button, Checkbox, Label } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Action, TileData } from '@/types';
import { Trash2 } from 'lucide-react';

export interface CellPropertyPanelProps {
  cell: { x: number; y: number };
  tileData?: TileData | null;
  actions: Action[];
  onUpdateTileData: (updates: Partial<TileData>) => void;
  onRemoveTile: () => void;
}

export function CellPropertyPanel({
  cell,
  tileData,
  actions,
  onUpdateTileData,
  onRemoveTile,
}: CellPropertyPanelProps) {
  const idPrefix = `cell-${cell.x}-${cell.y}`;

  return (
    <div className='flex w-56 shrink-0 flex-col gap-3 rounded-md border bg-muted/30 p-3'>
      <h3 className='text-sm font-semibold'>
        Cell ({cell.x}, {cell.y})
      </h3>
      {tileData ? (
        <>
          <div className='flex items-center gap-2'>
            <Checkbox
              id={`${idPrefix}-passable`}
              checked={tileData.isPassable}
              onCheckedChange={(c) => onUpdateTileData({ isPassable: c === true })}
            />
            <Label htmlFor={`${idPrefix}-passable`} className='text-sm'>
              Passable
            </Label>
          </div>
          <div className='grid gap-1'>
            <Label className='text-xs'>Action</Label>
            <Select
              value={tileData.actionId ?? '_none'}
              onValueChange={(v) => onUpdateTileData({ actionId: v === '_none' ? undefined : v })}>
              <SelectTrigger className='h-8'>
                <SelectValue placeholder='None' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='_none'>None</SelectItem>
                {actions.map((a) => (
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
            onClick={onRemoveTile}>
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
  );
}
