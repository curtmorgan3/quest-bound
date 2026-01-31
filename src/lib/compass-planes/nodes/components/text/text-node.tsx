import {
  fireExternalComponentChangeEvent,
  getComponentData,
  getComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, TextComponentData, TextComponentStyle } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

export const EditTextNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as TextComponentData;
  const css = getComponentStyles(component) as TextComponentStyle;

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
            defaultValue={data.value?.toString()}
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
  const data = useNodeData(component);
  const css = getComponentStyles(component) as TextComponentStyle;

  return (
    <section
      style={{
        height: component.height,
        width: component.width,
        display: 'flex',
        justifyContent: css.textAlign ?? 'start',
        alignItems: css.verticalAlign ?? 'start',
        backgroundColor: css.backgroundColor,
        borderRadius: css.borderRadius,
        outline: css.outline,
        outlineColor: css.outlineColor,
        outlineWidth: css.outlineWidth,
        overflow: 'hidden',
      }}>
      <span
        onDoubleClick={onDoubleClick}
        style={{
          ...css,
          outline: 'none',
          outlineColor: 'unset',
          outlineWidth: 'unset',
        }}>
        {data?.interpolatedValue}
      </span>
    </section>
  );
};
