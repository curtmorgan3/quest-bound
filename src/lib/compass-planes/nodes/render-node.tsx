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
import { getComponentData } from '../utils';
import { NodeActionCaller } from './decorators';

export const renderViewComponent = (
  component: Component,
  characterAttributes?: CharacterAttribute[],
) => {
  const conditionalRenderId = getComponentData(component).conditionalRenderAttributeId;

  if (characterAttributes && conditionalRenderId) {
    const conditionAttribute = characterAttributes.find(
      (attr) => attr.attributeId === conditionalRenderId,
    );
    if (conditionAttribute?.value === false) {
      return null;
    }
  }

  switch (component.type) {
    case ComponentTypes.TEXT:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewTextNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.SHAPE:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewShapeNode component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.IMAGE:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewImageNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.INPUT:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewInputNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.CHECKBOX:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewCheckboxNode key={component.id} component={component} />
        </WrapDecorators>
      );

    case ComponentTypes.CONTENT:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewContentNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.INVENTORY:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewInventoryNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.GRAPH:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewGraphNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.FRAME:
      return (
        <WrapDecorators key={component.id} component={component}>
          <ViewFrameNode key={component.id} component={component} />
        </WrapDecorators>
      );
    default:
      console.warn(`Attempted to render an unregistered view component: `, component.type);
      return null;
  }
};

function WrapDecorators({ children, component }: { children: ReactNode; component: Component }) {
  return <NodeActionCaller component={component}>{children}</NodeActionCaller>;
}
