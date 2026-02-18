import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAssets, type ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { CheckboxComponentData, Component } from '@/types';
import { Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CheckboxDataEditProps {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const CheckboxDataEdit = ({
  components,
  handleUpdate,
  updateComponents,
}: CheckboxDataEditProps) => {
  const { createAsset, deleteAsset, assets } = useAssets();

  const checkedFileInputRef = useRef<HTMLInputElement>(null);
  const uncheckedFileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingChecked, setIsUploadingChecked] = useState(false);
  const [isUploadingUnchecked, setIsUploadingUnchecked] = useState(false);
  const [isRemovingChecked, setIsRemovingChecked] = useState(false);
  const [isRemovingUnchecked, setIsRemovingUnchecked] = useState(false);

  const [checkedUrlValue, setCheckedUrlValue] = useState('');
  const [uncheckedUrlValue, setUncheckedUrlValue] = useState('');

  // Filter out locked components
  const editableComponents = components.filter((c) => !c.locked);

  // Get data from the first component for display
  const firstComponentData = components[0]
    ? (getComponentData(components[0]) as CheckboxComponentData)
    : null;

  const currentCheckedAssetUrl = firstComponentData?.checkedAssetUrl || '';
  const currentUncheckedAssetUrl = firstComponentData?.uncheckedAssetUrl || '';

  // Sync URL values when components change
  useEffect(() => {
    setCheckedUrlValue(currentCheckedAssetUrl);
  }, [currentCheckedAssetUrl]);

  useEffect(() => {
    setUncheckedUrlValue(currentUncheckedAssetUrl);
  }, [currentUncheckedAssetUrl]);

  const handleCheckedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || editableComponents.length === 0) return;

    setIsUploadingChecked(true);
    try {
      const updates = await Promise.all(
        editableComponents.map(async (component) => {
          const assetId = await createAsset(file);
          return {
            id: component.id,
            data: updateComponentData(component.data, {
              checkedAssetId: assetId,
              checkedAssetUrl: undefined,
            }),
          };
        }),
      );

      await updateComponents(updates);
      fireExternalComponentChangeEvent({ updates });
    } catch (error) {
      console.error('Failed to upload checked image:', error);
    } finally {
      setIsUploadingChecked(false);
      if (checkedFileInputRef.current) {
        checkedFileInputRef.current.value = '';
      }
    }
  };

  const handleUncheckedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || editableComponents.length === 0) return;

    setIsUploadingUnchecked(true);
    try {
      const updates = await Promise.all(
        editableComponents.map(async (component) => {
          const assetId = await createAsset(file);
          return {
            id: component.id,
            data: updateComponentData(component.data, {
              uncheckedAssetId: assetId,
              uncheckedAssetUrl: undefined,
            }),
          };
        }),
      );

      await updateComponents(updates);
      fireExternalComponentChangeEvent({ updates });
    } catch (error) {
      console.error('Failed to upload unchecked image:', error);
    } finally {
      setIsUploadingUnchecked(false);
      if (uncheckedFileInputRef.current) {
        uncheckedFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCheckedAsset = async () => {
    if (editableComponents.length === 0) return;

    setIsRemovingChecked(true);
    try {
      const assetIdsToDelete = new Set<string>();
      editableComponents.forEach((component) => {
        const data = getComponentData(component) as CheckboxComponentData;
        if (data.checkedAssetId) {
          assetIdsToDelete.add(data.checkedAssetId);
        }
      });

      for (const assetId of assetIdsToDelete) {
        await deleteAsset(assetId);
      }

      const updates = editableComponents.map((component) => ({
        id: component.id,
        data: updateComponentData(component.data, {
          checkedAssetId: undefined,
          checkedAssetUrl: undefined,
        }),
      }));

      await updateComponents(updates);
      setCheckedUrlValue('');
      fireExternalComponentChangeEvent({ updates });
    } catch (error) {
      console.error('Failed to remove checked asset:', error);
    } finally {
      setIsRemovingChecked(false);
    }
  };

  const handleRemoveUncheckedAsset = async () => {
    if (editableComponents.length === 0) return;

    setIsRemovingUnchecked(true);
    try {
      const assetIdsToDelete = new Set<string>();
      editableComponents.forEach((component) => {
        const data = getComponentData(component) as CheckboxComponentData;
        if (data.uncheckedAssetId) {
          assetIdsToDelete.add(data.uncheckedAssetId);
        }
      });

      for (const assetId of assetIdsToDelete) {
        await deleteAsset(assetId);
      }

      const updates = editableComponents.map((component) => ({
        id: component.id,
        data: updateComponentData(component.data, {
          uncheckedAssetId: undefined,
          uncheckedAssetUrl: undefined,
        }),
      }));

      await updateComponents(updates);
      setUncheckedUrlValue('');
      fireExternalComponentChangeEvent({ updates });
    } catch (error) {
      console.error('Failed to remove unchecked asset:', error);
    } finally {
      setIsRemovingUnchecked(false);
    }
  };

  const handleCheckedUrlBlur = async () => {
    if (editableComponents.length === 0) return;

    const urlToSave = checkedUrlValue.trim() || undefined;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { checkedAssetUrl: urlToSave }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleUncheckedUrlBlur = async () => {
    if (editableComponents.length === 0) return;

    const urlToSave = uncheckedUrlValue.trim() || undefined;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { uncheckedAssetUrl: urlToSave }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  // Get current assets for preview
  const currentCheckedAssetId = firstComponentData?.checkedAssetId;
  const currentUncheckedAssetId = firstComponentData?.uncheckedAssetId;
  const checkedAsset = currentCheckedAssetId
    ? assets.find((a) => a.id === currentCheckedAssetId)
    : null;
  const uncheckedAsset = currentUncheckedAssetId
    ? assets.find((a) => a.id === currentUncheckedAssetId)
    : null;

  const hasCheckedAsset = editableComponents.some(
    (c) => (getComponentData(c) as CheckboxComponentData).checkedAssetId,
  );
  const hasUncheckedAsset = editableComponents.some(
    (c) => (getComponentData(c) as CheckboxComponentData).uncheckedAssetId,
  );

  const isDisabled = editableComponents.length === 0;

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      {/* Checked State Image */}
      <div className='flex flex-col gap-2'>
        <p className='text-sm'>Checked State Image</p>

        {(checkedAsset || checkedUrlValue) && (
          <div className='w-full mb-2 relative'>
            <img
              src={checkedAsset?.data ?? checkedUrlValue}
              alt='Checked state asset'
              className='w-full h-auto max-h-32 object-contain rounded'
            />
          </div>
        )}

        <div className='w-full flex flex-col gap-2'>
          <div className='flex flex-col gap-1'>
            <label className='text-xs text-muted-foreground'>Image URL</label>
            <Input
              type='url'
              placeholder='https://example.com/checked.png'
              value={checkedUrlValue}
              onChange={(e) => setCheckedUrlValue(e.target.value)}
              onBlur={handleCheckedUrlBlur}
              disabled={isDisabled || isUploadingChecked || isRemovingChecked}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          <Button
            onClick={() => checkedFileInputRef.current?.click()}
            disabled={isDisabled || isUploadingChecked || isRemovingChecked}
            variant='outline'
            className='w-full'>
            {isUploadingChecked ? 'Uploading...' : 'Set Checked Image'}
          </Button>

          {hasCheckedAsset && (
            <Button
              onClick={handleRemoveCheckedAsset}
              disabled={isDisabled || isUploadingChecked || isRemovingChecked}
              variant='outline'
              className='w-full flex items-center justify-center gap-2'>
              <Trash className='h-4 w-4' />
              {isRemovingChecked ? 'Removing...' : 'Remove Checked Asset'}
            </Button>
          )}
        </div>

        <input
          ref={checkedFileInputRef}
          type='file'
          accept='image/*'
          onChange={handleCheckedImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Unchecked State Image */}
      <div className='flex flex-col gap-2'>
        <p className='text-sm'>Unchecked State Image</p>

        {(uncheckedAsset || uncheckedUrlValue) && (
          <div className='w-full mb-2 relative'>
            <img
              src={uncheckedAsset?.data ?? uncheckedUrlValue}
              alt='Unchecked state asset'
              className='w-full h-auto max-h-32 object-contain rounded'
            />
          </div>
        )}

        <div className='w-full flex flex-col gap-2'>
          <div className='flex flex-col gap-1'>
            <label className='text-xs text-muted-foreground'>Image URL</label>
            <Input
              type='url'
              placeholder='https://example.com/unchecked.png'
              value={uncheckedUrlValue}
              onChange={(e) => setUncheckedUrlValue(e.target.value)}
              onBlur={handleUncheckedUrlBlur}
              disabled={isDisabled || isUploadingUnchecked || isRemovingUnchecked}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>

          <Button
            onClick={() => uncheckedFileInputRef.current?.click()}
            disabled={isDisabled || isUploadingUnchecked || isRemovingUnchecked}
            variant='outline'
            className='w-full'>
            {isUploadingUnchecked ? 'Uploading...' : 'Set Unchecked Image'}
          </Button>

          {hasUncheckedAsset && (
            <Button
              onClick={handleRemoveUncheckedAsset}
              disabled={isDisabled || isUploadingUnchecked || isRemovingUnchecked}
              variant='outline'
              className='w-full flex items-center justify-center gap-2'>
              <Trash className='h-4 w-4' />
              {isRemovingUnchecked ? 'Removing...' : 'Remove Unchecked Asset'}
            </Button>
          )}
        </div>

        <input
          ref={uncheckedFileInputRef}
          type='file'
          accept='image/*'
          onChange={handleUncheckedImageUpload}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};
