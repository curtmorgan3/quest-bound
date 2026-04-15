import type { Component } from '@quest-bound/types';
import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';

export const SHEET_UI_LAYOUT_KEYS = new Set([
  'x',
  'y',
  'z',
  'width',
  'height',
  'rotation',
]);

/** Keys that map to parsed `Component.style` JSON (flat API). */
export const SHEET_UI_STYLE_KEYS = new Set([
  'backgroundColor',
  'background',
  'backgroundColorCustomPropOpacity',
  'backgroundColorGradientStop1CustomPropOpacity',
  'backgroundColorGradientStop2CustomPropOpacity',
  'opacity',
  'outline',
  'borderRadius',
  'borderRadiusTopLeft',
  'borderRadiusTopRight',
  'borderRadiusBottomLeft',
  'borderRadiusBottomRight',
  'outlineWidth',
  'outlineColor',
  'outlineColorCustomPropOpacity',
  'boxShadow',
  'boxShadowOffsetX',
  'boxShadowOffsetY',
  'boxShadowBlur',
  'boxShadowSpread',
  'boxShadowColor',
  'boxShadowColorCustomPropOpacity',
  'paddingRight',
  'paddingLeft',
  'paddingTop',
  'paddingBottom',
  'flexDirection',
  'flexWrap',
  'gap',
  'alignItems',
  'justifyContent',
  'color',
  'colorCustomPropOpacity',
  'colorGradientStop1CustomPropOpacity',
  'colorGradientStop2CustomPropOpacity',
  'colorStyle',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'textDecoration',
  'textAlign',
  'verticalAlign',
  'lineHeight',
]);

export type FlatKeyTarget = 'layout' | 'style' | 'data' | 'ignore';

export function classifyFlatKey(key: string, component: Component): FlatKeyTarget {
  if (key === 'window') return 'ignore';
  if (SHEET_UI_LAYOUT_KEYS.has(key)) return 'layout';
  if (key === 'type') {
    return component.type === ComponentTypes.INPUT ? 'data' : 'ignore';
  }
  if (SHEET_UI_STYLE_KEYS.has(key)) return 'style';
  return 'data';
}
