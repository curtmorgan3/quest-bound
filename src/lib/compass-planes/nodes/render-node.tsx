import type { Component } from '@/types';
import { ComponentTypes } from '../nodes';
import {
  ViewCheckboxNode,
  ViewImageNode,
  ViewInputNode,
  ViewShapeNode,
  ViewTextNode,
} from '../nodes/components';

export const renderViewComponent = (component: Component) => {
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
    default:
      console.warn(`Attempted to render an unregistered view component: `, component.type);
      return null;
  }
};
