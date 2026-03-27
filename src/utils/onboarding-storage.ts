import { del, get, set } from 'idb-keyval';

const KEY_PREFIX = 'qb.onboardingCompleted';

export function getOnboardingStorageKey(userId: string): string {
  return `${KEY_PREFIX}.${userId}`;
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const key = getOnboardingStorageKey(userId);
  const value = await get(key);
  return value === true;
}

export async function setOnboardingCompleted(userId: string): Promise<void> {
  const key = getOnboardingStorageKey(userId);
  await set(key, true);
}

export async function clearOnboardingCompleted(userId: string): Promise<void> {
  const key = getOnboardingStorageKey(userId);
  await del(key);
}

/** Copies onboarding completion from a replaced local profile id to the cloud profile id. */
export async function migrateOnboardingUserId(oldUserId: string, newUserId: string): Promise<void> {
  if (oldUserId === newUserId) return;
  const oldKey = getOnboardingStorageKey(oldUserId);
  const newKey = getOnboardingStorageKey(newUserId);
  const value = await get(oldKey);
  if (value === true) {
    await set(newKey, true);
    await del(oldKey);
  }
}
