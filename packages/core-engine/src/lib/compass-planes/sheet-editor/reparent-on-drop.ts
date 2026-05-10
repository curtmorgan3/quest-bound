import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';

import { ComponentTypes } from '../nodes/node-types';
import {
  collectDescendantComponentIds,
  worldTopLeftWithEffective,
  type EffectiveLayout,
} from './component-world-geometry';

type ContainerRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

/**
 * Adjust the drag-commit `updates` so each moved component's `parentComponentId`
 * matches whichever `container` its new world center lies inside (or null if none).
 * `x` / `y` are rewritten so the world position is preserved across the reparent —
 * stored coords are parent-relative when the new parent is a container, world when not.
 */
export function applyContainerReparenting(
  updates: ComponentUpdate[],
  components: Component[],
  byId: Map<string, Component>,
  effective: Map<string, EffectiveLayout>,
): ComponentUpdate[] {
  if (updates.length === 0) return updates;

  // Patch the effective layout with the just-committed positions so containers that
  // moved during this same drag use their new world rect for the hit test.
  const effectiveAfter = new Map(effective);
  for (const u of updates) {
    if (typeof u.x !== 'number' || typeof u.y !== 'number') continue;
    const prev = effectiveAfter.get(u.id);
    if (!prev) continue;
    effectiveAfter.set(u.id, { ...prev, x: u.x, y: u.y });
  }

  const containerRects: ContainerRect[] = [];
  for (const c of components) {
    if (c.type !== ComponentTypes.CONTAINER) continue;
    const eff = effectiveAfter.get(c.id);
    if (!eff) continue;
    const tl = worldTopLeftWithEffective(c, byId, effectiveAfter);
    containerRects.push({
      id: c.id,
      x: tl.x,
      y: tl.y,
      width: eff.width,
      height: eff.height,
      z: c.z,
    });
  }

  if (containerRects.length === 0) return updates;

  return updates.map((u) => {
    const comp = byId.get(u.id);
    if (!comp) return u;
    if (typeof u.x !== 'number' || typeof u.y !== 'number') return u;

    let parentWorldX = 0;
    let parentWorldY = 0;
    if (comp.parentComponentId) {
      const parent = byId.get(comp.parentComponentId);
      if (parent) {
        const ptl = worldTopLeftWithEffective(parent, byId, effectiveAfter);
        parentWorldX = ptl.x;
        parentWorldY = ptl.y;
      }
    }
    const worldX = parentWorldX + u.x;
    const worldY = parentWorldY + u.y;
    const eff = effectiveAfter.get(u.id);
    const w = eff?.width ?? comp.width;
    const h = eff?.height ?? comp.height;
    const cx = worldX + w / 2;
    const cy = worldY + h / 2;

    // Cannot reparent a component into itself or any of its descendants.
    const exclude = collectDescendantComponentIds(components, u.id);

    let target: ContainerRect | null = null;
    for (const r of containerRects) {
      if (exclude.has(r.id)) continue;
      if (cx < r.x || cx > r.x + r.width) continue;
      if (cy < r.y || cy > r.y + r.height) continue;
      if (target == null) {
        target = r;
        continue;
      }
      // Innermost wins: prefer smaller area, break ties with higher z (front-most overlap).
      const tArea = target.width * target.height;
      const rArea = r.width * r.height;
      if (rArea < tArea || (rArea === tArea && r.z > target.z)) {
        target = r;
      }
    }

    const currentParent = comp.parentComponentId ?? null;
    const targetParent = target?.id ?? null;
    if (currentParent === targetParent) return u;

    const localX = target ? worldX - target.x : worldX;
    const localY = target ? worldY - target.y : worldY;
    return {
      ...u,
      x: localX,
      y: localY,
      parentComponentId: targetParent,
    };
  });
}
