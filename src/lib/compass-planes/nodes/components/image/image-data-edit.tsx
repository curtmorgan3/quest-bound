import { Button, Input, Label } from '@/components';
import { ImageUpload } from '@/components/composites';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useActiveRuleset,
  useAssets,
  useCustomProperties,
  type ComponentUpdate,
} from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Component, ImageComponentData } from '@/types';
import { CustomPropertiesListModal } from '@/pages/ruleset/windows/component-edit-panel/custom-properties-list-modal';

interface ImageDataEditProps {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const ImageDataEdit = ({
  components,
  handleUpdate: _handleUpdate,
  updateComponents,
}: ImageDataEditProps) => {
  const firstComponent = components[0];
  const rulesetId = firstComponent?.rulesetId ?? null;
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);
  const { deleteAsset, assets } = useAssets(rulesetId);

  // Filter out locked components (handleUpdate does this too, but we need it for UI state)
  const editableComponents = components.filter((c) => !c.locked);

  const firstComponentData = firstComponent
    ? (getComponentData(firstComponent) as ImageComponentData)
    : null;
  const currentAssetId = firstComponentData?.assetId;
  const currentAsset = currentAssetId ? assets.find((a) => a.id === currentAssetId) : null;
  const currentImageUrl =
    currentAsset?.data && (currentAsset.type === 'url' || currentAsset.type.startsWith('image/'))
      ? currentAsset.data
      : undefined;

  const useCharacterImage = firstComponentData?.useCharacterImage ?? false;
  const customPropertyId = firstComponentData?.customPropertyId ?? '';

  const { altTextInputValue, altTextMixed } = useMemo(() => {
    if (editableComponents.length === 0) {
      return { altTextInputValue: '', altTextMixed: false };
    }
    const vals = editableComponents.map(
      (c) => (getComponentData(c) as ImageComponentData).altText ?? '',
    );
    const first = vals[0];
    const mixed = vals.some((v) => v !== first);
    return { altTextInputValue: mixed ? '' : first, altTextMixed: mixed };
  }, [editableComponents]);

  const handleCustomPropertyChange = async (value: string) => {
    if (components.length === 0) return;
    const nextValue = value === '__none__' ? undefined : value;
    const updates = components.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { customPropertyId: nextValue }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleUpload = async (assetId: string) => {
    if (editableComponents.length === 0) return;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { assetId }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleRemove = async () => {
    if (editableComponents.length === 0) return;

    const assetIdsToDelete = new Set<string>();
    editableComponents.forEach((component) => {
      const data = getComponentData(component) as ImageComponentData;
      if (data.assetId) assetIdsToDelete.add(data.assetId);
    });

    for (const assetId of assetIdsToDelete) {
      await deleteAsset(assetId);
    }

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { assetId: undefined }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleAltTextChange = async (value: string) => {
    if (editableComponents.length === 0) return;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, {
        altText: value.length > 0 ? value : undefined,
      }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleUseCharacterImageChange = async (checked: boolean) => {
    if (editableComponents.length === 0) return;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { useCharacterImage: checked }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const selectedCustomProp = customProperties.find((p) => p.id === customPropertyId);

  useEffect(() => {
    if (customPropertyId && customProperties.length > 0 && !selectedCustomProp) {
      void handleCustomPropertyChange('__none__');
    }
  }, [customPropertyId, customProperties.length, selectedCustomProp]);

  return (
    <div className='flex flex-col w-full gap-3 pb-2 border-b border-border'>
      <p className='text-sm'>Image Asset</p>

      <div className='flex flex-col gap-1'>
        <Label className='text-xs text-muted-foreground'>
          Character custom property (optional)
        </Label>
        {customPropertyId ? (
          <div className='flex h-[20px] items-center gap-1 rounded-[4px] border border-border bg-muted/50 px-1.5'>
            <span
              className='min-w-0 flex-1 truncate text-xs'
              title={selectedCustomProp?.label ?? 'unknown'}>
              {selectedCustomProp?.label ?? 'unknown'}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-4 shrink-0 rounded'
              aria-label='Remove custom property'
              onClick={() => handleCustomPropertyChange('__none__')}>
              <X className='size-3' />
            </Button>
          </div>
        ) : (
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='h-6 w-6 rounded'
            aria-label='Assign custom property'
            disabled={components.length === 0 || customProperties.length === 0}
            onClick={() => setModalOpen(true)}>
            <SlidersHorizontal className='h-3.5 w-3.5' />
          </Button>
        )}
        <CustomPropertiesListModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSelect={(id) => {
            void handleCustomPropertyChange(id);
            setModalOpen(false);
          }}
        />
      </div>

      <div className='flex items-center gap-2'>
        <Checkbox
          id='use-character-image'
          checked={useCharacterImage}
          onCheckedChange={(checked) => handleUseCharacterImageChange(checked === true)}
          disabled={editableComponents.length === 0}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <label
          htmlFor='use-character-image'
          className='text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Use character image in view mode
        </label>
      </div>
      {useCharacterImage && (
        <p className='text-xs text-muted-foreground'>
          When enabled, the character&apos;s image is shown in view mode; the image below is used as
          fallback when no character image is set.
        </p>
      )}

      <div className='flex flex-col gap-2'>
        <ImageUpload
          image={currentImageUrl}
          alt={
            firstComponentData?.altText?.trim() ||
            (firstComponentData?.assetId ? 'Component image' : '')
          }
          rulesetId={rulesetId ?? undefined}
          onUpload={handleUpload}
          onRemove={handleRemove}
        />
        <div className='flex flex-col gap-1'>
          <Label htmlFor='image-alt-text' className='text-xs text-muted-foreground'>
            Alt text
          </Label>
          <Input
            id='image-alt-text'
            className='h-8 rounded-[4px]'
            value={altTextInputValue}
            placeholder={altTextMixed ? 'Mixed values…' : 'Describe the image for accessibility'}
            onChange={(e) => void handleAltTextChange(e.target.value)}
            disabled={editableComponents.length === 0}
          />
        </div>
      </div>
    </div>
  );
};
