import { Button, Checkbox, Input, Label } from '@/components';
import { Slider } from '@/components/ui/slider';
import { ImageUpload } from '@/components/composites/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Location } from '@/types';
import { MapPinned, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WorldEditorLocationMove } from './world-editor-location-move';

const BACKGROUND_SIZE_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'auto', label: 'Auto' },
  { value: '100% 100%', label: 'Fill (stretch)' },
];

const BACKGROUND_POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top left', label: 'Top left' },
  { value: 'top right', label: 'Top right' },
  { value: 'bottom left', label: 'Bottom left' },
  { value: 'bottom right', label: 'Bottom right' },
];

export interface WorldEditorLocationPanelProps {
  location: Location;
  /** Sibling locations (same parent as this location); used for "move as child of" */
  siblingLocations: Location[];
  hasMap: boolean;
  rulesetId: string | null;
  getAssetData: (assetId: string) => string | null;
  onAddGrid: () => void;
  onRemoveGrid: () => void;
  onOpenInLocationEditor: () => void;
  onUpdateLocation: (data: Partial<Location>) => void;
  /** Move this location to be a child of the given sibling. */
  onMoveAsChildOf: (siblingId: string) => void;
  /** Move this location to be a sibling of its parent (one level up). Omit or undefined when already at root. */
  onMoveAsSiblingOfParent?: () => void;
}

export function WorldEditorLocationPanel({
  location,
  siblingLocations,
  hasMap,
  rulesetId,
  getAssetData,
  onAddGrid,
  onRemoveGrid,
  onOpenInLocationEditor,
  onUpdateLocation,
  onMoveAsChildOf,
  onMoveAsSiblingOfParent,
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
    <div
      className='flex w-56 shrink-0 flex-col gap-3 border-l bg-muted/30 p-3 overflow-auto'
      style={{ height: 'calc(100vh - 50px)' }}>
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
        <Label className='text-xs'>Background image</Label>
        <ImageUpload
          image={
            location.backgroundImage ??
            (location.backgroundAssetId ? getAssetData(location.backgroundAssetId) : null)
          }
          alt='Background'
          onUpload={(id) => onUpdateLocation({ backgroundAssetId: id })}
          onRemove={() => onUpdateLocation({ backgroundAssetId: null })}
          rulesetId={rulesetId ?? undefined}
        />
      </div>
      {location.backgroundImage && (
        <>
          <div className='grid gap-1'>
            <Label className='text-xs'>Background size</Label>
            <Select
              value={location.backgroundSize ?? 'cover'}
              onValueChange={(v) => onUpdateLocation({ backgroundSize: v })}>
              <SelectTrigger className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BACKGROUND_SIZE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='grid gap-1'>
            <Label className='text-xs'>Background position</Label>
            <Select
              value={location.backgroundPosition ?? 'center'}
              onValueChange={(v) => onUpdateLocation({ backgroundPosition: v })}>
              <SelectTrigger className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BACKGROUND_POSITION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
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
        <Label className='text-xs'>Opacity (0–1)</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[Math.round((location.opacity ?? 1) * 100)]}
          onValueChange={(v) =>
            onUpdateLocation({ opacity: Math.max(0, Math.min(1, (v[0] ?? 0) / 100)) })
          }
        />
      </div>
      {/* <div className='grid gap-1'>
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
      </div> */}

      <WorldEditorLocationMove
        siblingLocations={siblingLocations}
        onMoveAsChildOf={onMoveAsChildOf}
        onMoveAsSiblingOfParent={onMoveAsSiblingOfParent}
      />
      <div className='flex flex-col gap-2'>
        {!hasMap ? (
          <Button variant='outline' size='sm' className='gap-1' onClick={onAddGrid}>
            <MapPinned className='h-4 w-4' />
            Add Map
          </Button>
        ) : (
          <>
            <Button variant='outline' size='sm' className='gap-1' onClick={onOpenInLocationEditor}>
              <MapPinned className='h-4 w-4' />
              Edit Map
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1 text-muted-foreground hover:text-muted-foreground'
              onClick={onRemoveGrid}>
              <Minus className='h-4 w-4' />
              Remove Map
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
