import { useAssets } from '@/lib/compass-api';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import {
  getBackgroundStyle,
  getColorStyle,
  getComponentData,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ComponentStyle } from '@/types';
import { CheckIcon, SquareIcon } from 'lucide-react';
import { memo, useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditCheckboxNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = getComponent(id);
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <ViewCheckboxNode component={component} editMode />
    </ResizableNode>
  );
};

const ViewCheckboxNodeComponent = ({
  component,
  editMode,
}: {
  component: Component;
  editMode?: boolean;
}) => {
  const characterContext = useContext(CharacterContext);
  const data = useNodeData(component);
  const css = useComponentStyles(component);
  const { assets } = useAssets();

  const isChecked = editMode ? false : Boolean(data.value);

  const checkedAsset = assets.find((a) => a.id === data.checkedAssetId);
  const uncheckedAsset = assets.find((a) => a.id === data.uncheckedAssetId);

  const checkedImageUrl = checkedAsset?.data ?? data.checkedAssetUrl;
  const uncheckedImageUrl = uncheckedAsset?.data ?? data.uncheckedAssetUrl;
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);

  const handleChange = () => {
    if (!characterContext) return;

    const componentData = getComponentData(component);
    const propId = componentData.attributeCustomPropertyId;
    if (propId && data.characterAttributeId && component.attributeId) {
      const ca = characterContext.getCharacterAttribute(component.attributeId);
      if (ca) {
        characterContext.updateCharacterAttribute(data.characterAttributeId, {
          attributeCustomPropertyValues: {
            ...(ca.attributeCustomPropertyValues ?? {}),
            [propId]: !isChecked,
          },
        });
      }
      return;
    }

    if (data.characterAttributeId) {
      characterContext.updateCharacterAttribute(data.characterAttributeId, {
        value: !isChecked,
      });
    } else {
      characterContext.updateCharacterComponentData(component.id, !isChecked);
    }
  };

  const clickDisabled = editMode || data.disabled;

  return (
    <section
      onClick={clickDisabled ? undefined : handleChange}
      style={{
        position: 'relative',
        height: ch,
        width: cw,
        pointerEvents: editMode ? 'none' : undefined,
        display: 'flex',
        justifyContent: css.textAlign ?? 'center',
        alignItems: css.verticalAlign ?? 'center',
        ...getBackgroundStyle(css),
        borderRadius: css.borderRadius,
        outline: css.outline,
        outlineColor: css.outlineColor,
        outlineWidth: css.outlineWidth,
        cursor: clickDisabled ? 'default' : 'pointer',
        ...(!editMode ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
      }}>
      {isChecked ? (
        <Checked url={checkedImageUrl} css={css} />
      ) : (
        <Unchecked url={uncheckedImageUrl} css={css} />
      )}
    </section>
  );
};

export const ViewCheckboxNode = memo(
  ViewCheckboxNodeComponent,
  (prev, next) => prev.component === next.component && prev.editMode === next.editMode,
);

function Checked({ url, css }: { url?: string; css: ComponentStyle }) {
  const colorStyle = getColorStyle(css);
  if (url) {
    return (
      <img
        src={url}
        alt=''
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          height: '100%',
          width: '100%',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          ...colorStyle,
        }}
      />
    );
  }

  return (
    <CheckIcon
      style={{
        height: '100%',
        width: '100%',
        ...colorStyle,
      }}
    />
  );
}

function Unchecked({ url, css }: { url?: string; css: ComponentStyle }) {
  const colorStyle = getColorStyle(css);
  if (url) {
    return (
      <img
        src={url}
        alt=''
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        style={{
          height: '100%',
          width: '100%',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          ...colorStyle,
        }}
      />
    );
  }

  return (
    <SquareIcon
      style={{
        height: '100%',
        width: '100%',
        ...colorStyle,
      }}
    />
  );
}
