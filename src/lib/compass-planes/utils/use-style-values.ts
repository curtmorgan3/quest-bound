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
  'color',
  'borderRadiusTopLeft',
  'borderRadiusTopRight',
  'borderRadiusBottomLeft',
  'borderRadiusBottomRight',
  'outlineWidth',
  'outlineColor',
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

/** Parse linear-gradient(angle deg, color1, color2) and resolve custom props in colors. */
function resolveGradient(
  raw: string,
  character: { customProperties?: Record<string, string | number | boolean> } | null,
  customProperties: Array<{ id: string; defaultValue?: string | number | boolean }>,
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
  const color1 = String(
    resolveCustomProp(color1Raw, character, customProperties),
  );
  const color2 = String(
    resolveCustomProp(color2Raw, character, customProperties),
  );
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
    for (const key of STYLE_KEYS) {
      const raw = valueIfAllAreEqual(components, key);
      let resolved: string | number;
      if (
        (key === 'backgroundColor' || key === 'color') &&
        typeof raw === 'string' &&
        raw.trim().startsWith('linear-gradient(')
      ) {
        resolved = resolveGradient(raw, character, customProperties);
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
      const raw = valueIfAllAreEqual(components, key);
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
