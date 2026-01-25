import {
  fireExternalComponentChangeEvent,
  getComponentData,
  getComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, ContentComponentData, TextComponentStyle } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { ResizableNode } from '../../decorators';

export const EditContentNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as ContentComponentData;
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

  const handleBlur = () => {
    if (textareaRef.current) {
      handleUpdate(textareaRef.current.value);
    }
    setIsEditing(false);
    updateComponent(id, {
      locked: false,
    });
    fireExternalComponentChangeEvent({
      updates: [{ id, locked: false }],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    // Allow Escape to exit edit mode
    if (e.key === 'Escape') {
      handleBlur();
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
          <textarea
            ref={textareaRef}
            defaultValue={data.value?.toString()}
            onBlur={handleBlur}
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
              fontSize: '16px',
              color: 'inherit',
              resize: 'none',
              overflow: 'auto',
            }}
          />
        </section>
      ) : (
        <ViewContentNode component={component} onDoubleClick={handleDoubleClick} />
      )}
    </ResizableNode>
  );
};

export const ViewContentNode = ({
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
      onDoubleClick={onDoubleClick}
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
        overflow: 'auto',
      }}>
      <div
        style={{
          ...css,
          width: '100%',
          height: '100%',
        }}
        className='prose prose-invert max-w-none editor-content'>
        <Markdown>{data?.interpolatedValue?.toString() ?? ''}</Markdown>
      </div>
    </section>
  );
};
