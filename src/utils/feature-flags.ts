/** localStorage key prefix for feature flags. Values are "true" or "false". */
export const FEATURE_FLAG_PREFIX = 'feature.';

export function getFeatureFlagKey(name: string): string {
  return `${FEATURE_FLAG_PREFIX}${name}`;
}

export function getFeatureFlag(name: string): boolean {
  if (typeof window === 'undefined') return false;
  const value = localStorage.getItem(getFeatureFlagKey(name));
  return value === 'true';
}

export function setFeatureFlag(name: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getFeatureFlagKey(name), enabled ? 'true' : 'false');
  window.dispatchEvent(
    new CustomEvent('feature-flag-change', { detail: { flagName: name } })
  );
}

export function removeFeatureFlag(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(getFeatureFlagKey(name));
  window.dispatchEvent(
    new CustomEvent('feature-flag-change', { detail: { flagName: name } })
  );
}

/** List all feature flag keys (without prefix) from localStorage. */
export function listFeatureFlagNames(): string[] {
  if (typeof window === 'undefined') return [];
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(FEATURE_FLAG_PREFIX)) {
      names.push(key.slice(FEATURE_FLAG_PREFIX.length));
    }
  }
  return names.sort();
}

export type FeatureFlagEntry = { name: string; enabled: boolean };

/** List all feature flags with their current enabled state. */
export function listFeatureFlags(): FeatureFlagEntry[] {
  return listFeatureFlagNames().map((name) => ({
    name,
    enabled: getFeatureFlag(name),
  }));
}
