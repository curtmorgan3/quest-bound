import type { Component } from '@/types';
import { DEFAULT_SHAPE, REQUIRED_COMPONENT_FIELDS } from './components';

export function injectDefaultComponent(component: Partial<Component>) {
  for (const required of REQUIRED_COMPONENT_FIELDS) {
    if (!component[required]) {
      console.error(`Missing required field for component creation: ${required}`);
      return;
    }
  }

  return {
    ...DEFAULT_SHAPE,
    ...component,
  };
}
