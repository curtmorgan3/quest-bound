import type { Component } from '@/types';
import type { Node } from '@xyflow/react';

export function convertComponentsToNodes(components: Component[]): Node[] {
  return components.map((component) => {
    return {
      id: component.id,
      position: { x: component.x, y: component.y },
      data: {
        label: `${component.type}-${component.id}`,
        ...component,
      },
    };
  });
}
