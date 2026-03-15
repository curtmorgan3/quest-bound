/**
 * Sync service: orchestrator (pull → push), first-push, and triggers.
 * Step 6: syncRuleset with auth/online gating, sync-on-open, visibility, manual Sync Now.
 */

import { isCloudConfigured } from '@/lib/cloud/client';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import type { DB } from '@/stores/db/hooks/types';
import { useSyncStateStore } from './sync-state';
import { syncPull } from './sync-pull';
import { syncPush } from './sync-push';

export { syncPull, syncPush };

const VISIBILITY_DEBOUNCE_MS = 10_000;

/**
 * Full sync for a ruleset: pull then push, update lastSyncedAt and lastSyncCompletedAt.
 * No-ops if cloud not configured, not authenticated, or offline. Skips if already syncing.
 */
export async function syncRuleset(rulesetId: string, db: DB): Promise<{ error?: string }> {
  if (!isCloudConfigured) return {};
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return {};
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError, setLastSyncCompletedAt } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  setSyncError(null);
  const pullResult = await syncPull(rulesetId, db);
  if (pullResult.error) return pullResult;
  const pushResult = await syncPush(rulesetId, db);
  if (pushResult.error) return pushResult;

  useSyncStateStore.getState().setLastSyncCompletedAt(Date.now());
  return {};
}

/**
 * First push to cloud: push only (no pull), then mark ruleset as cloud-synced.
 * Use for the initial "Push to Cloud" action.
 */
export async function pushToCloudAndMarkSynced(rulesetId: string, db: DB): Promise<{ error?: string }> {
  if (!isCloudConfigured) return { error: 'Cloud not configured' };
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return { error: 'Not signed in' };
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  setSyncError(null);
  const result = await syncPush(rulesetId, db);
  if (result.error) return result;
  await useSyncStateStore.getState().markRulesetSynced(rulesetId);
  useSyncStateStore.getState().setLastSyncCompletedAt(Date.now());
  return {};
}

let visibilityListenerRegistered = false;

/**
 * Register visibilitychange listener: when tab becomes visible, sync current ruleset if
 * cloud-synced and last sync completed more than 10s ago. Call once at app init with db.
 */
export function initSyncTriggers(db: DB): void {
  if (!isCloudConfigured || visibilityListenerRegistered) return;
  visibilityListenerRegistered = true;

  useSyncStateStore.getState().loadSyncedRulesetIds();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const { currentRulesetId, lastSyncCompletedAt, isCloudSynced } = useSyncStateStore.getState();
    if (!currentRulesetId || !isCloudSynced(currentRulesetId)) return;
    if (Date.now() - lastSyncCompletedAt < VISIBILITY_DEBOUNCE_MS) return;
    if (!useCloudAuthStore.getState().isAuthenticated || !navigator.onLine) return;

    syncRuleset(currentRulesetId, db).catch(() => {});
  });
}
