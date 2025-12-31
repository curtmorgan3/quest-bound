import {
  fireExternalComponentChangeEvent,
  getComponentData,
  getComponentStyles,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, TextComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { ResizableNode } from '../../decorators';

/*
The EditTextNode should render a span within the ResizableNode wrapper. Resizing the node should scale the text.
Double clicking the node should locked the component and replace the span with an input. The style of the input should be invisible, only showing the text content.
While the node is an input, the enter key should update the component, switch back to the span and unlock the component.
*/

export const EditTextNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as TextComponentData;
  const css = getComponentStyles(component);

  const handleToggleLock = () => {
    const locked = !component.locked;
    updateComponent(id, {
      locked,
    });
    fireExternalComponentChangeEvent({
      updates: [{ id, locked }],
    });
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

  return (
    <ResizableNode component={component}>
      <span>{data.value}</span>
    </ResizableNode>
  );
};

export const ViewTextNode = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as TextComponentData;
  const css = getComponentStyles(component);

  return <span style={css}>{data.value}</span>;
};
