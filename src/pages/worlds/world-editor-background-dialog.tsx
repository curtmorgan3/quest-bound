import { Input, Label } from '@/components';
import { ImageUpload } from '@/components/composites/image-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Location, World } from '@/types';

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

export interface WorldEditorBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isWorldLevel: boolean;
  world: World | null;
  currentLocation: Location | null;
  worldId: string | undefined;
  rulesetId: string | null;
  getAssetData: (assetId: string) => string | null;
  onUpdateWorld: (id: string, data: Partial<World>) => void;
  onUpdateLocation: (id: string, data: Partial<Location>) => void;
}

export function WorldEditorBackgroundDialog({
  open,
  onOpenChange,
  isWorldLevel,
  world,
  currentLocation,
  worldId,
  rulesetId,
  getAssetData,
  onUpdateWorld,
  onUpdateLocation,
}: WorldEditorBackgroundDialogProps) {
  const editingWorld = isWorldLevel && world && worldId;
  const editingLocation = !isWorldLevel && currentLocation;

  const backgroundAssetId = editingWorld
    ? world.backgroundAssetId ?? null
    : editingLocation
      ? currentLocation.backgroundAssetId ?? null
      : null;
  const backgroundOpacity = editingWorld
    ? (world.backgroundOpacity ?? 1)
    : editingLocation
      ? (currentLocation.backgroundOpacity ?? 1)
      : 1;
  const backgroundSize = editingWorld
    ? (world.backgroundSize ?? 'cover')
    : editingLocation
      ? (currentLocation.backgroundSize ?? 'cover')
      : 'cover';
  const backgroundPosition = editingWorld
    ? (world.backgroundPosition ?? 'center')
    : editingLocation
      ? (currentLocation.backgroundPosition ?? 'center')
      : 'center';

  const setBackgroundAssetId = (assetId: string | null) => {
    if (editingWorld) onUpdateWorld(worldId!, { backgroundAssetId: assetId });
    if (editingLocation) onUpdateLocation(currentLocation!.id, { backgroundAssetId: assetId });
  };
  const setBackgroundOpacity = (v: number) => {
    if (editingWorld) onUpdateWorld(worldId!, { backgroundOpacity: v });
    if (editingLocation) onUpdateLocation(currentLocation!.id, { backgroundOpacity: v });
  };
  const setBackgroundSize = (v: string) => {
    if (editingWorld) onUpdateWorld(worldId!, { backgroundSize: v });
    if (editingLocation) onUpdateLocation(currentLocation!.id, { backgroundSize: v });
  };
  const setBackgroundPosition = (v: string) => {
    if (editingWorld) onUpdateWorld(worldId!, { backgroundPosition: v });
    if (editingLocation) onUpdateLocation(currentLocation!.id, { backgroundPosition: v });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {editingWorld ? 'World background' : 'Location background'}
          </DialogTitle>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>Background image</Label>
            <ImageUpload
              image={
                (editingWorld ? world?.backgroundImage : currentLocation?.backgroundImage) ??
                (backgroundAssetId ? getAssetData(backgroundAssetId) : null)
              }
              alt='Background'
              onUpload={(id) => setBackgroundAssetId(id)}
              onRemove={() => setBackgroundAssetId(null)}
              rulesetId={rulesetId ?? undefined}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='bg-opacity'>Background opacity (0–1)</Label>
            <Input
              id='bg-opacity'
              type='number'
              min={0}
              max={1}
              step={0.1}
              value={backgroundOpacity}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) setBackgroundOpacity(Math.max(0, Math.min(1, v)));
              }}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v)) setBackgroundOpacity(Math.max(0, Math.min(1, v)));
              }}
            />
          </div>
          <div className='grid gap-2'>
            <Label>Background size</Label>
            <Select value={backgroundSize} onValueChange={setBackgroundSize}>
              <SelectTrigger>
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
          <div className='grid gap-2'>
            <Label>Background position</Label>
            <Select value={backgroundPosition} onValueChange={setBackgroundPosition}>
              <SelectTrigger>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
