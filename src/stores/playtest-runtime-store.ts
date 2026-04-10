import { create } from 'zustand';

export type PlaytestRuntime = {
  playtestSessionId: string;
  playtesterId: string;
  playtestId: string;
  sessionName: string;
  sessionInstructions: string;
};

type State = {
  activeByRulesetId: Record<string, PlaytestRuntime | undefined>;
  setActive: (rulesetId: string, runtime: PlaytestRuntime) => void;
  clearActive: (rulesetId: string) => void;
  getActive: (rulesetId: string) => PlaytestRuntime | null;
};

export const usePlaytestRuntimeStore = create<State>((set, get) => ({
  activeByRulesetId: {},
  setActive: (rulesetId, runtime) =>
    set((s) => ({
      activeByRulesetId: { ...s.activeByRulesetId, [rulesetId]: runtime },
    })),
  clearActive: (rulesetId) =>
    set((s) => {
      const next = { ...s.activeByRulesetId };
      delete next[rulesetId];
      return { activeByRulesetId: next };
    }),
  getActive: (rulesetId) => get().activeByRulesetId[rulesetId] ?? null,
}));
