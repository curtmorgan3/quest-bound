import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';

import type { EditorSelectionPointerModifiers } from '../canvas/selection-modifiers';
import { isAdditiveEditorSelection } from '../canvas/selection-modifiers';

function selectionChanged(prev: boolean, next: boolean): boolean {
  return prev !== next;
}

/** Single-item click selection (replaces React Flow click semantics). */
export function updatesForClickSelection(
  components: Component[],
  clickedId: string,
  modifiers: EditorSelectionPointerModifiers,
): ComponentUpdate[] {
  const additive = isAdditiveEditorSelection(modifiers);
  if (!additive) {
    const clicked = components.find((c) => c.id === clickedId);
    const selectedCount = components.filter((c) => c.selected).length;
    // Pointer-down on an item that is already in a multi-selection: keep selection (group drag).
    if (clicked?.selected && selectedCount > 1) {
      return [];
    }
    return components
      .map((c) => ({
        id: c.id,
        selected: c.id === clickedId,
      }))
      .filter((u) => {
        const prev = components.find((c) => c.id === u.id);
        return prev != null && selectionChanged(prev.selected ?? false, u.selected!);
      });
  }

  const clicked = components.find((c) => c.id === clickedId);
  if (!clicked) return [];
  const nextSel = !clicked.selected;
  if (clicked.selected === nextSel) return [];
  return [{ id: clickedId, selected: nextSel }];
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
