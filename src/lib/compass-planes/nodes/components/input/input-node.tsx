import { getComponentStyles, useNodeData } from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, TextComponentStyle } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditInputNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useNodeId();

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <ViewInputNode component={component} editMode />
    </ResizableNode>
  );
};

export const ViewInputNode = ({
  component,
  editMode,
}: {
  component: Component;
  editMode?: boolean;
}) => {
  const data = useNodeData(component);
  const css = getComponentStyles(component) as TextComponentStyle;

  const characterContext = useContext(CharacterContext);

  const handleChange = (value: string | number) => {
    if (data.characterAttributeId && characterContext) {
      characterContext.updateCharacterAttribute(data.characterAttributeId, {
        value,
      });
    }
  };

  const isListType = data.attributeType === 'list';

  const sectionStyle = {
    height: component.height,
    width: component.width,
    pointerEvents: editMode ? 'none' : undefined,
    display: 'flex',
    justifyContent: css.textAlign ?? 'start',
    alignItems: css.verticalAlign ?? 'start',
    backgroundColor: css.backgroundColor,
    borderRadius: css.borderRadius,
    outline: css.outline,
    outlineColor: css.outlineColor,
    outlineWidth: css.outlineWidth,
  } as React.CSSProperties;

  const inputStyle = {
    height: '100%',
    width: '100%',
    color: css.color,
    fontSize: css.fontSize,
    fontFamily: css.fontFamily,
    fontWeight: css.fontWeight,
    fontStyle: css.fontStyle,
    textAlign: css.textAlign,
    border: 'none',
    backgroundColor: 'transparent',
  } as React.CSSProperties;

  return (
    <section style={sectionStyle}>
      {isListType && !editMode ? (
        <select
          disabled={editMode}
          onChange={(e) => handleChange(e.target.value)}
          value={data.value.toString()}
          style={inputStyle}>
          <option value=''>{data.name}</option>
          {data.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          className='editor-input'
          type={data.attributeType === 'string' ? 'text' : 'number'}
          disabled={editMode}
          placeholder={data?.name}
          onChange={(e) => handleChange(e.target.value)}
          value={editMode ? undefined : data.value.toString()}
          style={inputStyle}
        />
      )}
    </section>
  );
};
