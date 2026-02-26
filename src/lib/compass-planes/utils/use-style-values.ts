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

export function useStyleValues(components: Array<Component>): StyleValues {
  const characterContext = useContext(CharacterContext);
  const character = characterContext?.character ?? null;
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  return useMemo(() => {
    const result = {} as StyleValues;
    for (const key of STYLE_KEYS) {
      const raw = valueIfAllAreEqual(components, key);
      const resolved = resolveCustomProp(raw, character, customProperties);
      result[key] = { raw, resolved };
    }
    return result;
  }, [components, character, customProperties]);
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

  return useMemo(() => {
    const result = {} as PositionValues;
    for (const key of POSITION_KEYS) {
      const raw = valueIfAllAreEqual(components, key);
      const resolved = resolveCustomProp(raw, character, customProperties);
      result[key] = toPositionNumber(resolved);
    }
    return result;
  }, [components, character, customProperties]);
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

  return useMemo(() => {
    const map = new Map<string, PositionValues>();
    for (const component of components) {
      map.set(
        component.id,
        getPositionValuesForComponent(component, character, customProperties),
      );
    }
    return map;
  }, [components, character, customProperties]);
}
