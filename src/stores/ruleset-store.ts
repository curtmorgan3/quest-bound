import { FileManager } from '@/lib/compass-file-manager';
import type { Module, Ruleset } from '@/types';
import { create } from 'zustand';
import type { CompassStore } from './types';

interface RulesetStore extends CompassStore {
  rulesets: Ruleset[];
  modules: Module[];
  loadRulesets: () => Promise<void>;
}

export const useRulesetStore = create<RulesetStore>()((set) => ({
  rulesets: [],
  modules: [],
  loading: true,
  error: undefined,
  loadRulesets: async () => {
    set({ loading: true });
    try {
      const rulesets = await FileManager.getRulesets();
      const modules = await FileManager.getModules();

      set({ rulesets, modules, error: undefined });
    } catch (e) {
      set({ error: e as Error });
    } finally {
      set({ loading: false });
    }
  },
}));
