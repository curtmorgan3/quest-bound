import { Button, Input, Label } from '@/components';
import type { Location } from '@/types';
import { Grid3X3, MapPinned } from 'lucide-react';
import { useState } from 'react';

export interface WorldEditorLocationPanelProps {
  location: Location;
  hasGrid: boolean;
  onAddGrid: () => void;
  onOpenInLocationEditor: () => void;
  onUpdateLabel: (label: string) => void;
}

export function WorldEditorLocationPanel({
  location,
  hasGrid,
  onAddGrid,
  onOpenInLocationEditor,
  onUpdateLabel,
}: WorldEditorLocationPanelProps) {
  const [labelInput, setLabelInput] = useState(location.label);

  const handleBlur = () => {
    const next = labelInput.trim() || location.label;
    setLabelInput(next);
    if (next !== location.label) onUpdateLabel(next);
  };

  return (
    <div className='flex w-56 shrink-0 flex-col gap-3 border-l bg-muted/30 p-3'>
      <h3 className='text-sm font-semibold'>Location</h3>
      <div className='grid gap-1'>
        <Label htmlFor='location-label' className='text-xs'>
          Label
        </Label>
        <Input
          id='location-label'
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
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
          </>
        )}
      </div>
    </div>
  );
}
