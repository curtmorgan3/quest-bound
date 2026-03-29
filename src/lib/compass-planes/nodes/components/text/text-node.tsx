import {
  fireExternalComponentChangeEvent,
  getBackgroundStyle,
  getColorStyle,
  getComponentData,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, TextComponentData, TextComponentStyle } from '@/types';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

export const EditTextNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = id ? getComponent(id) : null;
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const css = useComponentStyles(component) as TextComponentStyle;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!component) return null;

  const { width: cw, height: ch } = useComponentCanvasDimensions(component);
  const data = getComponentData(component) as TextComponentData;

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
    setIsEditing(false);
    updateComponent(id, {
      locked: false,
    });
    fireExternalComponentChangeEvent({
      updates: [{ id, locked: false }],
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
        <div
          style={{
            position: 'relative',
            height: ch,
            width: cw,
            overflow: 'visible',
          }}>
          <section
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              justifyContent: css.textAlign ?? 'start',
              alignItems: css.verticalAlign ?? 'start',
              ...getBackgroundStyle(css),
              borderRadius: css.borderRadius,
              outline: css.outline,
              outlineColor: css.outlineColor,
              outlineWidth: css.outlineWidth,
              overflow: 'hidden',
            }}>
            <input
              ref={inputRef}
              type='text'
              defaultValue={data.value?.toString()}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                ...css,
                ...getColorStyle(css),
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: 0,
                margin: 0,
                minWidth: 0,
                maxWidth: '100%',
                width: 'auto',
                boxSizing: 'border-box',
                textAlign: css.textAlign ?? 'start',
                lineHeight:
                  typeof css.lineHeight === 'number' ? `${css.lineHeight}px` : undefined,
                fieldSizing: 'content',
              }}
            />
          </section>
        </div>
      ) : (
        <ViewTextNode component={component} onDoubleClick={handleDoubleClick} />
      )}
    </ResizableNode>
  );
};

const ViewTextNodeComponent = ({
  component,
  onDoubleClick,
}: {
  component: Component;
  onDoubleClick?: () => void;
}) => {
  const data = useNodeData(component);
  const css = useComponentStyles(component) as TextComponentStyle;
  const { width: cw, height: ch } = useComponentCanvasDimensions(component);
  /** Sheet editor: idle text is not selectable so drag/click selection does not fight the canvas. */
  const editorChrome = onDoubleClick != null;

  return (
    <div
      style={{
        position: 'relative',
        height: ch,
        width: cw,
        overflow: 'visible',
      }}>
      <section
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: css.textAlign ?? 'start',
          alignItems: css.verticalAlign ?? 'start',
          ...getBackgroundStyle(css),
          borderRadius: css.borderRadius,
          outline: css.outline,
          outlineColor: css.outlineColor,
          outlineWidth: css.outlineWidth,
          overflow: 'hidden',
          ...(editorChrome ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
        }}>
        <span
          onDoubleClick={onDoubleClick}
          style={{
            ...css,
            ...getColorStyle(css),
            outline: 'none',
            outlineColor: 'unset',
            outlineWidth: 'unset',
            ...(editorChrome ? { userSelect: 'none', WebkitUserSelect: 'none' } : {}),
          }}>
          {data?.interpolatedValue}
        </span>
      </section>
    </div>
  );
};

export const ViewTextNode = memo(
  ViewTextNodeComponent,
  (prev, next) =>
    prev.component === next.component && prev.onDoubleClick === next.onDoubleClick,
);
