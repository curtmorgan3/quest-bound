import type { Component, ComponentData, ComponentStyle } from '@/types';
import type { Node } from '@xyflow/react';
import { useMemo } from 'react';
import {
  type PositionValues,
  STYLE_KEYS,
  usePositionValues,
  usePositionValuesMap,
  useStyleValues,
} from './use-style-values';

const componentDataCache = new Map<string, ComponentData>();
const componentStyleCache = new Map<string, ComponentStyle>();

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

export function getComponentData(component: Component): ComponentData {
  const key = component.data;
  const cached = componentDataCache.get(key);
  if (cached) return cached;

  const parsed = JSON.parse(key) as ComponentData;
  componentDataCache.set(key, parsed);
  return parsed;
}

export function updateComponentData(data: string, update: Record<any, any>): string {
  return JSON.stringify({
    ...JSON.parse(data),
    ...update,
  });
}

function applyStyleEnrichment(styles: ComponentStyle): ComponentStyle {
  if (styles.outlineWidth === 0) {
    styles.outline = undefined;
  } else {
    styles.outline = `${styles.outlineWidth}px solid ${styles.outlineColor}`;
  }

  styles.borderRadius = `${styles.borderRadiusTopLeft}px ${styles.borderRadiusTopRight}px ${styles.borderRadiusBottomRight}px ${styles.borderRadiusBottomLeft}px`;

  if (!styles.paddingBottom) styles.paddingBottom = 0;
  if (!styles.paddingTop) styles.paddingTop = 0;
  if (!styles.paddingLeft) styles.paddingLeft = 0;
  if (!styles.paddingRight) styles.paddingRight = 0;

  return styles;
}

export function getComponentStyles(component: Component): ComponentStyle {
  const key = component.style;
  const cached = componentStyleCache.get(key);
  if (cached) return cached;

  const styles = JSON.parse(key) as ComponentStyle;
  const enriched = applyStyleEnrichment(styles);
  componentStyleCache.set(key, enriched);
  return enriched;
}

export function useComponentStyles(component: Component | null): ComponentStyle {
  const styleValues = useStyleValues(component ? [component] : []);
  return useMemo(() => {
    if (!component) return {} as ComponentStyle;
    const styles = JSON.parse(component.style) as ComponentStyle;
    for (const key of STYLE_KEYS) {
      (styles as Record<string, unknown>)[key] = styleValues[key].resolved;
    }
    return applyStyleEnrichment(styles);
  }, [component, styleValues]);
}

export function useComponentPosition(component?: Component): PositionValues {
  if (!component) return { rotation: 0, height: 0, width: 0, z: 1 };
  return usePositionValues([component]);
}

export function useComponentPositionMap(components: Component[]): Map<string, PositionValues> {
  return usePositionValuesMap(components);
}
