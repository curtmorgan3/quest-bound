import { create } from 'zustand';

function key(characterId: string, attributeId: string): string {
  return `${characterId}:${attributeId}`;
}

export type ScriptModifiedAttributesStore = {
  /** Set of "characterId:attributeId" for attributes just modified by script. */
  modifiedKeys: Set<string>;
  /** Incremented on every addModified so subscribers always re-render when we add (even same key again). */
  generation: number;
  /** Add (characterId, attributeId) pairs. Causes subscribers to re-render. */
  addModified: (characterId: string, attributeIds: string[]) => void;
  /** Remove one pair. Returns true if it was present. */
  removeModified: (characterId: string, attributeId: string) => boolean;
  /** Check if (characterId, attributeId) is in the set. */
  has: (characterId: string, attributeId: string) => boolean;
};

export const useScriptModifiedAttributesStore = create<ScriptModifiedAttributesStore>()(
  (set, get) => ({
    modifiedKeys: new Set(),
    generation: 0,

    addModified(characterId: string, attributeIds: string[]) {
      if (attributeIds.length === 0) return;
      set((state) => {
        const next = new Set(state.modifiedKeys);
        attributeIds.forEach((attrId) => next.add(key(characterId, attrId)));
        return { modifiedKeys: next, generation: state.generation + 1 };
      });
    },

    removeModified(characterId: string, attributeId: string): boolean {
      const k = key(characterId, attributeId);
      let removed = false;
      set((state) => {
        if (!state.modifiedKeys.has(k)) return state;
        removed = true;
        const next = new Set(state.modifiedKeys);
        next.delete(k);
        return { ...state, modifiedKeys: next };
      });
      return removed;
    },

    has(characterId: string, attributeId: string): boolean {
      return get().modifiedKeys.has(key(characterId, attributeId));
    },
  }),
);
