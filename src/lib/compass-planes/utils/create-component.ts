import type { Component } from '@/types';
import type { Container } from 'pixi.js';
import { drawShape } from '../components';
import { defaultComponentMap } from '../components/common/defaults';
import type { ComponentType } from '../types';

export function createComponent(
  parent: Container,
  type: ComponentType,
  x: number,
  y: number,
): Component | null {
  const comp = defaultComponentMap.get(type);
  if (!comp) {
    console.error(`Component type ${type} not found in default map`);
    return null;
  }
  comp.id = crypto.randomUUID();
  comp.x = x;
  comp.y = y;

  switch (type) {
    case 'shape':
      drawShape(parent, comp);
      break;
  }

  return comp;
}
