import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import { DEFAULT_CHECKBOX } from '@/lib/compass-planes/nodes/components/checkbox/checkbox-config';
import { DEFAULT_CONTENT } from '@/lib/compass-planes/nodes/components/content/content-config';
import { DEFAULT_FRAME } from '@/lib/compass-planes/nodes/components/frame/frame-config';
import { DEFAULT_GRAPH } from '@/lib/compass-planes/nodes/components/graph/graph-config';
import { DEFAULT_CONTAINER } from '@/lib/compass-planes/nodes/components/container/container-config';
import { DEFAULT_GROUP } from '@/lib/compass-planes/nodes/components/group/group-config';
import { DEFAULT_IMAGE } from '@/lib/compass-planes/nodes/components/image/image-config';
import { DEFAULT_INPUT } from '@/lib/compass-planes/nodes/components/input/input-config';
import { DEFAULT_INVENTORY } from '@/lib/compass-planes/nodes/components/inventory/inventory-config';
import { DEFAULT_SHAPE } from '@/lib/compass-planes/nodes/components/shape/shape-config';
import { DEFAULT_TEXT } from '@/lib/compass-planes/nodes/components/text/text-config';
import type { Component } from '@/types';

const DEFAULT_BY_TYPE: Record<ComponentTypes, Partial<Component>> = {
  [ComponentTypes.TEXT]: DEFAULT_TEXT,
  [ComponentTypes.SHAPE]: DEFAULT_SHAPE,
  [ComponentTypes.IMAGE]: DEFAULT_IMAGE,
  [ComponentTypes.INPUT]: DEFAULT_INPUT,
  [ComponentTypes.CHECKBOX]: DEFAULT_CHECKBOX,
  [ComponentTypes.CONTENT]: DEFAULT_CONTENT,
  [ComponentTypes.INVENTORY]: DEFAULT_INVENTORY,
  [ComponentTypes.GRAPH]: DEFAULT_GRAPH,
  [ComponentTypes.FRAME]: DEFAULT_FRAME,
  [ComponentTypes.GROUP]: DEFAULT_GROUP,
  [ComponentTypes.CONTAINER]: DEFAULT_CONTAINER,
};

export function defaultPartialForComponentType(type: ComponentTypes): Partial<Component> {
  const d = DEFAULT_BY_TYPE[type];
  return d ? { ...d } : {};
}

export function isComponentTypesValue(s: string): s is ComponentTypes {
  return (Object.values(ComponentTypes) as string[]).includes(s);
}
