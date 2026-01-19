import {
  fireExternalComponentChangeEvent,
  getComponentData,
  getComponentStyles,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, TextComponentData, TextComponentStyle } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

/*
The EditTextNode should render a span within the ResizableNode wrapper. Resizing the node should scale the text.
Double clicking the node should locked the component and replace the span with an input. The style of the input should be invisible, only showing the text content.
While the node is an input, the enter key should update the component, switch back to the span and unlock the component.
*/

export const EditTextNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as TextComponentData;
  const css = getComponentStyles(component) as TextComponentStyle;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (!component.locked) {
      updateComponent(id, {
        locked: true,
      });
      fireExternalComponentChangeEvent({
        updates: [{ id, locked: true }],
      });
      setIsEditing(true);
    }
  };

  const handleUpdate = (value: string) => {
    const update = {
      id,
      data: JSON.stringify({
        ...data,
        value,
      }),
    };

    updateComponent(id, update);
    fireExternalComponentChangeEvent({
      updates: [update],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value;
      handleUpdate(value);
      setIsEditing(false);
      updateComponent(id, {
        locked: false,
      });
      fireExternalComponentChangeEvent({
        updates: [{ id, locked: false }],
      });
    }
  };

  return (
    <ResizableNode component={component}>
      {isEditing ? (
        <section
          style={{
            height: component.height,
            width: component.width,
            display: 'flex',
            justifyContent: css.textAlign ?? 'start',
            alignItems: css.verticalAlign ?? 'start',
          }}>
          <input
            ref={inputRef}
            type='text'
            defaultValue={data.value}
            onKeyDown={handleKeyDown}
            style={{
              ...css,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              width: '100%',
              height: '100%',
              font: 'inherit',
              color: 'inherit',
            }}
          />
        </section>
      ) : (
        <ViewTextNode component={component} onDoubleClick={handleDoubleClick} />
      )}
    </ResizableNode>
  );
};

export const ViewTextNode = ({
  component,
  onDoubleClick,
}: {
  component: Component;
  onDoubleClick?: () => void;
}) => {
  const data = getComponentData(component) as TextComponentData;
  const css = getComponentStyles(component) as TextComponentStyle;

  return (
    <section
      style={{
        height: component.height,
        width: component.width,
        display: 'flex',
        justifyContent: css.textAlign ?? 'start',
        alignItems: css.verticalAlign ?? 'start',
      }}>
      <span onDoubleClick={onDoubleClick} style={css}>
        {data.value}
      </span>
    </section>
  );
};
