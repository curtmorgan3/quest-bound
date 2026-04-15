import type { Component } from '@/types';
import { DEFAULT_CHECKBOX } from '../nodes/components/checkbox/checkbox-config';
import { REQUIRED_COMPONENT_FIELDS } from '../nodes/components/common';
import { DEFAULT_CONTENT } from '../nodes/components/content/content-config';
import { DEFAULT_FRAME } from '../nodes/components/frame/frame-config';
import { DEFAULT_GRAPH } from '../nodes/components/graph/graph-config';
import { DEFAULT_CONTAINER } from '../nodes/components/container/container-config';
import { DEFAULT_GROUP } from '../nodes/components/group/group-config';
import { DEFAULT_IMAGE } from '../nodes/components/image/image-config';
import { DEFAULT_INPUT } from '../nodes/components/input/input-config';
import { DEFAULT_INVENTORY } from '../nodes/components/inventory/inventory-config';
import { DEFAULT_SHAPE } from '../nodes/components/shape/shape-config';
import { DEFAULT_TEXT } from '../nodes/components/text/text-config';
import { ComponentTypes } from '../nodes/node-types';

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
    [ComponentTypes.CONTAINER, DEFAULT_CONTAINER],
  ]);

  const defaults = defaultMap.get(component.type as ComponentTypes);

  return {
    ...defaults,
    states: '[]',
    ...component,
  };
}
