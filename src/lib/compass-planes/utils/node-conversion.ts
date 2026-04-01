import { CharacterContext } from '@/stores';
import type { Component, ComponentData, ComponentStyle } from '@/types';
import { useContext, useMemo } from 'react';
import { parseComponentDataJson } from './component-data-json';
import {
  type PositionValues,
  STYLE_KEYS,
  usePositionValues,
  usePositionValuesMap,
  useStyleValues,
} from './use-style-values';

const componentStyleCache = new Map<string, ComponentStyle>();

/**
 * Legacy node shape historically aligned with React Flow; kept for conversion helpers and tests.
 */
export type ComponentCanvasNode = {
  id: string;
  position: { x: number; y: number };
  type: string;
  zIndex: number;
  selected?: boolean;
  data: Component & { label: string };
};

export function convertComponentToNode(component: Component): ComponentCanvasNode {
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

export function convertComponentsToNodes(components: Component[]): ComponentCanvasNode[] {
  return components.map((component) => {
    return convertComponentToNode(component);
  });
}

export function getComponentData(component: Component): ComponentData {
  return parseComponentDataJson(component);
}

export function updateComponentData(data: string, update: Record<any, any>): string {
  return JSON.stringify({
    ...JSON.parse(data),
    ...update,
  });
}

function isLinearGradient(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().startsWith('linear-gradient(');
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

  if (isLinearGradient(styles.backgroundColor)) {
    (styles as Record<string, unknown>).background = styles.backgroundColor;
  }

  if (isLinearGradient(styles.color)) {
    (styles as Record<string, unknown>).colorStyle = {
      background: styles.color,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
    };
  }

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
  const characterContext = useContext(CharacterContext);
  const character = characterContext?.character ?? null;

  return useMemo(() => {
    if (!component) return {} as ComponentStyle;
    const styles = JSON.parse(component.style) as ComponentStyle;
    for (const key of STYLE_KEYS) {
      (styles as Record<string, unknown>)[key] = styleValues[key].resolved;
    }
    const referenceLabel = getComponentData(component).referenceLabel;
    if (referenceLabel && character?.componentStyleOverrides?.[referenceLabel]) {
      Object.assign(styles, character.componentStyleOverrides[referenceLabel]);
    }
    return applyStyleEnrichment(styles);
  }, [component, styleValues, character]);
}

export function useComponentPosition(component?: Component): PositionValues {
  if (!component) return { rotation: 0, height: 0, width: 0, z: 1 };
  return usePositionValues([component]);
}

export function useComponentPositionMap(components: Component[]): Map<string, PositionValues> {
  return usePositionValuesMap(components);
}
