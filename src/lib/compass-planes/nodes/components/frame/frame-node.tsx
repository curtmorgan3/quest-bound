import {
  getBackgroundStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { colorWhite } from '@/palette';
import { WindowEditorContext } from '@/stores';
import type { Component, FrameComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { Frame as FrameIcon } from 'lucide-react';
import { memo, useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditFrameNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  const component = id ? getComponent(id) : null;
  const css = useComponentStyles(component);

  if (!id) return null;
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <div
        style={{
          height: `${component.height}px`,
          width: `${component.width}px`,
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
  const url = data?.url?.trim();

  if (!url) {
    return null;
  }

  return (
    <iframe
      src={url}
      title='Embedded content'
      style={{
        height: `${component.height}px`,
        width: `${component.width}px`,
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
