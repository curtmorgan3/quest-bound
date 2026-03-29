import type { Component } from '@/types';

/** All component ids in the subtree rooted at `rootId` (including the root), same window only. */
export function collectSubtreeComponentIds(rootId: string, windowComponents: Component[]): Set<string> {
  const byParent = new Map<string | null, Component[]>();
  for (const c of windowComponents) {
    const p = c.parentComponentId ?? null;
    let list = byParent.get(p);
    if (!list) {
      list = [];
      byParent.set(p, list);
    }
    list.push(c);
  }
  const out = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (out.has(id)) continue;
    out.add(id);
    const children = byParent.get(id);
    if (children) {
      for (const ch of children) {
        queue.push(ch.id);
      }
    }
  }
  return out;
}

export interface CloneComponentSubtreeParams {
  sourceRootId: string;
  windowComponents: Component[];
  targetWindowId: string;
  rulesetId: string;
  rootWorldX: number;
  rootWorldY: number;
}

/** Deep-clone a group subtree with new ids and remapped `parentComponentId` / `groupId`. */
export function cloneComponentSubtreeForWindow(params: CloneComponentSubtreeParams): Component[] {
  const byId = new Map(params.windowComponents.map((c) => [c.id, c]));
  const root = byId.get(params.sourceRootId);
  if (!root) return [];

  const ids = [...collectSubtreeComponentIds(params.sourceRootId, params.windowComponents)];
  const idMap = new Map<string, string>();
  for (const id of ids) {
    idMap.set(id, crypto.randomUUID());
  }

  const now = new Date().toISOString();
  const idSet = new Set(ids);

  return ids.map((oldId) => {
    const c = byId.get(oldId)!;
    const newId = idMap.get(oldId)!;
    const mappedParent =
      c.parentComponentId && idSet.has(c.parentComponentId)
        ? idMap.get(c.parentComponentId)!
        : null;
    const mappedGroupId =
      c.groupId && idSet.has(c.groupId) ? idMap.get(c.groupId)! : (c.groupId ?? null);
    const isRoot = oldId === params.sourceRootId;
    return {
      ...c,
      id: newId,
      rulesetId: params.rulesetId,
      windowId: params.targetWindowId,
      parentComponentId: mappedParent,
      groupId: mappedGroupId,
      x: isRoot ? params.rootWorldX : c.x,
      y: isRoot ? params.rootWorldY : c.y,
      selected: false,
      createdAt: now,
      updatedAt: now,
    } as Component;
  });
}
