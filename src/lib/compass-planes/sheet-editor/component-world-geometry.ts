import type { Component } from '@/types';

import { ComponentTypes } from '../nodes/node-types';

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

/** Include direct children of any deleted group roots (v1: single nesting level). */
export function expandDeleteIds(components: Component[], requestedIds: string[]): string[] {
  const byId = componentByIdMap(components);
  const out = new Set(requestedIds);
  for (const id of requestedIds) {
    const c = byId.get(id);
    if (c?.type === ComponentTypes.GROUP) {
      for (const ch of components) {
        if (ch.parentComponentId === id) out.add(ch.id);
      }
    }
  }
  return [...out];
}
