import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';

import { DEFAULT_GRID_SIZE } from '../editor-config';
import { ComponentTypes } from '../nodes/node-types';
import { injectDefaultComponent } from '../utils/inject-defaults';

export type GroupMutationPlan = {
  toCreate: Partial<Component>[];
  toUpdate: ComponentUpdate[];
  toDelete: string[];
};

type Member = { comp: Component; wx: number; wy: number };

function sortMembersStable(members: Member[]): Member[] {
  return [...members].sort((a, b) => {
    if (a.comp.z !== b.comp.z) return a.comp.z - b.comp.z;
    return a.comp.id.localeCompare(b.comp.id);
  });
}

function collectMembersForFlatten(components: Component[], selected: Component[]): Member[] {
  const members: Member[] = [];
  for (const s of selected) {
    if (s.type === ComponentTypes.GROUP) {
      for (const ch of components) {
        if (ch.parentComponentId === s.id) {
          members.push({ comp: ch, wx: s.x + ch.x, wy: s.y + ch.y });
        }
      }
    } else {
      members.push({ comp: s, wx: s.x, wy: s.y });
    }
  }
  return members;
}

function bboxOfMembers(members: Member[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const m of members) {
    minX = Math.min(minX, m.wx);
    minY = Math.min(minY, m.wy);
    maxX = Math.max(maxX, m.wx + m.comp.width);
    maxY = Math.max(maxY, m.wy + m.comp.height);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Group / merge selection: wraps loose roots or flattens one-or-more existing groups + loose items
 * into a single new group root. Requires ≥2 selected, unlocked, all top-level (no parent).
 */
export function planGroupSelection(
  components: Component[],
  rulesetId: string,
  windowId: string,
): GroupMutationPlan | null {
  const selected = components.filter((c) => c.selected && !c.locked);
  if (selected.length < 2) return null;
  if (!selected.every((c) => !c.parentComponentId)) return null;

  const groupRoots = selected.filter((c) => c.type === ComponentTypes.GROUP);
  const needsFlatten = groupRoots.length >= 1;

  const membersRaw = needsFlatten
    ? collectMembersForFlatten(components, selected)
    : selected.map((c) => ({ comp: c, wx: c.x, wy: c.y }));

  if (membersRaw.length < 2) return null;

  const members = sortMembersStable(membersRaw);
  const { minX, minY, maxX, maxY } = bboxOfMembers(members);
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

  const toUpdate: ComponentUpdate[] = members.map((m, i) => ({
    id: m.comp.id,
    parentComponentId: newGroupId,
    x: m.wx - minX,
    y: m.wy - minY,
    z: baseZ + 1 + i,
  }));

  const toDelete = groupRoots.map((g) => g.id);

  return {
    toCreate: [draft],
    toUpdate,
    toDelete,
  };
}

/** Ungroup when exactly one group root is selected. */
export function planUngroupSelection(components: Component[]): GroupMutationPlan | null {
  const sel = components.filter((c) => c.selected && !c.locked);
  if (sel.length !== 1 || sel[0].type !== ComponentTypes.GROUP) return null;
  const g = sel[0];
  const children = components.filter((c) => c.parentComponentId === g.id);
  const toUpdate: ComponentUpdate[] = children.map((ch) => ({
    id: ch.id,
    parentComponentId: null,
    x: g.x + ch.x,
    y: g.y + ch.y,
  }));
  return { toCreate: [], toUpdate, toDelete: [g.id] };
}

/** True if Group action should be enabled in the editor. */
export function canGroupSelection(components: Component[]): boolean {
  const selected = components.filter((c) => c.selected && !c.locked);
  if (selected.length < 2 || !selected.every((c) => !c.parentComponentId)) return false;
  const groupRoots = selected.filter((c) => c.type === ComponentTypes.GROUP);
  const membersRaw =
    groupRoots.length >= 1
      ? collectMembersForFlatten(components, selected)
      : selected.map((c) => ({ comp: c, wx: c.x, wy: c.y }));
  return membersRaw.length >= 2;
}

export function canUngroupSelection(components: Component[]): boolean {
  return planUngroupSelection(components) != null;
}
