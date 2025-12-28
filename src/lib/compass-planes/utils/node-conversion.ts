import type { Component, ComponentStyle, ShapeComponentData } from '@/types';
import type { Node } from '@xyflow/react';

export function convertComponentToNode(component: Component): Node {
  return {
    id: component.id,
    position: { x: component.x, y: component.y },
    type: component.type,
    zIndex: component.z,
    selected: component.selected,
    data: {
      label: `${component.type}-${component.id}`,
      ...component,
    },
  };
}

export function convertComponentsToNodes(components: Component[]): Node[] {
  return components.map((component) => {
    return convertComponentToNode(component);
  });
}

export function getComponentData(component: Component): ShapeComponentData {
  const data = JSON.parse(component.data);

  return data as ShapeComponentData;
}

export function getComponentStyles(component: Component): ComponentStyle {
  const styles = JSON.parse(component.style) as ComponentStyle;

  if (styles.outlineWidth === 0) {
    styles.outline = undefined;
  } else {
    styles.outline = `${styles.outlineWidth}px solid ${styles.outlineColor}`;
  }

  styles.borderRadius = `${styles.borderRadiusTopLeft}px ${styles.borderRadiusTopRight}px ${styles.borderRadiusBottomRight}px ${styles.borderRadiusBottomLeft}px`;

  return styles;
}
