import type { CharacterAttribute, Component, ComponentData } from '@/types';
import type { ReactNode } from 'react';
import type { EffectiveLayout } from '../sheet-editor/component-world-geometry';
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
  NodeTooltip,
} from './decorators';
import { NodeRotation } from './decorators/node-rotation';
import { getComponentData } from '../utils';

export type ViewRenderContext = {
  allComponents: Component[];
  byId: Map<string, Component>;
  effectiveLayout: Map<string, EffectiveLayout>;
  positionMap: Map<string, PositionValues>;
  /** Canvas-space bounds of a component (for relative child-window open placement). */
  getComponentCanvasRect?: (
    componentId: string,
  ) => { x: number; y: number; width: number; height: number } | null;
  /** Ruleset page template id — used to resolve child window displayScale from `RulesetWindow`. */
  sheetTemplatePageId?: string | null;
};

export function renderViewComponent(
  component: Component,
  characterAttributes?: CharacterAttribute[],
  position?: PositionValues,
  ctx?: ViewRenderContext,
): ReactNode {
  const componentData = getComponentData(component);

  switch (component.type) {
    case ComponentTypes.TEXT:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
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
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
          <ViewFrameNode key={component.id} component={component} />
        </WrapDecorators>
      );
    case ComponentTypes.GROUP:
      return (
        <WrapDecorators
          key={component.id}
          component={component}
          componentData={componentData}
          position={position}
          characterAttributes={characterAttributes}
          viewCtx={ctx}>
          <ViewGroupNode
            component={component}
            allComponents={ctx?.allComponents ?? []}
            effectiveLayout={ctx?.effectiveLayout}
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
        </WrapDecorators>
      );
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
