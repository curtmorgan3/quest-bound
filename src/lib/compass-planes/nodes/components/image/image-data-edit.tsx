import { Button } from '@/components/ui/button';
import { useAssets, type ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  getComponentStyles,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, ImageComponentData } from '@/types';
import { Trash } from 'lucide-react';
import { useRef, useState } from 'react';

interface ImageDataEditProps {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const ImageDataEdit = ({
  components,
  handleUpdate,
  updateComponents,
}: ImageDataEditProps) => {
  const { createAsset, deleteAsset, assets } = useAssets();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Filter out locked components (handleUpdate does this too, but we need it for UI state)
  const editableComponents = components.filter((c) => !c.locked);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || editableComponents.length === 0) return;

    setIsUploading(true);
    try {
      // Create a separate asset for each component
      const updates = await Promise.all(
        editableComponents.map(async (component) => {
          const assetId = await createAsset(file);
          return {
            id: component.id,
            data: updateComponentData(component.data, { assetId }),
          };
        }),
      );

      // Update components with their respective assetIds
      await updateComponents(updates);

      // Fire external change event for synchronization
      fireExternalComponentChangeEvent({
        updates,
      });
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (editableComponents.length > 0 && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveAsset = async () => {
    if (editableComponents.length === 0) return;

    setIsRemoving(true);
    try {
      // Collect all unique assetIds from editable components
      const assetIdsToDelete = new Set<string>();
      editableComponents.forEach((component) => {
        const data = getComponentData(component) as ImageComponentData;

        if (data.assetId) {
          assetIdsToDelete.add(data.assetId);
        }
      });

      // Delete all assets
      for (const assetId of assetIdsToDelete) {
        await deleteAsset(assetId);
      }

      // Create updates for all editable components
      const updates = editableComponents.map((component) => ({
        id: component.id,
        data: updateComponentData(component.data, { assetId: undefined }),
      }));

      // Update components through handleUpdate (it will filter locked components)
      handleUpdate('assetId', null);

      // Fire external change event for synchronization
      fireExternalComponentChangeEvent({
        updates,
      });
    } catch (error) {
      console.error('Failed to remove asset:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  // Show the first component's asset as preview
  const currentAssetId = (getComponentStyles(components[0]) as ImageComponentData)?.assetId;
  const currentAsset = currentAssetId ? assets.find((a) => a.id === currentAssetId) : null;
  const hasAsset = editableComponents.some(
    (c) => (getComponentData(c) as ImageComponentData).assetId,
  );

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Image Asset</p>

      {currentAsset && (
        <div className='w-full mb-2 relative'>
          <img
            src={currentAsset.data}
            alt='Current asset'
            className='w-full h-auto max-h-32 object-contain rounded'
          />
        </div>
      )}

      <div className='w-full flex flex-col gap-2'>
        <Button
          onClick={handleButtonClick}
          disabled={editableComponents.length === 0 || isUploading || isRemoving}
          variant='outline'
          className='w-full'>
          {isUploading ? 'Uploading...' : 'Set Image Asset'}
        </Button>

        {hasAsset && (
          <Button
            onClick={handleRemoveAsset}
            disabled={editableComponents.length === 0 || isUploading || isRemoving}
            variant='outline'
            className='w-full flex items-center justify-center gap-2'>
            <Trash className='h-4 w-4' />
            {isRemoving ? 'Removing...' : 'Remove Asset'}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};
