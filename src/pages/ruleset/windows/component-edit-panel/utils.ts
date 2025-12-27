import type { Component } from '@/types';

export function valueIfAllAreEqual(components: Array<Component>, key: string) {
  if (!components.length) return '-';

  if (components.length === 1 && components[0].locked && key !== 'locked') return '-';

  let val = components[0][key as keyof (typeof components)[0]];

  if (val === undefined) {
    const style = JSON.parse(components[0].style);
    val = style[key];
  }

  if (val === undefined) return '-';

  for (const component of components) {
    let comparedVal = component[key as keyof typeof component];

    if (comparedVal === undefined) {
      const style = JSON.parse(component.style);
      comparedVal = style[key];
    }

    if (val !== comparedVal) {
      return '-';
    }
  }

  return val as number | string;
}

export function parseValue(val: string | number) {
  let parsedVal = parseFloat(val.toString());
  if (isNaN(parsedVal)) {
    parsedVal = 0;
  }
  return parsedVal;
}
