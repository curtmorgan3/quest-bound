import type { Component } from '@/types';

/** Returns the background style: `background` for gradients, `backgroundColor` for solid. */
export function getBackgroundStyle(css: {
  background?: string;
  backgroundColor?: string;
}): Record<string, string> {
  if (css.background) return { background: css.background };
  if (css.backgroundColor) return { backgroundColor: css.backgroundColor };
  return {};
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

export function valueIfAllAreEqual(components: Array<Component>, key: string): string | number {
  if (!components.length) return '-';

  if (components.length === 1 && components[0].locked && key !== 'locked') return '-';

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
