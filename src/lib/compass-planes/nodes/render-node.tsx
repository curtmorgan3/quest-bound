import type { CharacterAttribute, Component } from '@/types';
import type { ReactNode } from 'react';
import { ComponentTypes } from '../nodes';
import {
  ViewCheckboxNode,
  ViewContentNode,
  ViewFrameNode,
  ViewGraphNode,
  ViewImageNode,
  ViewInputNode,
  ViewInventoryNode,
  ViewShapeNode,
  ViewTextNode,
} from '../nodes/components';
import { NodeActionCaller, NodeConditionalRender, NodePageRouter } from './decorators';

export const renderViewComponent = (
  component: Component,
  characterAttributes?: CharacterAttribute[],
) => {
  switch (component.type) {
    case ComponentTypes.TEXT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewTextNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.SHAPE:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewShapeNode component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.IMAGE:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewImageNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.INPUT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewInputNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.CHECKBOX:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewCheckboxNode key={component.id} component={component} />
        </WrapDecorators>
      );

    case ComponentTypes.CONTENT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewContentNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.INVENTORY:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewInventoryNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.GRAPH:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewGraphNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.FRAME:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          characterAttributes={characterAttributes}>
          <ViewFrameNode key={component.id} component={component} />
        </WrapDecorators>
      );
    default:
      console.warn(`Attempted to render an unregistered view component: `, component.type);
      return null;
  }
};

function WrapDecorators({
  children,
  component,
  characterAttributes,
}: {
  children: ReactNode;
  component: Component;
  characterAttributes?: CharacterAttribute[];
}) {
  return (
    <NodeConditionalRender
      component={component}
      characterAttributes={characterAttributes}>
      <NodePageRouter component={component}>
        <NodeActionCaller component={component}>{children}</NodeActionCaller>
      </NodePageRouter>
    </NodeConditionalRender>
  );
}
