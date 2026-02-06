import { useAssets } from '@/lib/compass-api';
import { getComponentData, getComponentStyles } from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ImageComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditImageNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const { assets } = useAssets();

  const id = useNodeId();

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as ImageComponentData;
  const css = getComponentStyles(component);
  const asset = assets.find((a) => a.id === data.assetId);

  const imageSrc = asset?.data ?? data.assetUrl;

  return (
    <ResizableNode component={component}>
      <div
        style={{
          height: `${component.height}px`,
          width: `${component.width}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...css,
          backgroundColor: imageSrc ? 'transparent' : css.backgroundColor,
        }}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=''
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: css.borderRadius,
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
              overflow: 'hidden',
            }}>
            No image set
          </div>
        )}
      </div>
    </ResizableNode>
  );
};

export const ViewImageNode = ({ component }: { component: Component }) => {
  const css = getComponentStyles(component);
  const data = getComponentData(component) as ImageComponentData;
  const { assets } = useAssets();
  const characterContext = useContext(CharacterContext);

  const asset = assets.find((a) => a.id === data.assetId);
  const componentImageSrc = asset?.data ?? data.assetUrl;

  const imageSrc =
    data.useCharacterImage && characterContext?.character?.image
      ? characterContext.character.image
      : componentImageSrc;

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt=''
      draggable={false}
      style={{
        height: `${component.height}px`,
        width: `${component.width}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'cover',
        ...css,
        backgroundColor: imageSrc ? 'transparent' : css.backgroundColor,
      }}
    />
  );
};
