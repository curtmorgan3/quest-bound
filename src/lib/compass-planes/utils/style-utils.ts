import type { Component } from '@/types';

/** Returns the background style: `background` for gradients, `backgroundColor` for solid. */
export function getBackgroundStyle(css: {
  background?: string;
  backgroundColor?: string;
  boxShadow?: string;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (css.background) out.background = css.background;
  else if (css.backgroundColor) out.backgroundColor = css.backgroundColor;
  if (css.boxShadow) out.boxShadow = css.boxShadow;
  return out;
}

/** Returns the color style: gradient text styles or solid color. */
export function getColorStyle(css: {
  color?: string;
  colorStyle?: Record<string, string | number>;
}): Record<string, string | number> {
  if (css.colorStyle) return css.colorStyle;
  if (css.color) return { color: css.color };
  return {};
}

/** Parse linear-gradient(angle deg, color1, color2) and return the first color. For SVG/stroke fallback. */
function parseFirstGradientColor(value: string): string | null {
  const s = value.trim();
  if (!s.startsWith('linear-gradient(')) return null;
  const inner = s.slice('linear-gradient('.length, -1).trim();
  const color2Match = inner.match(/,\s*([^,)]+)\s*$/);
  if (!color2Match) return null;
  const rest = inner.slice(0, color2Match.index).trim();
  const angleMatch = rest.match(/^\d+\s*deg\s*,\s*(.+)$/);
  return angleMatch ? angleMatch[1].trim() : null;
}

function isLinearGradient(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().startsWith('linear-gradient(');
}

/** Parse linear-gradient(angle deg, color1, color2). Returns null if not a valid gradient. */
export function parseLinearGradient(
  value: string,
): { angle: number; color1: string; color2: string } | null {
  const s = value.trim();
  if (!s.startsWith('linear-gradient(')) return null;
  const inner = s.slice('linear-gradient('.length, -1).trim();
  const color2Match = inner.match(/,\s*([^,)]+)\s*$/);
  if (!color2Match) return null;
  const color2 = color2Match[1].trim();
  const rest = inner.slice(0, color2Match.index).trim();
  const angleMatch = rest.match(/^(\d+)\s*deg\s*,\s*(.+)$/);
  if (!angleMatch) return null;
  return {
    angle: Math.min(360, Math.max(0, parseInt(angleMatch[1], 10))),
    color1: angleMatch[2].trim(),
    color2,
  };
}

/** Returns style for a fill area: `background` for gradient, `backgroundColor` for solid. */
export function getFillStyle(colorValue: string | undefined): Record<string, string> {
  if (!colorValue) return {};
  if (isLinearGradient(colorValue)) return { background: colorValue };
  return { backgroundColor: colorValue };
}

/** When value is a gradient, return the first color for SVG/stroke fallback. Otherwise return the value. */
export function getSolidFallback(value: string | undefined): string | undefined {
  if (!value) return value;
  const first = parseFirstGradientColor(value);
  return first ?? value;
}

function getStyleFromComponent(component: Component): Record<string, unknown> {
  try {
    return JSON.parse(component.style) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function valueIfAllAreEqual(
  components: Array<Component>,
  key: string,
  ignoreLock = false,
): string | number {
  if (!components.length) return '-';

  if (!ignoreLock && components.length === 1 && components[0].locked && key !== 'locked')
    return '-';

  let val = components[0][key as keyof (typeof components)[0]];

  if (val === undefined) {
    const style = getStyleFromComponent(components[0]);
    val = style[key] as string | number;
  }

  if (val === undefined) return '-';

  for (const component of components) {
    let comparedVal = component[key as keyof typeof component];

    if (comparedVal === undefined) {
      const style = getStyleFromComponent(component);
      comparedVal = style[key] as string | number;
    }

    if (val !== comparedVal) {
      return '-';
    }
  }

  return val as number | string;
}
