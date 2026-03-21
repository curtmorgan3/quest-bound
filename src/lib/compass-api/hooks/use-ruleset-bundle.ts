import { useCallback } from 'react';

const DEV =
  window.location.hostname.includes('localhost') &&
  localStorage.getItem('localRulesetBundle') === 'true';

const RULESET_BUNDLE_API_BASE = DEV
  ? 'http://localhost:8888/get-ruleset-bundle'
  : 'https://api.questbound.com/get-ruleset-bundle';

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
  const getRulesetBundle = useCallback(async (slug: string): Promise<Response> => {
    const key = slugKeyMap.get(slug) ?? slug;

    const url = `${RULESET_BUNDLE_API_BASE}?key=${encodeURIComponent(key)}`;
    return fetch(url, { method: 'GET' });
  }, []);

  return { getRulesetBundle };
}
