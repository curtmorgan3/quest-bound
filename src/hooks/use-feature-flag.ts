import { getFeatureFlag, listFeatureFlags } from '@/utils/feature-flags';
import { useEffect, useState, useSyncExternalStore } from 'react';

function getFeatureFlagSnapshot(flagName: string): boolean {
  return getFeatureFlag(flagName);
}

function subscribeToFeatureFlag(flagName: string, callback: () => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ flagName: string }>).detail;
    if (detail.flagName === flagName) callback();
  };
  window.addEventListener('feature-flag-change', handler);
  return () => window.removeEventListener('feature-flag-change', handler);
}

/**
 * Returns whether the feature flag is enabled (stored in localStorage under feature.{name}).
 * Updates when the flag is toggled in Dev Tools.
 */
export function useFeatureFlag(flagName: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribeToFeatureFlag(flagName, callback),
    () => getFeatureFlagSnapshot(flagName),
    () => getFeatureFlagSnapshot(flagName),
  );
}

/** Returns all feature flags with their current enabled state. For use in dev tools. */
export function useFeatureFlagList(): Array<{ name: string; enabled: boolean }> {
  const [flags, setFlags] = useState(() => listFeatureFlags());

  useEffect(() => {
    const handler = () => setFlags(listFeatureFlags());
    window.addEventListener('feature-flag-change', handler);
    return () => window.removeEventListener('feature-flag-change', handler);
  }, []);

  return flags;
}

export { getFeatureFlagKey } from '@/utils/feature-flags';
