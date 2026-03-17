import { create } from 'zustand';

/**
 * Bumping these versions after preloading assets causes the corresponding
 * useLiveQueries to re-run so records get injected images from the cache.
 */
interface AssetPreloadStore {
  rulesetListPreloadVersion: number;
  bumpRulesetListPreload: () => void;
  landingPreloadVersion: number;
  bumpLandingPreload: () => void;
}

export const useAssetPreloadStore = create<AssetPreloadStore>((set) => ({
  rulesetListPreloadVersion: 0,
  bumpRulesetListPreload: () =>
    set((s) => ({ rulesetListPreloadVersion: s.rulesetListPreloadVersion + 1 })),
  landingPreloadVersion: 0,
  bumpLandingPreload: () => set((s) => ({ landingPreloadVersion: s.landingPreloadVersion + 1 })),
}));
