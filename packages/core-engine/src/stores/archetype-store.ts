import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'qb.selectedArchetypeId';

interface ArchetypeStore {
  /** Map of rulesetId -> selectedArchetypeId */
  selectedByRuleset: Record<string, string>;
  setSelectedArchetype: (rulesetId: string, archetypeId: string | null) => void;
  getSelectedArchetype: (rulesetId: string) => string | null;
}

export const useArchetypeStore = create<ArchetypeStore>()(
  persist(
    (set, get) => ({
      selectedByRuleset: {},
      setSelectedArchetype: (rulesetId, archetypeId) =>
        set((state) => {
          const next = { ...state.selectedByRuleset };
          if (archetypeId) {
            next[rulesetId] = archetypeId;
          } else {
            delete next[rulesetId];
          }
          return { selectedByRuleset: next };
        }),
      getSelectedArchetype: (rulesetId) => get().selectedByRuleset[rulesetId] ?? null,
    }),
    { name: STORAGE_KEY },
  ),
);
