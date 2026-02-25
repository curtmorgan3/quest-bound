import { useAssets } from '@/lib/compass-api';
import {
  useComponentStyles,
  useNodeData,
  useRegisterAnimation,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ComponentStyle } from '@/types';
import { useNodeId } from '@xyflow/react';
import { CheckIcon, SquareIcon } from 'lucide-react';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditCheckboxNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useNodeId();

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <ViewCheckboxNode component={component} editMode />
    </ResizableNode>
  );
};

export const ViewCheckboxNode = ({
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
  const characterId = characterContext?.character?.id ?? '';
  const { flashKey, scriptChangeFlash } = useRegisterAnimation(
    characterId,
    component.attributeId ?? '',
    data.value,
  );

  const isChecked = editMode ? false : Boolean(data.value);

  const checkedAsset = assets.find((a) => a.id === data.checkedAssetId);
  const uncheckedAsset = assets.find((a) => a.id === data.uncheckedAssetId);

  const checkedImageUrl = checkedAsset?.data ?? data.checkedAssetUrl;
  const uncheckedImageUrl = uncheckedAsset?.data ?? data.uncheckedAssetUrl;

  const handleChange = () => {
    if (!characterContext) return;

    if (data.characterAttributeId) {
      characterContext.updateCharacterAttribute(data.characterAttributeId, {
        value: !isChecked,
      });
    } else {
      characterContext.updateCharacterComponentData(component.id, !isChecked);
    }
  };

  return (
    <section
      key={flashKey}
      className={scriptChangeFlash ? 'script-change-flash' : undefined}
      onClick={editMode ? undefined : handleChange}
      style={{
        position: 'relative',
        height: component.height,
        width: component.width,
        pointerEvents: editMode ? 'none' : undefined,
        display: 'flex',
        justifyContent: css.textAlign ?? 'center',
        alignItems: css.verticalAlign ?? 'center',
        backgroundColor: css.backgroundColor,
        borderRadius: css.borderRadius,
        outline: css.outline,
        outlineColor: css.outlineColor,
        outlineWidth: css.outlineWidth,
        cursor: editMode ? 'default' : 'pointer',
      }}>
      {isChecked ? (
        <Checked url={checkedImageUrl} css={css} />
      ) : (
        <Unchecked url={uncheckedImageUrl} css={css} />
      )}
    </section>
  );
};

function Checked({ url, css }: { url?: string; css: ComponentStyle }) {
  if (url) {
    return (
      <img
        src={url}
        style={{
          height: '100%',
          width: '100%',
          color: css.color,
        }}
      />
    );
  }

  return (
    <CheckIcon
      style={{
        height: '100%',
        width: '100%',
        color: css.color,
      }}
    />
  );
}

function Unchecked({ url, css }: { url?: string; css: ComponentStyle }) {
  if (url) {
    return (
      <img
        src={url}
        style={{
          height: '100%',
          width: '100%',
          color: css.color,
        }}
      />
    );
  }

  return (
    <SquareIcon
      style={{
        height: '100%',
        width: '100%',
        color: css.color,
      }}
    />
  );
}
