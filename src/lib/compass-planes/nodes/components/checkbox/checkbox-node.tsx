import { useAssets } from '@/lib/compass-api';
import {
  useAttributeChangedByScript,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ComponentStyle } from '@/types';
import { useNodeId } from '@xyflow/react';
import { motion } from 'framer-motion';
import { CheckIcon, SquareIcon } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
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
  const { changedByScript } = useAttributeChangedByScript(
    characterId,
    component.attributeId ?? '',
    data.value,
  );
  const [scriptChangeFlash, setScriptChangeFlash] = useState(false);
  useEffect(() => {
    if (changedByScript) {
      setScriptChangeFlash(true);
      const t = setTimeout(() => setScriptChangeFlash(false), 400);
      return () => clearTimeout(t);
    }
  }, [changedByScript]);

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
    <motion.section
      onClick={editMode ? undefined : handleChange}
      style={{
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
      }}
      initial={false}
      animate={
        scriptChangeFlash
          ? {
              boxShadow: [
                '0 0 0 0 transparent',
                '0 0 0 3px var(--primary)',
                '0 0 0 0 transparent',
              ],
            }
          : {}
      }
      transition={{ duration: 0.4 }}>
      {isChecked ? (
        <Checked url={checkedImageUrl} css={css} />
      ) : (
        <Unchecked url={uncheckedImageUrl} css={css} />
      )}
    </motion.section>
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
