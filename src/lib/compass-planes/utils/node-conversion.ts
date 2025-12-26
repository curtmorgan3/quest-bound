import type { Component, ComponentStyle, ShapeComponentData } from '@/types';
import type { Node } from '@xyflow/react';

export function convertComponentsToNodes(components: Component[]): Node[] {
  return components.map((component) => {
    return {
      id: component.id,
      position: { x: component.x, y: component.y },
      type: component.type,
      data: {
        label: `${component.type}-${component.id}`,
        ...component,
      },
    };
  });
}

export function getComponentData(component: Component): ShapeComponentData {
  const data = JSON.parse(component.data);

  return data as ShapeComponentData;
}

export function getComponentStyles(component: Component): ComponentStyle {
  return JSON.parse(component.style) as ComponentStyle;
}
