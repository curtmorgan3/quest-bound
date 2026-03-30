import { useActiveRuleset, useAssets, useCustomProperties } from '@/lib/compass-api';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import {
  canvasDimensionToCss,
  useComponentCanvasDimensions,
} from '@/lib/compass-planes/canvas/editor-item-layout-context';
import {
  getBackgroundStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ImageComponentData } from '@/types';
import { memo, useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditImageNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const { assets } = useAssets();
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  const id = useEditorItemId();
  const component = getComponent(id);
  const css = useComponentStyles(component);

  if (!component) return null;

  const data = getComponentData(component) as ImageComponentData;
  const asset = assets.find((a) => a.id === data.assetId);

  let imageSrc: string | undefined;

  if (data.customPropertyId) {
    const cp = customProperties.find((p) => p.id === data.customPropertyId);
    if (cp && typeof cp.defaultValue === 'string') {
      imageSrc = cp.defaultValue;
    }
  }

  if (!imageSrc) {
    imageSrc = asset?.data ?? data.assetUrl;
  }

  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);

  return (
    <ResizableNode component={component}>
      <div
        style={{
          height: canvasDimensionToCss(ch),
          width: canvasDimensionToCss(cw),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...css,
          ...(imageSrc ? { backgroundColor: 'transparent' } : getBackgroundStyle(css)),
        }}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={data.altText ?? ''}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
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

const ViewImageNodeComponent = ({ component }: { component: Component }) => {
  const css = useComponentStyles(component);
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);
  const data = getComponentData(component) as ImageComponentData;
  const { assets } = useAssets();
  const characterContext = useContext(CharacterContext);
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  const asset = assets.find((a) => a.id === data.assetId);
  const componentImageSrc = asset?.data ?? data.assetUrl;

  const character = characterContext?.character ?? null;

  let imageSrc: string | undefined;

  if (data.customPropertyId) {
    const charValue = character?.customProperties?.[data.customPropertyId];
    if (typeof charValue === 'string') {
      imageSrc = charValue;
    } else {
      const cp = customProperties.find((p) => p.id === data.customPropertyId);
      if (cp && typeof cp.defaultValue === 'string') {
        imageSrc = cp.defaultValue;
      }
    }
  }

  if (!imageSrc && data.useCharacterImage && character?.image) {
    imageSrc = character.image;
  }

  if (!imageSrc) {
    imageSrc = componentImageSrc;
  }

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt={data.altText ?? ''}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      style={{
        height: canvasDimensionToCss(ch),
        width: canvasDimensionToCss(cw),
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'cover',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...css,
        ...(imageSrc ? { backgroundColor: 'transparent' } : getBackgroundStyle(css)),
      }}
    />
  );
};

export const ViewImageNode = memo(
  ViewImageNodeComponent,
  (prev, next) => prev.component === next.component,
);
