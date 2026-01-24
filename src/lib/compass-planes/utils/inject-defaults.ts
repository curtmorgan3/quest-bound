import { ComponentTypes } from '@/lib/compass-planes/nodes';
import type { Component } from '@/types';
import {
  DEFAULT_CHECKBOX,
  DEFAULT_IMAGE,
  DEFAULT_INPUT,
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
    [ComponentTypes.INPUT, DEFAULT_INPUT],
    [ComponentTypes.CHECKBOX, DEFAULT_CHECKBOX],
  ]);

  const defaults = defaultMap.get(component.type as ComponentTypes);

  return {
    ...defaults,
    ...component,
  };
}
