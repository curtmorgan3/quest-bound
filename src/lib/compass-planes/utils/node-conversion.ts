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

/** Box-shadow distances may be unresolved custom-prop tokens (strings) — coerce to finite px scalars. */
function toStyleShadowDistancePx(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return 0;
    const direct = Number(t);
    if (Number.isFinite(direct)) return direct;
    const pf = parseFloat(t);
    return Number.isFinite(pf) ? pf : 0;
  }
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function applyStyleEnrichment(styles: ComponentStyle): ComponentStyle {
  const out = { ...styles } as ComponentStyle & Record<string, unknown>;

  if (out.outlineWidth === 0) {
    out.outline = undefined;
  } else {
    out.outline = `${out.outlineWidth}px solid ${out.outlineColor}`;
  }

  out.borderRadius = `${out.borderRadiusTopLeft}px ${out.borderRadiusTopRight}px ${out.borderRadiusBottomRight}px ${out.borderRadiusBottomLeft}px`;

  if (!out.paddingBottom) out.paddingBottom = 0;
  if (!out.paddingTop) out.paddingTop = 0;
  if (!out.paddingLeft) out.paddingLeft = 0;
  if (!out.paddingRight) out.paddingRight = 0;

  if (isLinearGradient(out.backgroundColor)) {
    out.background = out.backgroundColor;
  }

  if (isLinearGradient(out.color)) {
    out.colorStyle = {
      background: out.color,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
    };
  }

  const sx = toStyleShadowDistancePx(out.boxShadowOffsetX);
  const sy = toStyleShadowDistancePx(out.boxShadowOffsetY);
  const sblur = toStyleShadowDistancePx(out.boxShadowBlur);
  const sspread = toStyleShadowDistancePx(out.boxShadowSpread);
  if (sx !== 0 || sy !== 0 || sblur !== 0 || sspread !== 0) {
    const c =
      typeof out.boxShadowColor === 'string' && out.boxShadowColor.trim() !== ''
        ? out.boxShadowColor
        : 'rgba(0,0,0,0.35)';
    out.boxShadow = `${sx}px ${sy}px ${sblur}px ${sspread}px ${c}`;
  } else {
    delete (out as { boxShadow?: string }).boxShadow;
  }

  return out as ComponentStyle;
}

export function getComponentStyles(component: Component): ComponentStyle {
  const key = component.style;
  const cached = componentStyleCache.get(key);
  if (cached) return structuredClone(cached);

  const styles = JSON.parse(key) as ComponentStyle;
  const enriched = applyStyleEnrichment(styles);
  componentStyleCache.set(key, enriched);
  return structuredClone(enriched);
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
