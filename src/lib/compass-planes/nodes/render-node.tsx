import type { CharacterAttribute, Component, ComponentData } from '@/types';
import type { ReactNode } from 'react';
import type { PositionValues } from '../utils';
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
import {
  NodeAnimation,
  NodeAttributeEditPanelControl,
  NodeConditionalRender,
  NodePageRouter,
  NodeScriptCaller,
} from './decorators';
import { NodeRotation } from './decorators/node-rotation';
import { getComponentData } from '../utils';

export const renderViewComponent = (
  component: Component,
  characterAttributes?: CharacterAttribute[],
  position?: PositionValues,
) => {
  const componentData = getComponentData(component);

  switch (component.type) {
    case ComponentTypes.TEXT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewTextNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.SHAPE:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewShapeNode component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.IMAGE:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewImageNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.INPUT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewInputNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.CHECKBOX:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewCheckboxNode key={component.id} component={component} />
        </WrapDecorators>
      );

    case ComponentTypes.CONTENT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewContentNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.INVENTORY:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewInventoryNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.GRAPH:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}>
          <ViewGraphNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.FRAME:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
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
  componentData,
  position,
}: {
  children: ReactNode;
  component: Component;
  characterAttributes?: CharacterAttribute[];
  componentData: ComponentData;
  position?: PositionValues;
}) {
  return (
    <NodeConditionalRender
      component={component}
      componentData={componentData}
      characterAttributes={characterAttributes}>
      <NodeScriptCaller component={component}>
        <NodeAttributeEditPanelControl component={component}>
          <NodePageRouter component={component} componentData={componentData}>
            <NodeRotation rotation={position?.rotation} z={position?.z}>
              <NodeAnimation component={component}>{children}</NodeAnimation>
            </NodeRotation>
          </NodePageRouter>
        </NodeAttributeEditPanelControl>
      </NodeScriptCaller>
    </NodeConditionalRender>
  );
}
