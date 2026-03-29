import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { getBackgroundStyle, useComponentStyles } from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, ComponentStyle } from '@/types';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditGroupNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = id ? getComponent(id) : null;
  const css = useComponentStyles(component) as ComponentStyle;

  if (!component) return null;

  const { width: cw, height: ch } = useComponentCanvasDimensions(component);

  return (
    <ResizableNode component={component}>
      <div
        aria-hidden
        className='box-border h-full w-full'
        style={{
          height: ch,
          width: cw,
          ...css,
          ...getBackgroundStyle(css),
          overflow: 'visible',
        }}
      />
    </ResizableNode>
  );
};

export const ViewGroupNode = ({ component }: { component: Component }) => {
  const css = useComponentStyles(component) as ComponentStyle;

  return (
    <div
      aria-hidden
      className='pointer-events-none box-border h-full w-full'
      style={{
        ...css,
        ...getBackgroundStyle(css),
        overflow: 'visible',
      }}
    />
  );
};
