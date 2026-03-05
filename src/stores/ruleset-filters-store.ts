import { create } from 'zustand';

const STORAGE_KEY = 'qb.rulesetFilters';

export type GridPage = 'attributes' | 'actions' | 'items';
export type ListPage =
  | 'charts'
  | 'documents'
  | 'windows'
  | 'pages'
  | 'assets'
  | 'archetypes';

export type GridParams = { filter?: string; sort?: string };
export type ListParams = { title?: string; category?: string };
export type ScriptsParams = { q?: string; type?: string };

type RulesetState = {
  [K in GridPage]?: GridParams;
} & {
  [K in ListPage]?: ListParams;
} & {
  scripts?: ScriptsParams;
};

type State = {
  byRuleset: Record<string, RulesetState>;
  _hydrated: boolean;
};

function loadFromStorage(): Record<string, RulesetState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RulesetState>;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveToStorage(byRuleset: Record<string, RulesetState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(byRuleset));
  } catch {
    // ignore
  }
}

type SetGridPartial = { filter?: string | null; sort?: string | null };
type SetListPartial = { title?: string | null; category?: string | null };
type SetScriptsPartial = { q?: string | null; type?: string | null };

export const useRulesetFiltersStore = create<State & {
  setGridFilters: (rulesetId: string, page: GridPage, partial: SetGridPartial) => void;
  getGridFilters: (rulesetId: string | undefined, page: GridPage) => GridParams | undefined;
  setListFilters: (rulesetId: string, page: ListPage, partial: SetListPartial) => void;
  getListFilters: (rulesetId: string | undefined, page: ListPage) => ListParams | undefined;
  setScriptsFilters: (rulesetId: string, partial: SetScriptsPartial) => void;
  getScriptsFilters: (rulesetId: string | undefined) => ScriptsParams | undefined;
  clearGridFilters: (rulesetId: string, page: GridPage) => void;
  clearListFilters: (rulesetId: string, page: ListPage) => void;
  clearScriptsFilters: (rulesetId: string) => void;
}>((set, get) => {
  function ensureHydrated() {
    if (!get()._hydrated) {
      set({ byRuleset: loadFromStorage(), _hydrated: true });
    }
  }

  return {
    byRuleset: {},
    _hydrated: false,

    setGridFilters(rulesetId: string, page: GridPage, partial: SetGridPartial) {
      ensureHydrated();
      set((state) => {
      const ruleset = state.byRuleset[rulesetId] ?? {};
      const current = (ruleset[page] as GridParams | undefined) ?? {};
      const next: GridParams = {
        filter:
          partial.filter === null
            ? undefined
            : partial.filter !== undefined
              ? partial.filter
              : current.filter,
        sort:
          partial.sort === null
            ? undefined
            : partial.sort !== undefined
              ? partial.sort
              : current.sort,
      };
      if (!next.filter) delete next.filter;
      if (!next.sort) delete next.sort;
      const nextRuleset = { ...ruleset, [page]: next };
      const byRuleset = { ...state.byRuleset, [rulesetId]: nextRuleset };
      saveToStorage(byRuleset);
      return { byRuleset };
    });
    },

    getGridFilters(rulesetId: string | undefined, page: GridPage): GridParams | undefined {
      ensureHydrated();
      if (!rulesetId) return undefined;
      const ruleset = get().byRuleset[rulesetId];
      const params = ruleset?.[page] as GridParams | undefined;
      if (!params || (!params.filter && !params.sort)) return undefined;
      return params;
    },

    setListFilters(rulesetId: string, page: ListPage, partial: SetListPartial) {
      ensureHydrated();
      set((state) => {
      const ruleset = state.byRuleset[rulesetId] ?? {};
      const current = (ruleset[page] as ListParams | undefined) ?? {};
      const next: ListParams = {
        title:
          partial.title === null
            ? undefined
            : partial.title !== undefined
              ? partial.title
              : current.title,
        category:
          partial.category === null || partial.category === 'all'
            ? undefined
            : partial.category !== undefined
              ? partial.category
              : current.category,
      };
      if (!next.title) delete next.title;
      if (!next.category || next.category === 'all') delete next.category;
      const nextRuleset = { ...ruleset, [page]: next };
      const byRuleset = { ...state.byRuleset, [rulesetId]: nextRuleset };
      saveToStorage(byRuleset);
      return { byRuleset };
    });
    },

    getListFilters(rulesetId: string | undefined, page: ListPage): ListParams | undefined {
      ensureHydrated();
      if (!rulesetId) return undefined;
      const ruleset = get().byRuleset[rulesetId];
      const params = ruleset?.[page] as ListParams | undefined;
      if (!params || (!params.title && !params.category)) return undefined;
      return params;
    },

    setScriptsFilters(rulesetId: string, partial: SetScriptsPartial) {
      ensureHydrated();
      set((state) => {
        const ruleset = state.byRuleset[rulesetId] ?? {};
        const current = (ruleset.scripts as ScriptsParams | undefined) ?? {};
        const next: ScriptsParams = {
          q:
            partial.q === null
              ? undefined
              : partial.q !== undefined
                ? partial.q
                : current.q,
          type:
            partial.type === null || partial.type === 'all'
              ? undefined
              : partial.type !== undefined
                ? partial.type
                : current.type,
        };
        if (!next.q) delete next.q;
        if (!next.type || next.type === 'all') delete next.type;
        const nextRuleset = { ...ruleset, scripts: next };
        const byRuleset = { ...state.byRuleset, [rulesetId]: nextRuleset };
        saveToStorage(byRuleset);
        return { byRuleset };
      });
    },

    getScriptsFilters(rulesetId: string | undefined): ScriptsParams | undefined {
      ensureHydrated();
      if (!rulesetId) return undefined;
      const ruleset = get().byRuleset[rulesetId];
      const params = ruleset?.scripts;
      if (!params || (!params.q && !params.type)) return undefined;
      return params;
    },

    clearGridFilters(rulesetId: string, page: GridPage) {
      get().setGridFilters(rulesetId, page, { filter: null, sort: null });
    },

    clearListFilters(rulesetId: string, page: ListPage) {
      get().setListFilters(rulesetId, page, { title: null, category: null });
    },

    clearScriptsFilters(rulesetId: string) {
      get().setScriptsFilters(rulesetId, { q: null, type: null });
    },
  };
});
