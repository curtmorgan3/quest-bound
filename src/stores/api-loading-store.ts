import { create } from 'zustand';

export const API_LOADING_KEYS = [
  'scripts',
  'attributes',
  'actions',
  'items',
  'rulesets',
  'charts',
  'documents',
  'components',
  'windows',
] as const;
export type ApiLoadingKey = (typeof API_LOADING_KEYS)[number];

type LoadingState = Record<ApiLoadingKey, boolean>;

type ApiLoadingStore = {
  loading: LoadingState;
  setLoading: (key: ApiLoadingKey, value: boolean) => void;
};

const initialLoading: LoadingState = {
  scripts: false,
  attributes: false,
  actions: false,
  items: false,
  rulesets: false,
  charts: false,
  documents: false,
  components: false,
  windows: false,
};

export const useApiLoadingStore = create<ApiLoadingStore>()((set) => ({
  loading: initialLoading,
  setLoading: (key, value) =>
    set((state) => ({
      loading: { ...state.loading, [key]: value },
    })),
}));

/**
 * Stable selector: returns true if any tracked API is loading.
 * Subscribers only re-render when this boolean flips (Zustand uses Object.is).
 */
export function selectAnyApiLoading(state: ApiLoadingStore): boolean {
  const { loading } = state;
  return (
    loading.scripts ||
    loading.attributes ||
    loading.actions ||
    loading.items ||
    loading.rulesets ||
    loading.charts ||
    loading.documents ||
    loading.components ||
    loading.windows
  );
}
