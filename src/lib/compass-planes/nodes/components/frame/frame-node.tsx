import { getComponentData, getComponentStyles } from '@/lib/compass-planes/utils';
import { colorWhite } from '@/palette';
import { WindowEditorContext } from '@/stores';
import type { Component, FrameComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { Frame as FrameIcon } from 'lucide-react';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const EditFrameNode = () => {
  const { getComponent } = useContext(WindowEditorContext);

  const id = useNodeId();

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const css = getComponentStyles(component);

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
        }}>
        <FrameIcon size={32} color={colorWhite} strokeWidth={1.5} />
      </div>
    </ResizableNode>
  );
};

export const ViewFrameNode = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as FrameComponentData;
  const css = getComponentStyles(component);
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
      }}
    />
  );
};
