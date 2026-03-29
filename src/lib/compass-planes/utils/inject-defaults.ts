import { ComponentTypes } from '@/lib/compass-planes/nodes';
import type { Component } from '@/types';
import {
  DEFAULT_CHECKBOX,
  DEFAULT_CONTENT,
  DEFAULT_FRAME,
  DEFAULT_GRAPH,
  DEFAULT_GROUP,
  DEFAULT_IMAGE,
  DEFAULT_INPUT,
  DEFAULT_INVENTORY,
  DEFAULT_SHAPE,
  DEFAULT_TEXT,
  REQUIRED_COMPONENT_FIELDS,
} from '../nodes/components';

export function injectDefaultComponent(component: Partial<Component>) {
  for (const required of REQUIRED_COMPONENT_FIELDS) {
    const v = component[required];
    // Allow x/y === 0 (valid canvas origin); reject only nullish / empty type.
    if (v === undefined || v === null || v === '') {
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
    [ComponentTypes.CONTENT, DEFAULT_CONTENT],
    [ComponentTypes.INVENTORY, DEFAULT_INVENTORY],
    [ComponentTypes.GRAPH, DEFAULT_GRAPH],
    [ComponentTypes.FRAME, DEFAULT_FRAME],
    [ComponentTypes.GROUP, DEFAULT_GROUP],
  ]);

  const defaults = defaultMap.get(component.type as ComponentTypes);

  return {
    ...defaults,
    ...component,
  };
}
