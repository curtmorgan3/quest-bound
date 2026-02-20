import { Button, Checkbox, Input, Label } from '@/components';
import type { Location } from '@/types';
import { Grid3X3, MapPinned, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface WorldEditorLocationPanelProps {
  location: Location;
  hasGrid: boolean;
  onAddGrid: () => void;
  onRemoveGrid: () => void;
  onOpenInLocationEditor: () => void;
  onUpdateLocation: (data: Partial<Location>) => void;
}

export function WorldEditorLocationPanel({
  location,
  hasGrid,
  onAddGrid,
  onRemoveGrid,
  onOpenInLocationEditor,
  onUpdateLocation,
}: WorldEditorLocationPanelProps) {
  const [labelInput, setLabelInput] = useState(location.label);

  useEffect(() => {
    setLabelInput(location.label);
  }, [location.id, location.label]);

  const handleLabelBlur = () => {
    const next = labelInput.trim() || location.label;
    setLabelInput(next);
    if (next !== location.label) onUpdateLocation({ label: next });
  };

  const idPrefix = `loc-panel-${location.id}`;

  return (
    <div className='flex w-56 shrink-0 flex-col gap-3 border-l bg-muted/30 p-3'>
      <h3 className='text-sm font-semibold'>Location</h3>
      <div className='grid gap-1'>
        <Label htmlFor={`${idPrefix}-zindex`} className='text-xs'>
          Layer
        </Label>
        <Input
          id={`${idPrefix}-zindex`}
          type='number'
          value={location.nodeZIndex ?? 0}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onUpdateLocation({ nodeZIndex: v });
          }}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onUpdateLocation({ nodeZIndex: v });
          }}
          className='h-8'
        />
      </div>
      <div className='grid gap-1'>
        <Label htmlFor={`${idPrefix}-label`} className='text-xs'>
          Label
        </Label>
        <Input
          id={`${idPrefix}-label`}
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onBlur={handleLabelBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleLabelBlur()}
          className='h-8'
        />
      </div>
      <div className='flex items-center gap-2'>
        <Checkbox
          id={`${idPrefix}-label-visible`}
          checked={location.labelVisible !== false}
          onCheckedChange={(c) => onUpdateLocation({ labelVisible: c === true })}
        />
        <Label htmlFor={`${idPrefix}-label-visible`} className='text-xs'>
          Show label
        </Label>
      </div>
      <div className='grid gap-1'>
        <Label htmlFor={`${idPrefix}-bg`} className='text-xs'>
          Background color
        </Label>
        <Input
          id={`${idPrefix}-bg`}
          type='color'
          value={location.backgroundColor ?? '#e5e7eb'}
          onChange={(e) => onUpdateLocation({ backgroundColor: e.target.value || null })}
          className='h-8 w-full cursor-pointer p-1'
        />
      </div>
      <div className='grid gap-1'>
        <Label htmlFor={`${idPrefix}-opacity`} className='text-xs'>
          Opacity (0–1)
        </Label>
        <Input
          id={`${idPrefix}-opacity`}
          type='number'
          min={0}
          max={1}
          step={0.1}
          value={location.opacity ?? 1}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onUpdateLocation({ opacity: Math.max(0, Math.min(1, v)) });
          }}
          onBlur={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onUpdateLocation({ opacity: Math.max(0, Math.min(1, v)) });
          }}
          className='h-8'
        />
      </div>
      <div className='grid gap-1'>
        <Label htmlFor={`${idPrefix}-sides`} className='text-xs'>
          Sides
        </Label>
        <Input
          id={`${idPrefix}-sides`}
          type='number'
          min={3}
          max={12}
          value={location.sides ?? 4}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onUpdateLocation({ sides: Math.max(3, Math.min(12, v)) });
          }}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onUpdateLocation({ sides: Math.max(3, Math.min(12, v)) });
          }}
          className='h-8'
        />
      </div>
      <div className='flex flex-col gap-2'>
        {!hasGrid ? (
          <Button variant='outline' size='sm' className='gap-1' onClick={onAddGrid}>
            <Grid3X3 className='h-4 w-4' />
            Add grid
          </Button>
        ) : (
          <>
            <Button variant='outline' size='sm' className='gap-1' onClick={onOpenInLocationEditor}>
              <MapPinned className='h-4 w-4' />
              Open in location editor
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1 text-muted-foreground hover:text-muted-foreground'
              onClick={onRemoveGrid}>
              <Minus className='h-4 w-4' />
              Remove grid
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
