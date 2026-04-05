import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import type { Component } from '@/types';

/**
 * CSS size when `takeFullWidth` / `takeFullHeight` is true: viewport units on the sheet root,
 * `100%` when the component is nested under a parent `group` so it fills the group’s box.
 */
export function takeFullWidthCss(
  component: Component,
  getParent?: (id: string) => Component | null,
): '100dvw' | '100%' {
  if (component.parentComponentId == null) return '100dvw';
  const parent = getParent?.(component.parentComponentId);
  if (parent == null) return '100%';
  return parent.type === ComponentTypes.GROUP ? '100%' : '100dvw';
}

export function takeFullHeightCss(
  component: Component,
  getParent?: (id: string) => Component | null,
): '100dvh' | '100%' {
  if (component.parentComponentId == null) return '100dvh';
  const parent = getParent?.(component.parentComponentId);
  if (parent == null) return '100%';
  return parent.type === ComponentTypes.GROUP ? '100%' : '100dvh';
}
