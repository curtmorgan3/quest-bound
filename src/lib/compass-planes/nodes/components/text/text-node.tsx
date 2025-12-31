import { getComponentData, getComponentStyles } from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, TextComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

export const TextNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <PrimitiveTextNode component={component} />
    </ResizableNode>
  );
};

export const PrimitiveTextNode = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as TextComponentData;
  const css = getComponentStyles(component);
  const textValue = data.value;

  return <span>Text</span>;
};
