import { create } from 'zustand';

export type PlaytestRuntime = {
  playtestSessionId: string;
  playtesterId: string;
  playtestId: string;
  sessionName: string;
  sessionInstructions: string;
  /** Local character sheet used for this playtest (Dexie id); drives snapshots at feedback. */
  playCharacterId: string | null;
  /**
   * False after pause or when server says the tester is no longer actively playing.
   * Kept separate from clearing the row so `playCharacterId` survives until feedback snapshot.
   */
  isSessionLive: boolean;
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
