import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';

import type { EditorSelectionPointerModifiers } from '../canvas/selection-modifiers';
import { isAdditiveEditorSelection } from '../canvas/selection-modifiers';
import { componentByIdMap, isComponentDescendantOf } from './component-world-geometry';

/** Top-level canvas ancestor: outermost group for nested content, or the row itself if it has no parent. */
export function canvasRootComponentId(c: Component, byId: Map<string, Component>): string {
  let cur: Component | null = c;
  while (cur?.parentComponentId) {
    const p = byId.get(cur.parentComponentId);
    if (!p) break;
    cur = p;
  }
  return cur?.id ?? c.id;
}

/** Collapse marquee hits so nested items only contribute their outermost root (deduped). */
export function canonicalizeMarqueeHitIds(components: Component[], hitIds: string[]): string[] {
  const byId = componentByIdMap(components);
  const roots = new Set<string>();
  for (const id of hitIds) {
    const c = byId.get(id);
    if (!c) continue;
    roots.add(canvasRootComponentId(c, byId));
  }
  return [...roots];
}

function selectionChanged(prev: boolean, next: boolean): boolean {
  return prev !== next;
}

function updatesSelectOnly(components: Component[], selectId: string): ComponentUpdate[] {
  return components
    .map((c) => ({
      id: c.id,
      selected: c.id === selectId,
    }))
    .filter((u) => {
      const prev = components.find((c) => c.id === u.id);
      return prev != null && selectionChanged(prev.selected ?? false, u.selected!);
    });
}

/** `[canvasRoot, …, clicked]` along `parentComponentId` (length 1 if already at root). */
export function pathFromCanvasRootToClicked(
  clickedId: string,
  byId: Map<string, Component>,
): string[] {
  const up: string[] = [];
  let cur: Component | undefined = byId.get(clickedId);
  while (cur) {
    up.push(cur.id);
    const pid = cur.parentComponentId;
    if (!pid) break;
    cur = byId.get(pid);
  }
  up.reverse();
  return up;
}

/** Tracks nested hit-target drill-down (same pointer target → walk root → leaf). */
export type SelectionDrillState = { hitId: string; level: number };

export type ClickSelectionWithDrillResult = {
  updates: ComponentUpdate[];
  /** Pass through to the next canvas tap; `null` clears drill memory. */
  nextDrillState: SelectionDrillState | null;
};

/**
 * Click selection: first tap on a nested hit selects the canvas root ancestor; repeat taps
 * on the same hit step one level deeper until the hit target is selected. Additive (Shift /
 * ⌘ / Ctrl) clicks use the same root for nested hits so multi-select matches that behavior.
 */
export function computeClickSelectionWithDrill(
  components: Component[],
  clickedId: string,
  modifiers: EditorSelectionPointerModifiers,
  drillState: SelectionDrillState | null,
): ClickSelectionWithDrillResult {
  const additive = isAdditiveEditorSelection(modifiers);
  const byId = componentByIdMap(components);
  const path = pathFromCanvasRootToClicked(clickedId, byId);
  const targetIdForAdditive = path.length > 1 ? path[0]! : clickedId;

  if (additive) {
    const target = components.find((c) => c.id === targetIdForAdditive);
    if (!target) return { updates: [], nextDrillState: null };
    const nextSel = !target.selected;
    if (target.selected === nextSel) return { updates: [], nextDrillState: null };
    return { updates: [{ id: targetIdForAdditive, selected: nextSel }], nextDrillState: null };
  }

  const clicked = components.find((c) => c.id === clickedId);
  const selectedCount = components.filter((c) => c.selected).length;
  // Pointer-down while multi-selected: keep selection for drags (hit selected item or child under a selected ancestor).
  if (selectedCount > 1) {
    if (clicked?.selected) {
      return { updates: [], nextDrillState: null };
    }
    const underSelected = components.some(
      (s) => s.selected && isComponentDescendantOf(byId, clickedId, s.id),
    );
    if (underSelected) {
      return { updates: [], nextDrillState: null };
    }
  }

  if (path.length <= 1) {
    const updates = updatesSelectOnly(components, clickedId);
    return { updates, nextDrillState: null };
  }

  let level = 0;
  if (drillState?.hitId === clickedId) {
    const soleId =
      selectedCount === 1 ? components.find((c) => c.selected)?.id : undefined;

    if (
      soleId != null &&
      drillState.level === path.length - 1 &&
      soleId === path[path.length - 1]
    ) {
      return { updates: [], nextDrillState: drillState };
    }

    if (
      soleId != null &&
      drillState.level < path.length - 1 &&
      soleId === path[drillState.level]
    ) {
      level = drillState.level + 1;
    }
  }

  const selectId = path[level]!;
  const updates = updatesSelectOnly(components, selectId);
  return {
    updates,
    nextDrillState: { hitId: clickedId, level },
  };
}

/** Marquee complete: replace or union selection. */
export function updatesForMarqueeSelection(
  components: Component[],
  hitIds: string[],
  modifiers: EditorSelectionPointerModifiers,
): ComponentUpdate[] {
  const additive = isAdditiveEditorSelection(modifiers);
  const hitSet = new Set(hitIds);

  if (!additive) {
    return components
      .map((c) => ({
        id: c.id,
        selected: hitSet.has(c.id),
      }))
      .filter((u) => {
        const prev = components.find((c) => c.id === u.id);
        return prev != null && selectionChanged(prev.selected ?? false, u.selected!);
      });
  }

  const updates: ComponentUpdate[] = [];
  for (const id of hitIds) {
    const c = components.find((x) => x.id === id);
    if (c && !c.selected) updates.push({ id, selected: true });
  }
  return updates;
}

export function updatesToClearSelection(components: Component[]): ComponentUpdate[] {
  return components.filter((c) => c.selected).map((c) => ({ id: c.id, selected: false }));
}
