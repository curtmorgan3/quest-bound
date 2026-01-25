import type { CharacterAttribute, Component } from '@/types';
import { ComponentTypes } from '../nodes';
import {
  ViewCheckboxNode,
  ViewContentNode,
  ViewImageNode,
  ViewInputNode,
  ViewShapeNode,
  ViewTextNode,
} from '../nodes/components';
import { getComponentData } from '../utils';

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
      return <ViewTextNode key={component.id} component={component} />;
    case ComponentTypes.SHAPE:
      return <ViewShapeNode key={component.id} component={component} />;
    case ComponentTypes.IMAGE:
      return <ViewImageNode key={component.id} component={component} />;
    case ComponentTypes.INPUT:
      return <ViewInputNode key={component.id} component={component} />;
    case ComponentTypes.CHECKBOX:
      return <ViewCheckboxNode key={component.id} component={component} />;
    case ComponentTypes.CONTENT:
      return <ViewContentNode key={component.id} component={component} />;
    default:
      console.warn(`Attempted to render an unregistered view component: `, component.type);
      return null;
  }
};
