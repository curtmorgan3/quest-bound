import {
  useActiveRuleset,
  useAssets,
  useCharacter,
  useCustomProperties,
} from '@/lib/compass-api';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import {
  canvasDimensionToCss,
  useComponentCanvasDimensions,
} from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { editorNodeComponentVisualEqual } from '@/lib/compass-planes/nodes/editor-node-memo';
import {
  getBackgroundStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ImageComponentData } from '@/types';
import { memo, useContext, useRef, type ChangeEvent } from 'react';
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
  const { assets, createAsset } = useAssets();
  const characterContext = useContext(CharacterContext);
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);
  const character = characterContext?.character ?? null;
  const { updateCharacter } = useCharacter(character?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const asset = assets.find((a) => a.id === data.assetId);
  const componentImageSrc = asset?.data ?? data.assetUrl;

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

  const canEditCharacterImage = !!(data.useCharacterImage && character);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && character) {
      const assetId = await createAsset(
        file,
        undefined,
        character.rulesetId ?? undefined,
      );
      await updateCharacter(character.id, { assetId });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClick = canEditCharacterImage
    ? () => fileInputRef.current?.click()
    : undefined;

  if (!imageSrc) {
    if (!canEditCharacterImage) return null;
    return (
      <>
        <button
          type='button'
          onClick={handleClick}
          aria-label='Set character image'
          style={{
            height: canvasDimensionToCss(ch),
            width: canvasDimensionToCss(cw),
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '2px dashed #ccc',
            color: '#999',
            fontSize: '12px',
            textAlign: 'center',
            padding: '8px',
            overflow: 'hidden',
            ...css,
            ...getBackgroundStyle(css),
          }}>
          Set image
        </button>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          hidden
          onChange={handleFileChange}
        />
      </>
    );
  }

  return (
    <>
      <img
        src={imageSrc}
        alt={data.altText ?? ''}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onClick={handleClick}
        style={{
          height: canvasDimensionToCss(ch),
          width: canvasDimensionToCss(cw),
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'cover',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          cursor: canEditCharacterImage ? 'pointer' : undefined,
          ...css,
          ...(imageSrc ? { backgroundColor: 'transparent' } : getBackgroundStyle(css)),
        }}
      />
      {canEditCharacterImage && (
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          hidden
          onChange={handleFileChange}
        />
      )}
    </>
  );
};

export const ViewImageNode = memo(
  ViewImageNodeComponent,
  (prev, next) => editorNodeComponentVisualEqual(prev.component, next.component),
);
