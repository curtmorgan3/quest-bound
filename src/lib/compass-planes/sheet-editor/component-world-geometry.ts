import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import {
  getEditorPreviewStateName,
  withMergedStateLayers,
} from '@/lib/compass-planes/utils/component-states';
import type { Component } from '@/types';

export function componentByIdMap(components: Component[]): Map<string, Component> {
  return new Map(components.map((c) => [c.id, c]));
}

export type EffectiveLayout = { x: number; y: number; width: number; height: number };

/** Stored-space layout with drag / resize previews applied (per id). */
export function buildEffectiveLayoutMap(
  components: Component[],
  movePreviewById: Record<string, { x: number; y: number }>,
  resizePreview: { id: string; x: number; y: number; width: number; height: number } | null,
): Map<string, EffectiveLayout> {
  const m = new Map<string, EffectiveLayout>();
  for (const c of components) {
    const geom = withMergedStateLayers(c, { editorPreviewState: getEditorPreviewStateName(c) });
    let x = geom.x;
    let y = geom.y;
    let width = geom.width;
    let height = geom.height;
    if (resizePreview?.id === c.id) {
      x = resizePreview.x;
      y = resizePreview.y;
      width = resizePreview.width;
      height = resizePreview.height;
    } else if (movePreviewById[c.id]) {
      x = movePreviewById[c.id].x;
      y = movePreviewById[c.id].y;
    }
    m.set(c.id, { x, y, width, height });
  }
  return m;
}

/** Canvas (world) top-left using effective stored-space positions. */
export function worldTopLeftWithEffective(
  c: Component,
  byId: Map<string, Component>,
  effective: Map<string, EffectiveLayout>,
): { x: number; y: number } {
  const self = effective.get(c.id);
  if (!self) return { x: c.x, y: c.y };
  const pid = c.parentComponentId;
  if (!pid) return { x: self.x, y: self.y };
  const p = byId.get(pid);
  if (!p) return { x: self.x, y: self.y };
  const pw = worldTopLeftWithEffective(p, byId, effective);
  return { x: pw.x + self.x, y: pw.y + self.y };
}

/** Walk `parentComponentId` from `componentId` and return the nearest ancestor with `type === 'group'`. */
export function findNearestGroupRootId(
  componentId: string,
  byId: Map<string, Component>,
): string | null {
  let cur = byId.get(componentId);
  const seen = new Set<string>();
  while (cur?.parentComponentId) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    const parent = byId.get(cur.parentComponentId);
    if (!parent) break;
    if (parent.type === ComponentTypes.GROUP) return parent.id;
    cur = parent;
  }
  return null;
}

/**
 * Component ids that should share pointer hover/press visual state with `component`: the hovered
 * group's subtree, or all rows sharing `groupId` when not under a group node.
 */
export function getGroupPointerAffinityIds(
  component: Component,
  allComponents: Component[],
  byId: Map<string, Component>,
): Set<string> {
  if (component.type === ComponentTypes.GROUP) {
    return collectDescendantComponentIds(allComponents, component.id);
  }
  const rootId = findNearestGroupRootId(component.id, byId);
  if (rootId) {
    return collectDescendantComponentIds(allComponents, rootId);
  }
  if (component.groupId) {
    const gid = component.groupId;
    const out = new Set<string>();
    for (const c of allComponents) {
      if (c.groupId === gid) out.add(c.id);
    }
    return out;
  }
  return new Set([component.id]);
}

/**
 * All component ids in the subtree rooted at `rootId` (including `rootId`), by `parentComponentId` edges.
 */
export function collectDescendantComponentIds(components: Component[], rootId: string): Set<string> {
  const out = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const c of components) {
      if (c.parentComponentId === id) queue.push(c.id);
    }
  }
  return out;
}

/** True if `descendantId` is a strict descendant of `ancestorId` in the `parentComponentId` chain. */
export function isComponentDescendantOf(
  byId: Map<string, Component>,
  descendantId: string,
  ancestorId: string,
): boolean {
  if (descendantId === ancestorId) return false;
  let cur = byId.get(descendantId);
  const seen = new Set<string>();
  while (cur?.parentComponentId) {
    if (cur.parentComponentId === ancestorId) return true;
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    cur = byId.get(cur.parentComponentId);
    if (seen.size > 4096) break;
  }
  return false;
}

/**
 * Outermost component on the path from `c` to the canvas root whose id is in `selectedMovableIds`.
 * Used so dragging any selected nested item moves the whole selected subtree from the top.
 */
export function topmostSelectedMovableAncestor(
  c: Component,
  selectedMovableIds: Set<string>,
  byId: Map<string, Component>,
): Component | null {
  let top: Component | null = null;
  let walk: Component | null = c;
  while (walk?.parentComponentId) {
    const p = byId.get(walk.parentComponentId);
    if (!p) break;
    if (selectedMovableIds.has(p.id)) {
      top = p;
    }
    walk = p;
  }
  return top;
}

/** Axis-aligned world-space bounds of every node in the subtree rooted at `rootId`. */
export function subtreeWorldAabb(
  rootId: string,
  components: Component[],
  byId: Map<string, Component>,
  effective: Map<string, EffectiveLayout>,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const ids = collectDescendantComponentIds(components, rootId);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) continue;
    const self = effective.get(id);
    if (!self) continue;
    const tl = worldTopLeftWithEffective(c, byId, effective);
    minX = Math.min(minX, tl.x);
    minY = Math.min(minY, tl.y);
    maxX = Math.max(maxX, tl.x + self.width);
    maxY = Math.max(maxY, tl.y + self.height);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  return { minX, minY, maxX, maxY };
}

/** Include every descendant of any deleted row (nested groups under a deleted group). */
export function expandDeleteIds(components: Component[], requestedIds: string[]): string[] {
  const out = new Set(requestedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of components) {
      const pid = c.parentComponentId;
      if (pid != null && out.has(pid) && !out.has(c.id)) {
        out.add(c.id);
        changed = true;
      }
    }
  }
  return [...out];
}

/**
 * Every component that should be on the clipboard when copying the current selection:
 * each selected row plus all descendants via `parentComponentId`.
 */
export function expandSelectedComponentsWithDescendants(
  components: Component[],
  selected: Component[],
): Component[] {
  if (selected.length === 0) return [];
  const allIds = new Set<string>();
  for (const c of selected) {
    for (const id of collectDescendantComponentIds(components, c.id)) {
      allIds.add(id);
    }
  }
  return components.filter((c) => allIds.has(c.id));
}

function depthWithinCopiedSubtree(
  c: Component,
  byId: Map<string, Component>,
  idSet: Set<string>,
): number {
  let d = 0;
  let cur: Component | undefined = c;
  const seen = new Set<string>();
  while (cur?.parentComponentId && idSet.has(cur.parentComponentId)) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    d += 1;
    cur = byId.get(cur.parentComponentId);
    if (d > 4096) break;
  }
  return d;
}

/**
 * Clone a clipboard snapshot (already subtree-expanded) with new ids, remapped parents/groups,
 * and a canvas offset applied only to paste roots (nodes whose parent is not in the snapshot).
 */
export function remapCopiedComponentsForPaste(
  source: Component[],
  offsetX: number,
  offsetY: number,
): Partial<Component>[] {
  if (source.length === 0) return [];
  const byId = componentByIdMap(source);
  const idSet = new Set(source.map((c) => c.id));
  const idMap = new Map<string, string>();
  for (const id of idSet) {
    idMap.set(id, crypto.randomUUID());
  }

  const sorted = [...source].sort((a, b) => {
    const da = depthWithinCopiedSubtree(a, byId, idSet);
    const db = depthWithinCopiedSubtree(b, byId, idSet);
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });

  return sorted.map((c) => {
    const newId = idMap.get(c.id)!;
    const mappedParent =
      c.parentComponentId && idSet.has(c.parentComponentId)
        ? idMap.get(c.parentComponentId)!
        : null;
    const mappedGroupId =
      c.groupId && idSet.has(c.groupId) ? idMap.get(c.groupId)! : (c.groupId ?? null);
    const isPasteRoot = !c.parentComponentId || !idSet.has(c.parentComponentId);
    return {
      ...c,
      id: newId,
      parentComponentId: mappedParent,
      groupId: mappedGroupId,
      x: isPasteRoot ? c.x + offsetX : c.x,
      y: isPasteRoot ? c.y + offsetY : c.y,
      selected: false,
    };
  });
}

/**
 * Order ids so **deepest** components (farthest from the canvas root in the parent chain) delete first.
 * Prevents a frame where a child still exists but its parent row is gone — layout then treats local x/y as world and draws near the origin.
 */
export function sortComponentIdsForDeletion(components: Component[], ids: string[]): string[] {
  const idSet = new Set(ids);
  const byId = componentByIdMap(components);

  function depthFromCanvasRoot(cid: string): number {
    let depth = 0;
    let cur = byId.get(cid);
    const seen = new Set<string>();
    while (cur?.parentComponentId) {
      if (seen.has(cur.id)) break;
      seen.add(cur.id);
      depth += 1;
      cur = byId.get(cur.parentComponentId);
      if (depth > 4096) break;
    }
    return depth;
  }

  return [...idSet]
    .filter((id) => byId.has(id))
    .sort((a, b) => {
      const da = depthFromCanvasRoot(a);
      const db = depthFromCanvasRoot(b);
      if (da !== db) return db - da;
      return a.localeCompare(b);
    });
}
