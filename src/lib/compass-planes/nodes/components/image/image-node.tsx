import { useAssets } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  getComponentStyles,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, ImageComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

export const EditImageNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const { createAsset, assets } = useAssets();

  const id = useNodeId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as ImageComponentData;
  const css = getComponentStyles(component);
  const asset = assets.find((a) => a.id === component.assetId);

  const imageSrc = asset?.data || component.image;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const assetId = await createAsset(file);
      const update = {
        id,
        assetId,
        data: JSON.stringify(data),
      };

      updateComponent(id, update);
      fireExternalComponentChangeEvent({
        updates: [update],
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

  const handleClick = () => {
    if (!component.locked && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <ResizableNode component={component}>
      <div
        onClick={handleClick}
        style={{
          height: `${component.height}px`,
          width: `${component.width}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: component.locked ? 'default' : 'pointer',
          ...css,
        }}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=''
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              border: '2px dashed #ccc',
              color: '#999',
              fontSize: '12px',
              textAlign: 'center',
              padding: '8px',
            }}>
            {isUploading ? 'Uploading...' : 'Click to upload image'}
          </div>
        )}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>
    </ResizableNode>
  );
};

export const ViewImageNode = ({ component }: { component: Component }) => {
  const css = getComponentStyles(component);
  const { assets } = useAssets();

  const asset = assets.find((a) => a.id === component.assetId);

  const imageSrc = asset?.data || component.image;

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt=''
      style={{
        height: `${component.height}px`,
        width: `${component.width}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        ...css,
      }}
    />
  );
};
