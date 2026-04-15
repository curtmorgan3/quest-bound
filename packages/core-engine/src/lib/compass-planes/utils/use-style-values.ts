import { useActiveRuleset, useCustomProperties } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';
import { useContext, useMemo } from 'react';
import { valueIfAllAreEqual } from './style-utils';

const CUSTOM_PROP_PREFIX = 'custom-prop-';

function isCustomPropValue(value: string | number): value is string {
  return typeof value === 'string' && value.startsWith(CUSTOM_PROP_PREFIX);
}

export const STYLE_KEYS = [
  'opacity',
  'backgroundColor',
  'backgroundColorCustomPropOpacity',
  'backgroundColorGradientStop1CustomPropOpacity',
  'backgroundColorGradientStop2CustomPropOpacity',
  'color',
  'colorCustomPropOpacity',
  'colorGradientStop1CustomPropOpacity',
  'colorGradientStop2CustomPropOpacity',
  'borderRadiusTopLeft',
  'borderRadiusTopRight',
  'borderRadiusBottomLeft',
  'borderRadiusBottomRight',
  'outlineWidth',
  'outlineColor',
  'outlineColorCustomPropOpacity',
  'boxShadowOffsetX',
  'boxShadowOffsetY',
  'boxShadowBlur',
  'boxShadowSpread',
  'boxShadowColor',
  'boxShadowColorCustomPropOpacity',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
] as const;

export const POSITION_KEYS = ['height', 'width', 'rotation', 'z'] as const;

export type StyleKey = (typeof STYLE_KEYS)[number];

export type PositionKey = (typeof POSITION_KEYS)[number];

export type PositionValues = {
  [K in PositionKey]: number;
};

export type StyleValueEntry = {
  raw: string | number;
  resolved: string | number;
};

export type StyleValues = {
  [K in StyleKey]: StyleValueEntry;
};

function resolveCustomProp(
  raw: string | number,
  character: { customProperties?: Record<string, string | number | boolean> } | null,
  customProperties: Array<{ id: string; defaultValue?: string | number | boolean }>,
): string | number {
  if (!isCustomPropValue(raw)) return raw;

  const id = raw.slice(CUSTOM_PROP_PREFIX.length);

  const characterValue = character?.customProperties?.[id];
  if (characterValue !== undefined) {
    return typeof characterValue === 'boolean' ? (characterValue ? 1 : 0) : characterValue;
  }

  const cp = customProperties.find((p) => p.id === id);
  if (cp?.defaultValue !== undefined) {
    const v = cp.defaultValue;
    return typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }

  return raw;
}

/** Convert resolved color (hex or rgb/rgba) to rgba with given alpha (0–1). */
function applyOpacityToColor(resolved: string, alpha: number): string {
  const s = String(resolved).trim();
  const a = Math.min(1, Math.max(0, alpha));
  const hexMatch = s.match(/^#([0-9A-Fa-f]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  const rgbaMatch = s.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${a})`;
  }
  return s;
}

/** Parse linear-gradient(angle deg, color1, color2) and resolve custom props in colors. */
function resolveGradient(
  raw: string,
  character: { customProperties?: Record<string, string | number | boolean> } | null,
  customProperties: Array<{ id: string; defaultValue?: string | number | boolean }>,
  stop1Opacity?: number,
  stop2Opacity?: number,
): string {
  const s = raw.trim();
  if (!s.startsWith('linear-gradient(')) return raw;
  const inner = s.slice('linear-gradient('.length, -1).trim();
  const color2Match = inner.match(/,\s*([^,)]+)\s*$/);
  if (!color2Match) return raw;
  const color2Raw = color2Match[1].trim();
  const rest = inner.slice(0, color2Match.index).trim();
  const angleMatch = rest.match(/^(\d+)\s*deg\s*,\s*(.+)$/);
  if (!angleMatch) return raw;
  const angle = angleMatch[1];
  const color1Raw = angleMatch[2].trim();
  let color1 = String(
    resolveCustomProp(color1Raw, character, customProperties),
  );
  let color2 = String(
    resolveCustomProp(color2Raw, character, customProperties),
  );
  if (isCustomPropValue(color1Raw) && typeof stop1Opacity === 'number') {
    color1 = applyOpacityToColor(color1, stop1Opacity);
  }
  if (isCustomPropValue(color2Raw) && typeof stop2Opacity === 'number') {
    color2 = applyOpacityToColor(color2, stop2Opacity);
  }
  return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}

function makeStyleSignature(components: Array<Component>): string {
  if (!components.length) return '';
  return components
    .map((c) => `${c.id}:${c.style}:${c.locked ? '1' : '0'}`)
    .join('|');
}

export function useStyleValues(components: Array<Component>): StyleValues {
  const characterContext = useContext(CharacterContext);
  const character = characterContext?.character ?? null;
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  const componentsKey = useMemo(
    () => makeStyleSignature(components),
    [components],
  );

  return useMemo(() => {
    const result = {} as StyleValues;
    const getRaw = (k: string) => valueIfAllAreEqual(components, k, true);
    for (const key of STYLE_KEYS) {
      const raw = getRaw(key);
      let resolved: string | number;
      if (
        (key === 'backgroundColor' || key === 'color') &&
        typeof raw === 'string' &&
        raw.trim().startsWith('linear-gradient(')
      ) {
        const stop1 =
          key === 'backgroundColor'
            ? getRaw('backgroundColorGradientStop1CustomPropOpacity')
            : getRaw('colorGradientStop1CustomPropOpacity');
        const stop2 =
          key === 'backgroundColor'
            ? getRaw('backgroundColorGradientStop2CustomPropOpacity')
            : getRaw('colorGradientStop2CustomPropOpacity');
        const stop1Opacity =
          stop1 !== '-' && typeof stop1 === 'number' ? stop1 : undefined;
        const stop2Opacity =
          stop2 !== '-' && typeof stop2 === 'number' ? stop2 : undefined;
        resolved = resolveGradient(
          raw,
          character,
          customProperties,
          stop1Opacity,
          stop2Opacity,
        );
      } else if (
        (key === 'backgroundColor' ||
          key === 'color' ||
          key === 'outlineColor' ||
          key === 'boxShadowColor') &&
        typeof raw === 'string' &&
        isCustomPropValue(raw)
      ) {
        const opacityKey =
          key === 'backgroundColor'
            ? 'backgroundColorCustomPropOpacity'
            : key === 'color'
              ? 'colorCustomPropOpacity'
              : key === 'outlineColor'
                ? 'outlineColorCustomPropOpacity'
                : 'boxShadowColorCustomPropOpacity';
        resolved = resolveCustomProp(raw, character, customProperties);
        const opacityRaw = getRaw(opacityKey);
        if (
          opacityRaw !== '-' &&
          typeof opacityRaw === 'number' &&
          typeof resolved === 'string'
        ) {
          resolved = applyOpacityToColor(resolved, opacityRaw);
        }
      } else if (
        key.endsWith('CustomPropOpacity') ||
        key.endsWith('GradientStop1CustomPropOpacity') ||
        key.endsWith('GradientStop2CustomPropOpacity')
      ) {
        resolved = raw;
      } else {
        resolved = resolveCustomProp(raw, character, customProperties);
      }
      result[key] = { raw, resolved };
    }
    return result;
  }, [componentsKey, components, character, customProperties]);
}

function toPositionNumber(value: string | number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function usePositionValues(components: Array<Component>): PositionValues {
  const characterContext = useContext(CharacterContext);
  const character = characterContext?.character ?? null;
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  const componentsKey = useMemo(
    () =>
      components
        .map(
          (c) =>
            `${c.id}:${c.x}:${c.y}:${c.height}:${c.width}:${c.rotation}:${c.z}`,
        )
        .join('|'),
    [components],
  );

  return useMemo(() => {
    const result = {} as PositionValues;
    for (const key of POSITION_KEYS) {
      const raw = valueIfAllAreEqual(components, key, true);
      const resolved = resolveCustomProp(raw, character, customProperties);
      result[key] = toPositionNumber(resolved);
    }
    return result;
  }, [componentsKey, components, character, customProperties]);
}

function getPositionValuesForComponent(
  component: Component,
  character: { customProperties?: Record<string, string | number | boolean> } | null,
  customProperties: Array<{ id: string; defaultValue?: string | number | boolean }>,
): PositionValues {
  const result = {} as PositionValues;
  for (const key of POSITION_KEYS) {
    const raw = component[key as keyof Component] as string | number;
    const resolved = resolveCustomProp(raw, character, customProperties);
    result[key] = toPositionNumber(resolved);
  }
  return result;
}

export function usePositionValuesMap(components: Array<Component>): Map<string, PositionValues> {
  const characterContext = useContext(CharacterContext);
  const character = characterContext?.character ?? null;
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  const componentsKey = useMemo(
    () =>
      components
        .map(
          (c) =>
            `${c.id}:${c.x}:${c.y}:${c.height}:${c.width}:${c.rotation}:${c.z}`,
        )
        .join('|'),
    [components],
  );

  return useMemo(() => {
    const map = new Map<string, PositionValues>();
    for (const component of components) {
      map.set(
        component.id,
        getPositionValuesForComponent(component, character, customProperties),
      );
    }
    return map;
  }, [componentsKey, components, character, customProperties]);
}
