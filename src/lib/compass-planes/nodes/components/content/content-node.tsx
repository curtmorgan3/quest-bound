import {
  fireExternalComponentChangeEvent,
  getBackgroundStyle,
  getComponentData,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, ContentComponentData, TextComponentStyle } from '@/types';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { MarkdownViewer } from '@/components/composites';
import { ResizableNode } from '../../decorators';

export const EditContentNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as ContentComponentData;

  const handleDoubleClick = () => {
    if (!component.locked) {
      updateComponent(id, {
        locked: true,
      });
      fireExternalComponentChangeEvent({
        updates: [{ id, locked: true }],
      });
    }
  };

  const handleUpdate = (value: string) => {
    const update = {
      id,
      locked: false,
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

  return (
    <ResizableNode component={component}>
      <ViewContentNode
        component={component}
        windowEditorMode
        handleComponentUpdate={handleUpdate}
        handleDoubleClick={handleDoubleClick}
      />
    </ResizableNode>
  );
};

const ViewContentNodeComponent = ({
  component,
  windowEditorMode,
  handleComponentUpdate,
  handleDoubleClick,
}: {
  component: Component;
  windowEditorMode?: boolean;
  handleComponentUpdate?: (value: string) => void;
  handleDoubleClick?: () => void;
}) => {
  const data = useNodeData(component);
  const css = useComponentStyles(component) as TextComponentStyle;
  const characterContext = useContext(CharacterContext);
  const { width: cw, height: ch } = useComponentCanvasDimensions(component);

  const { characterAttributeId } = data;

  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (textareaRef.current) {
      if (windowEditorMode) {
        handleComponentUpdate?.(textareaRef.current.value);
      } else if (characterContext) {
        if (characterAttributeId) {
          characterContext.updateCharacterAttribute(characterAttributeId, {
            value: textareaRef.current.value,
          });
        } else {
          characterContext.updateCharacterComponentData(component.id, textareaRef.current.value);
        }
      }
    }

    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    // Allow Escape to exit edit mode
    if (e.key === 'Escape') {
      handleBlur();
    }
  };

  return isEditing ? (
    <section
      style={{
        height: ch,
        width: cw,
        display: 'flex',
        justifyContent: css.textAlign ?? 'start',
        alignItems: css.verticalAlign ?? 'start',
      }}>
      <textarea
        ref={textareaRef}
        defaultValue={data.value?.toString()}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onWheelCapture={(e) => e.stopPropagation()}
        className='nowheel nodrag'
        data-no-canvas-drag={windowEditorMode ? '' : undefined}
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
          resize: 'none',
          overflow: 'auto',
        }}
      />
    </section>
  ) : (
    <section
      onDoubleClick={() => {
        if (!windowEditorMode && !characterContext) return;
        if (!windowEditorMode && data.readOnly) return;
        setIsEditing(true);
        handleDoubleClick?.();
      }}
      onWheelCapture={(e) => e.stopPropagation()}
      style={{
        position: 'relative',
        height: ch,
        width: cw,
        display: 'flex',
        justifyContent: css.textAlign ?? 'start',
        alignItems: css.verticalAlign ?? 'start',
        ...getBackgroundStyle(css),
        borderRadius: css.borderRadius,
        outline: css.outline,
        outlineColor: css.outlineColor,
        outlineWidth: css.outlineWidth,
        overflow: 'auto',
      }}>
      <div
        onWheelCapture={(e) => e.stopPropagation()}
        style={{
          ...css,
          width: '100%',
          height: '100%',
          overflow: 'auto',
        }}
        className={`nowheel${windowEditorMode ? '' : ' nodrag'} prose prose-invert max-w-none editor-content md-content`}>
        <MarkdownViewer value={data?.interpolatedValue?.toString() ?? ''} />
      </div>
    </section>
  );
};

export const ViewContentNode = memo(
  ViewContentNodeComponent,
  (prev, next) =>
    prev.component === next.component &&
    prev.windowEditorMode === next.windowEditorMode &&
    prev.handleComponentUpdate === next.handleComponentUpdate &&
    prev.handleDoubleClick === next.handleDoubleClick,
);
