import type { Component } from '@/types';

export function valueIfAllAreEqual(components: Array<Component>, key: string) {
  if (!components.length) return '-';
  const val = components[0][key as keyof (typeof components)[0]];

  if (val === undefined) return '-';

  for (const component of components) {
    const comparedVal = component[key as keyof typeof component];
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
