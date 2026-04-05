import type { CSSProperties } from 'react';

import type { Component, ComponentStyle } from '@/types';

import { isGroupLikeComponentType } from '../nodes/node-types';
import { getComponentData } from '../utils';

/**
 * Closest `group` ancestor of `c` that is selected (and unlocked), or null.
 * When the user drags a child inside a selected group, the drag targets that group, not a further-out ancestor.
 */
export function deepestSelectedAncestorGroup(
  c: Component,
  components: Component[],
  byId: Map<string, Component>,
): Component | null {
  const selectedGroupIds = new Set(
    components
      .filter((x) => x.selected && !x.locked && isGroupLikeComponentType(x.type))
      .map((x) => x.id),
  );
  if (selectedGroupIds.size === 0) return null;

  let walk: Component | null = c;
  while (walk != null) {
    const pid = walk.parentComponentId;
    if (pid == null) break;
    const p = byId.get(pid);
    if (p == null) break;
    if (selectedGroupIds.has(p.id)) {
      return p;
    }
    walk = p;
  }
  return null;
}

/**
 * Outermost (closest to the canvas root) `group` ancestor of `c`, or null if `c` is not under any group.
 * Used when dragging an unselected nested item so the whole stack moves together.
 */
export function outermostGroupRoot(c: Component, byId: Map<string, Component>): Component | null {
  let top: Component | null = null;
  let cur: Component | null = c;
  while (cur != null) {
    const pid = cur.parentComponentId;
    if (pid == null) break;
    const p = byId.get(pid);
    if (p == null) break;
    if (isGroupLikeComponentType(p.type)) {
      top = p;
    }
    cur = p;
  }
  return top;
}

export function isFlexLayoutGroup(component: Component): boolean {
  return getComponentData(component).layoutMode === 'flex';
}

/**
 * True when this row is positioned on the sheet canvas root (no `parentComponentId`).
 * Nested components are rendered inside their parent group so they move with flex-laid-out parents.
 */
export function isCanvasRootComponent(component: Component): boolean {
  return !component.parentComponentId;
}

/** Direct children of `groupId`, sorted by stored `y` then `x` (canvas “top”). */
export function directChildrenSortedByTop(components: Component[], groupId: string): Component[] {
  return components
    .filter((c) => c.parentComponentId === groupId)
    .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
}

const FLEX_STYLE_KEYS = new Set([
  'flexDirection',
  'flexWrap',
  'gap',
  'alignItems',
  'justifyContent',
]);

/** Stored overflow for group-like nodes; default matches previous flex editor shell. */
export function getGroupOverflowMode(css: ComponentStyle): 'hidden' | 'scroll' | 'visible' {
  const o = css.overflow as 'hidden' | 'scroll' | 'visible' | 'grow' | undefined;
  if (o === 'scroll' || o === 'visible') return o;
  // Legacy sheets may still have `grow` in JSON; treat like visible overflow.
  if (o === 'grow') return 'visible';
  return 'hidden';
}

export function groupOuterShellOverflowCss(
  mode: 'hidden' | 'scroll' | 'visible',
): CSSProperties['overflow'] {
  if (mode === 'scroll') return 'auto';
  if (mode === 'visible') return 'visible';
  return 'hidden';
}

export function groupFlexInnerOverflowCss(
  mode: 'hidden' | 'scroll' | 'visible',
): CSSProperties['overflow'] {
  if (mode === 'hidden') return 'hidden';
  return 'visible';
}

/**
 * Outer shell style for a group: full component style minus flex-host keys
 * (those apply only on the inner flex wrapper).
 */
export function groupOuterChromeStyle(
  css: ComponentStyle,
  width: number | string,
  height: number | string,
): CSSProperties {
  const out = { ...(css as Record<string, unknown>) };
  for (const k of FLEX_STYLE_KEYS) {
    delete out[k];
  }
  delete out.overflow;
  return {
    ...(out as CSSProperties),
    width,
    height,
    boxSizing: 'border-box',
  };
}

/** Flex container style from stored group style (inner host). */
export function groupFlexContainerStyle(
  css: ComponentStyle,
  innerOverflow: CSSProperties['overflow'] = 'auto',
): CSSProperties {
  const gap = css.gap ?? 8;
  return {
    display: 'flex',
    flexDirection: css.flexDirection ?? 'row',
    flexWrap: css.flexWrap ?? 'nowrap',
    gap: `${Number(gap)}px`,
    alignItems: css.alignItems ?? 'stretch',
    justifyContent: css.justifyContent ?? 'flex-start',
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    overflow: innerOverflow,
  };
}
