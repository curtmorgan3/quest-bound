import type { Component } from '@/types';

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
