import type { CharacterAttribute, Component, ComponentData } from '@/types';
import type { ReactNode } from 'react';
import type { PositionValues } from '../utils';
import { ComponentTypes } from '../nodes';
import {
  ViewCheckboxNode,
  ViewContentNode,
  ViewFrameNode,
  ViewGraphNode,
  ViewGroupNode,
  ViewImageNode,
  ViewInputNode,
  ViewInventoryNode,
  ViewShapeNode,
  ViewTextNode,
} from '../nodes/components';
import {
  NodeActionCaller,
  NodeAnimation,
  NodeAttributeEditPanelControl,
  NodeConditionalRender,
  NodeDiceClick,
  NodeNavigator,
  NodeScriptCaller,
  NodeStateDecorator,
  NodeTooltip,
} from './decorators';
import { NodeRotation } from './decorators/node-rotation';
import type { ViewRenderContext } from './view-render-context';

export type { ViewRenderContext } from './view-render-context';

export { isComponentConditionallyVisible } from './decorators/conditional-render';

function renderDecoratedViewBranch(
  component: Component,
  characterAttributes: CharacterAttribute[] | undefined,
  position: PositionValues | undefined,
  viewCtx: ViewRenderContext | undefined,
  leaf: (c: Component) => ReactNode,
): ReactNode {
  return (
    <NodeStateDecorator key={component.id} component={component} viewCtx={viewCtx}>
      {(c, data) => (
        <WrapDecorators
          component={c}
          componentData={data}
          position={position}
          characterAttributes={characterAttributes}
          viewCtx={viewCtx}>
          {leaf(c)}
        </WrapDecorators>
      )}
    </NodeStateDecorator>
  );
}

export function renderViewComponent(
  component: Component,
  characterAttributes?: CharacterAttribute[],
  position?: PositionValues,
  ctx?: ViewRenderContext,
): ReactNode {
  switch (component.type) {
    case ComponentTypes.TEXT:
      return renderDecoratedViewBranch(
        component,
        characterAttributes,
        position,
        ctx,
        (c) => <ViewTextNode key={c.id} component={c} />,
      );
    case ComponentTypes.SHAPE:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewShapeNode component={c} />
      ));
    case ComponentTypes.IMAGE:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewImageNode key={c.id} component={c} />
      ));
    case ComponentTypes.INPUT:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewInputNode key={c.id} component={c} />
      ));
    case ComponentTypes.CHECKBOX:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewCheckboxNode key={c.id} component={c} />
      ));

    case ComponentTypes.CONTENT:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewContentNode key={c.id} component={c} />
      ));
    case ComponentTypes.INVENTORY:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewInventoryNode key={c.id} component={c} />
      ));
    case ComponentTypes.GRAPH:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewGraphNode key={c.id} component={c} />
      ));
    case ComponentTypes.FRAME:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewFrameNode key={c.id} component={c} />
      ));
    case ComponentTypes.GROUP:
      return renderDecoratedViewBranch(component, characterAttributes, position, ctx, (c) => (
        <ViewGroupNode
          component={c}
          allComponents={ctx?.allComponents ?? []}
          effectiveLayout={ctx?.effectiveLayout}
          characterAttributes={characterAttributes}
          renderChild={
            ctx
              ? (child) =>
                  renderViewComponent(
                    child,
                    characterAttributes,
                    ctx.positionMap.get(child.id),
                    ctx,
                  )
              : undefined
          }
        />
      ));
    default:
      console.warn(`Attempted to render an unregistered view component: `, component.type);
      return null;
  }
}

function WrapDecorators({
  children,
  component,
  characterAttributes,
  componentData,
  position,
  viewCtx,
}: {
  children: ReactNode;
  component: Component;
  characterAttributes?: CharacterAttribute[];
  componentData: ComponentData;
  position?: PositionValues;
  viewCtx?: ViewRenderContext;
}) {
  return (
    <NodeConditionalRender
      component={component}
      componentData={componentData}
      characterAttributes={characterAttributes}>
      <NodeTooltip
        component={component}
        componentData={componentData}>
        <NodeScriptCaller component={component}>
          <NodeDiceClick component={component}>
            <NodeAttributeEditPanelControl component={component}>
              <NodeNavigator component={component} componentData={componentData} viewCtx={viewCtx}>
                <NodeActionCaller component={component} componentData={componentData}>
                  <NodeRotation rotation={position?.rotation} z={position?.z}>
                    <NodeAnimation component={component}>{children}</NodeAnimation>
                  </NodeRotation>
                </NodeActionCaller>
              </NodeNavigator>
            </NodeAttributeEditPanelControl>
          </NodeDiceClick>
        </NodeScriptCaller>
      </NodeTooltip>
    </NodeConditionalRender>
  );
}
