import { getComponentStyles, useNodeData } from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, TextComponentStyle } from '@/types';
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
  const data = useNodeData(component);
  const css = getComponentStyles(component) as TextComponentStyle;

  const characterContext = useContext(CharacterContext);

  const isChecked = editMode ? false : Boolean(data.value);

  const handleChange = () => {
    if (data.characterAttributeId && characterContext) {
      characterContext.updateCharacterAttribute(data.characterAttributeId, {
        value: !isChecked,
      });
    }
  };

  return (
    <section
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
      }}>
      {isChecked ? (
        <CheckIcon
          style={{
            height: '100%',
            width: '100%',
            color: css.color,
          }}
        />
      ) : (
        <SquareIcon
          style={{
            height: '100%',
            width: '100%',
            color: css.color,
          }}
        />
      )}
    </section>
  );
};
