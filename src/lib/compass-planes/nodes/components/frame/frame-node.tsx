import {
  getBackgroundStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { colorWhite } from '@/palette';
import { WindowEditorContext } from '@/stores';
import type { Component, FrameComponentData } from '@/types';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { Frame as FrameIcon } from 'lucide-react';
import { memo, useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditFrameNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = getComponent(id);
  const css = useComponentStyles(component);

  if (!component) return null;

  const { width: cw, height: ch } = useComponentCanvasDimensions(component);

  return (
    <ResizableNode component={component}>
      <div
        style={{
          height: `${ch}px`,
          width: `${cw}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...css,
          ...getBackgroundStyle(css),
        }}>
        <FrameIcon size={32} color={colorWhite} strokeWidth={1.5} />
      </div>
    </ResizableNode>
  );
};

const ViewFrameNodeComponent = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as FrameComponentData;
  const css = useComponentStyles(component);
  const { width: cw, height: ch } = useComponentCanvasDimensions(component);
  const url = data?.url?.trim();

  if (!url) {
    return null;
  }

  return (
    <iframe
      src={url}
      title='Embedded content'
      style={{
        height: `${ch}px`,
        width: `${cw}px`,
        border: 'none',
        ...css,
        ...getBackgroundStyle(css),
      }}
    />
  );
};

export const ViewFrameNode = memo(
  ViewFrameNodeComponent,
  (prev, next) => prev.component === next.component,
);
