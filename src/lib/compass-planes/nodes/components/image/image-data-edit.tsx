import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAssets, type ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, ImageComponentData } from '@/types';
import { Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function filenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    if (seg) return seg;
  } catch {
    // ignore
  }
  return `url-image-${crypto.randomUUID().slice(0, 8)}`;
}

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
  const firstComponent = components[0];
  const rulesetId = firstComponent?.rulesetId ?? null;
  const { createAsset, createUrlAsset, deleteAsset, assets } = useAssets(rulesetId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [urlValue, setUrlValue] = useState('');

  // Filter out locked components (handleUpdate does this too, but we need it for UI state)
  const editableComponents = components.filter((c) => !c.locked);

  const firstComponentData = firstComponent
    ? (getComponentData(firstComponent) as ImageComponentData)
    : null;
  const currentAssetId = firstComponentData?.assetId;
  const currentAsset = currentAssetId ? assets.find((a) => a.id === currentAssetId) : null;
  const currentUrlDisplay =
    currentAsset?.data && typeof currentAsset.data === 'string' && /^https?:\/\//i.test(currentAsset.data)
      ? currentAsset.data
      : '';

  // Sync URL value when components change (for URL-backed assets)
  useEffect(() => {
    setUrlValue(currentUrlDisplay);
  }, [currentUrlDisplay]);

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

      // Update components
      await updateComponents(updates);

      // Clear URL input
      setUrlValue('');

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

  const handleUrlBlur = async () => {
    if (editableComponents.length === 0) return;

    const urlToSave = urlValue.trim();
    if (!urlToSave) return;

    setIsUploading(true);
    try {
      const filename = filenameFromUrl(urlToSave);
      const assetId = await createUrlAsset(urlToSave, {
        filename,
        rulesetId,
        worldId: null,
      });
      const updates = editableComponents.map((component) => ({
        id: component.id,
        data: updateComponentData(component.data, { assetId }),
      }));
      await updateComponents(updates);
      fireExternalComponentChangeEvent({ updates });
    } catch (error) {
      console.error('Failed to add URL image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // currentAssetId, currentAsset already defined above for URL display
  const hasAsset = editableComponents.some(
    (c) => (getComponentData(c) as ImageComponentData).assetId,
  );
  const useCharacterImage = firstComponentData?.useCharacterImage ?? false;

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
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
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
        <div className='flex flex-col gap-1'>
          <label className='text-xs text-muted-foreground'>Image URL</label>
          <Input
            type='url'
            placeholder='https://example.com/image.jpg'
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onBlur={handleUrlBlur}
            disabled={editableComponents.length === 0 || isUploading || isRemoving}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        <Button
          onClick={handleButtonClick}
          disabled={editableComponents.length === 0 || isUploading || isRemoving}
          variant='outline'
          className='w-full'>
          {isUploading ? 'Uploading...' : 'Set Image'}
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
