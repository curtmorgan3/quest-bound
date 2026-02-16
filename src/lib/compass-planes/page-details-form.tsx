import { RulesetColorPicker } from '@/components';
import { ImageUpload } from '@/components/composites/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useId } from 'react';

export interface PageDetailsValue {
  label: string;
  image?: string | null;
  backgroundColor?: string;
  backgroundOpacity?: number;
}

export interface PageDetailsUpdate {
  label?: string;
  assetId?: string;
  assetUrl?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
}

interface PageDetailsFormProps {
  value: PageDetailsValue;
  onUpdate: (data: PageDetailsUpdate) => void;
  /** For ImageUpload asset creation. Omit for character pages. */
  rulesetId?: string;
  /** Whether to show the name/label field. Default true. */
  showLabel?: boolean;
}

export function PageDetailsForm({
  value,
  onUpdate,
  rulesetId,
  showLabel = true,
}: PageDetailsFormProps) {
  const opacityPct = Math.round((value.backgroundOpacity ?? 1) * 100);
  const opacityId = useId();

  return (
    <div className='flex flex-col gap-4'>
      {showLabel && (
        <div className='flex flex-col gap-2'>
          <Label htmlFor='page-details-label'>Name</Label>
          <Input
            id='page-details-label'
            value={value.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className='bg-[#333] border-[#555] text-white'
          />
        </div>
      )}
      <div className='w-full flex justify-between'>
        <div className='flex flex-col gap-2'>
          <Label>Background image</Label>
          <ImageUpload
            image={value.image ?? undefined}
            alt='Page background'
            rulesetId={rulesetId}
            onUpload={(assetId) => onUpdate({ assetId, assetUrl: undefined })}
            onSetUrl={(url) => onUpdate({ assetUrl: url, assetId: undefined })}
            onRemove={() => onUpdate({ assetId: undefined, assetUrl: undefined })}
          />
        </div>

        <RulesetColorPicker
          label='Background Color'
          color={value.backgroundColor}
          onUpdate={(color) =>
            onUpdate({ backgroundColor: `rgba(${color.r}, ${color.g}, ${color.g}, ${color.a})` })
          }
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor={opacityId}>Background opacity ({opacityPct}%)</Label>
        <div className='flex items-center gap-2'>
          <input
            id={opacityId}
            type='range'
            min={0}
            max={100}
            value={opacityPct}
            onChange={(e) => onUpdate({ backgroundOpacity: Number(e.target.value) / 100 })}
            className='flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-[#333] accent-[#555]'
          />
          <Input
            type='number'
            min={0}
            max={100}
            className='w-16 bg-[#333] border-[#555] text-white text-sm h-8'
            value={opacityPct}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) {
                const clamped = Math.min(100, Math.max(0, n));
                onUpdate({ backgroundOpacity: clamped / 100 });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
