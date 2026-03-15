/**
 * Sync service: orchestrator (pull → push), first-push, init, and cloud-only ruleset listing/install.
 * Sync is UI-driven only (e.g. "Sync Now" button); no auto-sync on open or visibility.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient, isCloudConfigured } from '@/lib/cloud/client';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import type { DB } from '@/stores/db/hooks/types';
import { syncPull } from './sync-pull';
import { syncPush } from './sync-push';
import { useSyncStateStore } from './sync-state';
import { prepareRemoteForLocal } from './sync-utils';

export { syncPull, syncPush };

/** Minimal ruleset shape for cloud listing (id, title, version, image). */
export interface CloudRulesetSummary {
  id: string;
  title: string;
  version: string;
  image?: string | null;
}

/**
 * List rulesets that exist in the cloud for the current user.
 * Returns camelCase records suitable for display.
 */
export async function listCloudRulesets(): Promise<CloudRulesetSummary[]> {
  if (!cloudClient || !isCloudConfigured) return [];
  const session = await getSession();
  if (!session?.user?.id) return [];
  const { data, error } = await cloudClient
    .from('rulesets')
    .select('id, title, version, asset_id')
    .eq('user_id', session.user.id);
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((row) => prepareRemoteForLocal(row) as unknown as CloudRulesetSummary);
}

/**
 * Install a ruleset from the cloud (pull full data, then mark synced).
 * Use for rulesets that exist in the cloud but not locally.
 */
export async function installFromCloud(rulesetId: string, db: DB): Promise<{ error?: string }> {
  if (!isCloudConfigured) return { error: 'Cloud not configured' };
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return { error: 'Not signed in' };
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  setSyncError(null);
  const pullResult = await syncPull(rulesetId, db);
  if (pullResult.error) return pullResult;

  const now = new Date().toISOString();
  useSyncStateStore.getState().setLastSyncedAt(rulesetId, now);
  await useSyncStateStore.getState().markRulesetSynced(rulesetId);
  return {};
}

/**
 * Full sync for a ruleset: pull then push, update lastSyncedAt and lastSyncCompletedAt.
 * No-ops if cloud not configured, not authenticated, or offline. Skips if already syncing.
 */
export async function syncRuleset(rulesetId: string, db: DB): Promise<{ error?: string }> {
  if (!isCloudConfigured) return {};
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return {};
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
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
export async function pushToCloudAndMarkSynced(
  rulesetId: string,
  db: DB,
): Promise<{ error?: string }> {
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

let initDone = false;

/**
 * Load synced ruleset IDs into store at app init. Call once at app init.
 * Sync itself is UI-driven only (e.g. "Sync Now" on ruleset page).
 */
export function initSyncTriggers(_db: DB): void {
  if (!isCloudConfigured || initDone) return;
  initDone = true;
  useSyncStateStore.getState().loadSyncedRulesetIds();
}
