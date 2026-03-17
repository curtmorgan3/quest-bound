import { useAssetPreloadStore } from '@/stores/asset-preload-store';
import {
  getCampaignsAssetIds,
  getCharactersAssetIds,
  getRulesetAssetIds,
  getRulesetsAssetIds,
  preloadAssetIds,
} from '@/stores/db/preload-assets';
import type { Campaign, Character, Ruleset } from '@/types';
import { useEffect } from 'react';

/**
 * Preloads ruleset images (cover + landing CTA assets) into the memoization cache
 * when the rulesets page is shown, so cards render with images without async middleware.
 * Bumps a version after preload so useRulesets re-queries and records get injected images.
 */
export function usePreloadRulesetAssets(rulesets: (Ruleset | null | undefined)[] | undefined) {
  const bumpRulesetListPreload = useAssetPreloadStore((s) => s.bumpRulesetListPreload);

  useEffect(() => {
    if (!rulesets?.length) return;
    const ids = getRulesetsAssetIds(rulesets);
    if (ids.length === 0) return;
    preloadAssetIds(ids).then(bumpRulesetListPreload);
  }, [rulesets, bumpRulesetListPreload]);
}

/**
 * Preloads the active ruleset's images plus character and campaign assets for the
 * landing page, so the hero/CTA images and linked character/campaign cards show images.
 * Bumps landing preload version after preload so useActiveRuleset re-queries and
 * the ruleset gets injected images.
 * Uses stable deps (id + lengths) to avoid re-running when the bump causes new object refs.
 */
export function usePreloadLandingAssets(
  activeRuleset: Ruleset | null | undefined,
  characters: (Character | null | undefined)[] | undefined,
  campaigns: (Campaign | null | undefined)[] | undefined,
) {
  const bumpLandingPreload = useAssetPreloadStore((s) => s.bumpLandingPreload);
  const rulesetId = activeRuleset?.id;
  const charactersLength = characters?.length ?? 0;
  const campaignsLength = campaigns?.length ?? 0;

  useEffect(() => {
    const ids = [
      ...getRulesetAssetIds(activeRuleset),
      ...getCharactersAssetIds(characters ?? []),
      ...getCampaignsAssetIds(campaigns ?? []),
    ].filter(Boolean);
    if (ids.length === 0) return;
    preloadAssetIds(ids).then(bumpLandingPreload);
    // Stable deps only so bump → re-query → new refs don't re-run this effect
  }, [rulesetId, charactersLength, campaignsLength, bumpLandingPreload]);
}
