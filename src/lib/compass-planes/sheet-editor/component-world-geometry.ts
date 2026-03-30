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
    let x = c.x;
    let y = c.y;
    let width = c.width;
    let height = c.height;
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
