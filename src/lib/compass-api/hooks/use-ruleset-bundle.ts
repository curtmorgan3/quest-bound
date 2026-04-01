import { useCallback } from 'react';

import { useFeatureFlag } from '@/hooks';

/** Feature flag (see `@/utils/feature-flags`). On localhost, when enabled, ruleset bundle requests use the local dev API. */
export const LOCAL_RULESET_BUNDLE_API_FEATURE_FLAG = 'localRulesetBundle';

const RULESET_BUNDLE_API_LOCAL = 'http://localhost:8888/get-ruleset-bundle';
const RULESET_BUNDLE_API_PROD = 'https://api.questbound.com/get-ruleset-bundle';

const slugKeyMap = new Map([
  ['dnd', 'dnd'],
  ['d&d', 'dnd'],
]);

/**
 * Hook that returns a function to fetch a ruleset bundle by slug via GET.
 *
 * @example
 * const { getRulesetBundle } = useRulesetBundle();
 * const res = await getRulesetBundle('my-game');
 * const blob = await res.blob();
 */
export function useRulesetBundle() {
  const localBundleApiEnabled = useFeatureFlag(LOCAL_RULESET_BUNDLE_API_FEATURE_FLAG, false);
  const isLocalhost =
    typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  const baseUrl =
    isLocalhost && localBundleApiEnabled ? RULESET_BUNDLE_API_LOCAL : RULESET_BUNDLE_API_PROD;

  const getRulesetBundle = useCallback(
    async (slug: string): Promise<Response> => {
      const key = slugKeyMap.get(slug) ?? slug;

      const url = `${baseUrl}?key=${encodeURIComponent(key)}`;
      return fetch(url, { method: 'GET' });
    },
    [baseUrl],
  );

  return { getRulesetBundle };
}
