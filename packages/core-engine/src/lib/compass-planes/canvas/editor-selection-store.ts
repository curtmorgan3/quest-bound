import { createStore, type StoreApi } from 'zustand/vanilla';

import type { EditorSelectionPointerModifiers } from './selection-modifiers';
import { isAdditiveEditorSelection } from './selection-modifiers';

export type EditorSelectionState = {
  /** Window-local selection; compare with `Set` semantics in the store API. */
  selectedIds: ReadonlySet<string>;
};

type EditorSelectionActions = {
  clearSelection: () => void;
  setSelection: (ids: Iterable<string>) => void;
  /** Click on one canvas item (matches Shift / ⌘ / Ctrl rules from the sheet canvas editor). */
  applyPointerClick: (id: string, modifiers: EditorSelectionPointerModifiers) => void;
  /** Rectangle / marquee complete; `hitIds` are items intersecting the marquee. */
  applyMarquee: (hitIds: string[], modifiers: EditorSelectionPointerModifiers) => void;
};

export type EditorSelectionStore = EditorSelectionState & EditorSelectionActions;

function toggleIdInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function createEditorSelectionStore(
  initialSelected: Iterable<string> = [],
): StoreApi<EditorSelectionStore> {
  return createStore<EditorSelectionStore>((set) => ({
    selectedIds: new Set(initialSelected),

    clearSelection: () => set({ selectedIds: new Set() }),

    setSelection: (ids) => set({ selectedIds: new Set(ids) }),

    applyPointerClick: (id, modifiers) => {
      const additive = isAdditiveEditorSelection(modifiers);
      set((s) => {
        if (!additive) {
          return { selectedIds: new Set([id]) };
        }
        return { selectedIds: toggleIdInSet(s.selectedIds as Set<string>, id) };
      });
    },

    applyMarquee: (hitIds, modifiers) => {
      const additive = isAdditiveEditorSelection(modifiers);
      set((s) => {
        if (!additive) {
          return { selectedIds: new Set(hitIds) };
        }
        const next = new Set(s.selectedIds as Set<string>);
        for (const id of hitIds) next.add(id);
        return { selectedIds: next };
      });
    },
  }));
}

export type EditorSelectionStoreApi = StoreApi<EditorSelectionStore>;
