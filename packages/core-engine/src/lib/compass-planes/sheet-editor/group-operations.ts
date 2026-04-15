import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';

import { DEFAULT_GRID_SIZE } from '../editor-config';
import { ComponentTypes } from '../nodes/node-types';
import { injectDefaultComponent } from '../utils/inject-defaults';
import {
  buildEffectiveLayoutMap,
  componentByIdMap,
  subtreeWorldAabb,
  worldTopLeftWithEffective,
} from './component-world-geometry';

export type GroupMutationPlan = {
  toCreate: Partial<Component>[];
  toUpdate: ComponentUpdate[];
  toDelete: string[];
};

function sortRootsStable(roots: Component[]): Component[] {
  return [...roots].sort((a, b) => {
    if (a.z !== b.z) return a.z - b.z;
    return a.id.localeCompare(b.id);
  });
}

function unionSubtreeWorldAABBs(
  rootIds: string[],
  components: Component[],
  byId: Map<string, Component>,
  eff: ReturnType<typeof buildEffectiveLayoutMap>,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rid of rootIds) {
    const bb = subtreeWorldAabb(rid, components, byId, eff);
    if (!Number.isFinite(bb.minX)) continue;
    minX = Math.min(minX, bb.minX);
    minY = Math.min(minY, bb.minY);
    maxX = Math.max(maxX, bb.maxX);
    maxY = Math.max(maxY, bb.maxY);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: DEFAULT_GRID_SIZE * 2, maxY: DEFAULT_GRID_SIZE * 2 };
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Group / merge selection: wraps top-level roots (including existing group nodes) in a new outer group
 * while preserving nesting. Requires ≥2 selected, unlocked, all canvas roots (no parent).
 */
export function planGroupSelection(
  components: Component[],
  rulesetId: string,
  windowId: string,
): GroupMutationPlan | null {
  const selected = components.filter((c) => c.selected && !c.locked);
  if (selected.length < 2) return null;
  if (!selected.every((c) => !c.parentComponentId)) return null;

  const eff = buildEffectiveLayoutMap(components, {}, null);
  const byId = componentByIdMap(components);

  const sortedRoots = sortRootsStable(selected);

  const rootIds = sortedRoots.map((r) => r.id);
  const { minX, minY, maxX, maxY } = unionSubtreeWorldAABBs(rootIds, components, byId, eff);

  const baseZ = Math.min(...selected.map((s) => s.z));
  const newGroupId = crypto.randomUUID();

  const draft = injectDefaultComponent({
    type: ComponentTypes.GROUP,
    id: newGroupId,
    x: minX,
    y: minY,
    width: Math.max(DEFAULT_GRID_SIZE * 2, maxX - minX),
    height: Math.max(DEFAULT_GRID_SIZE * 2, maxY - minY),
    z: baseZ,
    rulesetId,
    windowId,
    parentComponentId: null,
    selected: false,
  });
  if (!draft) return null;

  const toUpdate: ComponentUpdate[] = sortedRoots.map((m, i) => {
    const tl = worldTopLeftWithEffective(m, byId, eff);
    return {
      id: m.id,
      parentComponentId: newGroupId,
      x: tl.x - minX,
      y: tl.y - minY,
      z: baseZ + 1 + i,
    };
  });

  return {
    toCreate: [draft],
    toUpdate,
    toDelete: [],
  };
}

/**
 * Ungroup once: direct children of the selected group move to its parent (or canvas if none);
 * inner structure of each child is unchanged.
 */
export function planUngroupSelection(components: Component[]): GroupMutationPlan | null {
  const sel = components.filter((c) => c.selected && !c.locked);
  if (sel.length !== 1 || sel[0].type !== ComponentTypes.GROUP) return null;
  const g = sel[0];
  const children = components.filter((c) => c.parentComponentId === g.id);
  const parentId = g.parentComponentId ?? null;
  const toUpdate: ComponentUpdate[] = children.map((ch) => ({
    id: ch.id,
    parentComponentId: parentId,
    x: g.x + ch.x,
    y: g.y + ch.y,
  }));
  return { toCreate: [], toUpdate, toDelete: [g.id] };
}

/** True if Group action should be enabled in the editor. */
export function canGroupSelection(components: Component[]): boolean {
  const selected = components.filter((c) => c.selected && !c.locked);
  return selected.length >= 2 && selected.every((c) => !c.parentComponentId);
}

export function canUngroupSelection(components: Component[]): boolean {
  return planUngroupSelection(components) != null;
}
