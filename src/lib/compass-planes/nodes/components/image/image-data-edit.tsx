import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/composites';
import { useAssets, type ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, ImageComponentData } from '@/types';

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

  const handleUseCharacterImageChange = async (checked: boolean) => {
    if (editableComponents.length === 0) return;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { useCharacterImage: checked }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  return (
    <div className='flex flex-col w-full gap-3 pb-2 border-b border-border'>
      <p className='text-sm'>Image Asset</p>

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
          alt={firstComponentData?.assetId ? 'Component image' : ''}
          rulesetId={rulesetId ?? undefined}
          onUpload={handleUpload}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
};
