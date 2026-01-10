import { ComponentTypes } from '@/lib/compass-planes/nodes';
import type { Component } from '@/types';
import {
  DEFAULT_IMAGE,
  DEFAULT_SHAPE,
  DEFAULT_TEXT,
  REQUIRED_COMPONENT_FIELDS,
} from '../nodes/components';

export function injectDefaultComponent(component: Partial<Component>) {
  for (const required of REQUIRED_COMPONENT_FIELDS) {
    if (!component[required]) {
      console.error(`Missing required field for component creation: ${required}`);
      return;
    }
  }

  const defaultMap = new Map([
    [ComponentTypes.SHAPE, DEFAULT_SHAPE],
    [ComponentTypes.TEXT, DEFAULT_TEXT],
    [ComponentTypes.IMAGE, DEFAULT_IMAGE],
  ]);

  const defaults = defaultMap.get(component.type as ComponentTypes);

  return {
    ...defaults,
    ...component,
  };
}
