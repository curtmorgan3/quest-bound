import type { Ruleset } from '@/types';
import { create } from 'zustand';

interface RulesetStore {
  rulesets: Ruleset[];
}

export const useRulesetStore = create<RulesetStore>()(() => ({
  rulesets: [],
  modules: [],
  loading: true,
  error: undefined,
}));
