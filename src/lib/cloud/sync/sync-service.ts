/**
 * Sync service: orchestrator (pull → push), first-push, init, and cloud-only ruleset listing/install.
 * Sync is UI-driven only (e.g. "Sync Now" button); no auto-sync on open or visibility.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient, isCloudConfigured } from '@/lib/cloud/client';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import type { DB } from '@/stores/db/hooks/types';
import { ASSETS_BUCKET, FONTS_BUCKET, removeStoragePaths } from './sync-assets';
import {
  listUnresolvedSyncMergeConflicts,
  resolveSyncMergeConflict,
} from '@/lib/cloud/sync/sync-merge-conflict-actions';
import { applyStagedPull, planSyncPull, syncPull, type StagedPullPayload } from './sync-pull';
import { planSyncPush, syncPush } from './sync-push';
import { useSyncStateStore } from './sync-state';
import { filterSyncEntityCountsForUi, sumSyncEntityCounts } from './sync-entity-labels';
import { prepareRemoteForLocal } from './sync-utils';

export {
  applyStagedPull,
  listUnresolvedSyncMergeConflicts,
  planSyncPull,
  resolveSyncMergeConflict,
  syncPull,
  syncPush,
  type StagedPullPayload,
};

/** Successful plan for staged ruleset sync (review UI). */
export interface RulesetSyncPlanOk {
  stagedPull: StagedPullPayload;
  pulledByEntity: Record<string, number>;
  pushedByEntity: Record<string, number>;
  pulledCount: number;
  conflictByEntity: Record<string, number>;
  conflictCount: number;
}

export type RulesetSyncPlanResult = { error: string } | RulesetSyncPlanOk;

/** Brief delay before clearing `isSyncing` / overlay so Dexie hooks settle after bulk writes. */
const CLOUD_SYNC_UI_CLEAR_DELAY_MS = 80;

async function withCloudSyncUi<T>(fn: () => Promise<T>): Promise<T> {
  const { setSyncing, setCloudSyncOverlayOpen } = useSyncStateStore.getState();
  setSyncing(true);
  setCloudSyncOverlayOpen(true);
  try {
    return await fn();
  } finally {
    queueMicrotask(() => {
      setTimeout(() => {
        const s = useSyncStateStore.getState();
        s.setSyncing(false);
        if (!s.syncError) {
          s.setCloudSyncOverlayOpen(false);
        }
      }, CLOUD_SYNC_UI_CLEAR_DELAY_MS);
    });
  }
}

/** Overlay only (no Dexie `isSyncing`) while fetching pull/push plans. */
async function withCloudSyncPlanningUi<T>(fn: () => Promise<T>): Promise<T> {
  const { setCloudSyncOverlayOpen } = useSyncStateStore.getState();
  setCloudSyncOverlayOpen(true);
  try {
    return await fn();
  } finally {
    if (!useSyncStateStore.getState().syncError) {
      setCloudSyncOverlayOpen(false);
    }
  }
}

/**
 * Fetch remote deltas and local push preview without mutating IndexedDB.
 */
export async function planRulesetSync(rulesetId: string, db: DB): Promise<RulesetSyncPlanResult> {
  if (!isCloudConfigured) return { error: 'Cloud not configured' };
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return { error: 'Not signed in' };
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  setSyncError(null);
  return await withCloudSyncPlanningUi(async () => {
    const pullPlan = await planSyncPull(rulesetId, db);
    if (pullPlan.error) {
      setSyncError(pullPlan.error);
      return { error: pullPlan.error };
    }
    if (
      !pullPlan.payload ||
      pullPlan.pulledByEntity === undefined ||
      pullPlan.pulledCount === undefined
    ) {
      const msg = 'Pull plan incomplete';
      setSyncError(msg);
      return { error: msg };
    }
    const pushPlan = await planSyncPush(rulesetId, db, { appliedPull: pullPlan.payload });
    if (pushPlan.error) {
      setSyncError(pushPlan.error);
      return { error: pushPlan.error };
    }
    return {
      stagedPull: pullPlan.payload,
      pulledByEntity: pullPlan.pulledByEntity,
      pushedByEntity: pushPlan.pushedByEntity ?? {},
      pulledCount: pullPlan.pulledCount,
      conflictByEntity: pullPlan.conflictByEntity ?? {},
      conflictCount: pullPlan.conflictCount ?? 0,
    };
  });
}

/**
 * Apply staged pull (downloads assets/fonts), then push. Caller supplies the plan from {@link planRulesetSync}.
 */
export async function commitRulesetSync(
  rulesetId: string,
  db: DB,
  plan: RulesetSyncPlanOk,
): Promise<CloudSyncOutcome> {
  if (!isCloudConfigured) return { error: 'Cloud not configured' };
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return { error: 'Not signed in' };
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  const client = cloudClient;
  if (!client) return { error: 'Cloud not configured' };

  setSyncError(null);
  return await withCloudSyncUi(async () => {
    if (plan.stagedPull.conflicts.length > 0) {
      return { error: 'Resolve all merge conflicts before syncing.' };
    }
    const stillOpen = await listUnresolvedSyncMergeConflicts(db, rulesetId);
    if (stillOpen.length > 0) {
      return { error: 'Resolve all merge conflicts before syncing.' };
    }
    await applyStagedPull(db, client, plan.stagedPull);
    const pushResult = await syncPush(rulesetId, db, { appliedPull: plan.stagedPull });
    if (pushResult.error) {
      return {
        error: pushResult.error,
        pulledCount: plan.pulledCount,
        pulledByEntity: plan.pulledByEntity,
      };
    }

    useSyncStateStore.getState().setLastSyncCompletedAt(Date.now());
    return {
      pulledCount: plan.pulledCount,
      pulledByEntity: plan.pulledByEntity,
      pushedCount: pushResult.pushedCount,
      pushedByEntity: pushResult.pushedByEntity,
    };
  });
}

/** Result of a ruleset cloud sync (manual sync or first push). */
export interface CloudSyncOutcome {
  error?: string;
  /** Rows upserted remotely plus delete tombstones pushed. */
  pushedCount?: number;
  /** Local rows written from remote merges plus rows removed via remote delete tombstones. */
  pulledCount?: number;
  /** Counts keyed by Dexie table name (e.g. components, attributes). */
  pushedByEntity?: Record<string, number>;
  pulledByEntity?: Record<string, number>;
}

/** Collapsed cloud sync panel: total pushed and total applied locally. */
export function getCloudSyncCollapsedSummary(
  outcome: Pick<CloudSyncOutcome, 'pushedCount' | 'pulledCount'>,
): string {
  const pushed = outcome.pushedCount ?? 0;
  const pulled = outcome.pulledCount ?? 0;
  if (pushed === 0 && pulled === 0) {
    return 'Already up to date';
  }
  const pushWord = pushed === 1 ? 'change' : 'changes';
  const pullWord = pulled === 1 ? 'update' : 'updates';
  return `${pushed} ${pushWord} pushed · ${pulled} ${pullWord} applied locally`;
}

/**
 * Like {@link getCloudSyncCollapsedSummary}, but excludes hidden entity types from counts
 * (same tables as review dialog). Falls back to aggregate counts when `*ByEntity` is absent.
 */
export function getCloudSyncUiCollapsedSummary(
  outcome: Pick<
    CloudSyncOutcome,
    'pushedCount' | 'pulledCount' | 'pushedByEntity' | 'pulledByEntity'
  >,
): string {
  const { pushedByEntity, pulledByEntity, pushedCount, pulledCount } = outcome;
  const pushVis =
    pushedByEntity !== undefined
      ? sumSyncEntityCounts(filterSyncEntityCountsForUi(pushedByEntity))
      : (pushedCount ?? 0);
  const pullVis =
    pulledByEntity !== undefined
      ? sumSyncEntityCounts(filterSyncEntityCountsForUi(pulledByEntity))
      : (pulledCount ?? 0);
  const pushTot = pushedCount ?? (pushedByEntity ? sumSyncEntityCounts(pushedByEntity) : 0);
  const pullTot = pulledCount ?? (pulledByEntity ? sumSyncEntityCounts(pulledByEntity) : 0);

  if (pushVis === 0 && pullVis === 0) {
    if (pushTot > 0 || pullTot > 0) {
      return 'Character sheet data synced (not listed).';
    }
    return 'Already up to date';
  }
  return getCloudSyncCollapsedSummary({ pushedCount: pushVis, pulledCount: pullVis });
}

/** Minimal ruleset shape for cloud listing (id, title, version, image). */
export interface CloudRulesetSummary {
  id: string;
  title: string;
  version: string;
  image?: string | null;
  ownedByCurrentUser: boolean;
}

/**
 * List rulesets visible in the cloud for the current user (owned + org-linked).
 * RLS on `rulesets` restricts rows; do not filter by `user_id` here.
 */
export async function listCloudRulesets(): Promise<CloudRulesetSummary[]> {
  if (!cloudClient || !isCloudConfigured) return [];
  const session = await getSession();
  if (!session?.user?.id) return [];
  const currentUserId = session.user.id;
  const { data, error } = await cloudClient
    .from('rulesets')
    .select('id, title, version, asset_id, user_id');
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((row) => {
    const prepared = prepareRemoteForLocal(row) as unknown as Omit<
      CloudRulesetSummary,
      'ownedByCurrentUser'
    >;
    return {
      ...prepared,
      ownedByCurrentUser: row.user_id === currentUserId,
    };
  });
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
  const pullResult = await withCloudSyncUi(() => syncPull(rulesetId, db));
  if (pullResult.error) return pullResult;

  const now = new Date().toISOString();
  useSyncStateStore.getState().setLastSyncedAt(rulesetId, now);
  await useSyncStateStore.getState().markRulesetSynced(rulesetId);
  return {};
}

export interface DeleteRemoteRulesetPayload {
  assetPaths: string[];
  fontPaths: string[];
}

/**
 * Permanently remove a ruleset and all associated remote rows for the current user, then
 * delete referenced files from Supabase Storage (best-effort if storage fails).
 */
export async function deleteRulesetFromCloud(rulesetId: string): Promise<{ error?: string }> {
  if (!isCloudConfigured || !cloudClient) return { error: 'Cloud not configured' };
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return { error: 'Not signed in' };
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  const session = await getSession();
  if (!session?.user?.id) return { error: 'Not signed in' };

  const { data, error } = await cloudClient.rpc('delete_remote_ruleset', {
    p_ruleset_id: rulesetId,
  });

  if (error) {
    const msg =
      error.message?.includes('Ruleset not found') || error.code === 'P0002'
        ? 'Ruleset not found in cloud'
        : error.message;
    return { error: msg || 'Delete failed' };
  }

  const payload = data as DeleteRemoteRulesetPayload | null;
  const assetPaths = payload?.assetPaths ?? [];
  const fontPaths = payload?.fontPaths ?? [];

  try {
    await removeStoragePaths(cloudClient, ASSETS_BUCKET, assetPaths);
    await removeStoragePaths(cloudClient, FONTS_BUCKET, fontPaths);
  } catch (e) {
    console.warn('Storage cleanup after remote ruleset delete failed:', e);
  }

  await useSyncStateStore.getState().removeSyncedRulesetId(rulesetId);

  useCloudAuthStore.getState().touchCloudRulesetList();

  return {};
}

/**
 * Full sync for a ruleset: pull then push, update lastSyncedAt and lastSyncCompletedAt.
 * No-ops if cloud not configured, not authenticated, or offline. Skips if already syncing.
 */
export async function syncRuleset(rulesetId: string, db: DB): Promise<CloudSyncOutcome> {
  if (!isCloudConfigured) return {};
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return {};
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  setSyncError(null);
  const syncClient = cloudClient;
  if (!syncClient) return { error: 'Cloud not configured' };
  return await withCloudSyncUi(async () => {
    const pullPlan = await planSyncPull(rulesetId, db);
    if (pullPlan.error) return { error: pullPlan.error };
    if (!pullPlan.payload) return { error: 'Pull failed' };
    if ((pullPlan.conflictCount ?? 0) > 0 || pullPlan.payload.conflicts.length > 0) {
      return {
        error:
          'This ruleset has merge conflicts. Use Review Sync, resolve each conflict, then try again.',
      };
    }
    await applyStagedPull(db, syncClient, pullPlan.payload);
    const pushResult = await syncPush(rulesetId, db, { appliedPull: pullPlan.payload });
    if (pushResult.error) {
      return {
        error: pushResult.error,
        pulledCount: pullPlan.pulledCount,
        pulledByEntity: pullPlan.pulledByEntity,
      };
    }

    useSyncStateStore.getState().setLastSyncCompletedAt(Date.now());
    return {
      pulledCount: pullPlan.pulledCount,
      pulledByEntity: pullPlan.pulledByEntity,
      pushedCount: pushResult.pushedCount,
      pushedByEntity: pushResult.pushedByEntity,
    };
  });
}

/**
 * First push to cloud: push only (no pull), then mark ruleset as cloud-synced.
 * Use for the initial "Push to Cloud" action.
 */
export async function pushToCloudAndMarkSynced(
  rulesetId: string,
  db: DB,
): Promise<CloudSyncOutcome> {
  if (!isCloudConfigured) return { error: 'Cloud not configured' };
  const { isAuthenticated } = useCloudAuthStore.getState();
  if (!isAuthenticated) return { error: 'Not signed in' };
  if (!navigator.onLine) return { error: 'Offline' };

  const { isSyncing, setSyncError } = useSyncStateStore.getState();
  if (isSyncing) return { error: 'Sync already in progress' };

  setSyncError(null);
  return await withCloudSyncUi(async () => {
    const result = await syncPush(rulesetId, db);
    if (result.error) return result;
    await useSyncStateStore.getState().markRulesetSynced(rulesetId);
    useSyncStateStore.getState().setLastSyncCompletedAt(Date.now());
    return {
      pushedCount: result.pushedCount,
      pushedByEntity: result.pushedByEntity,
      pulledCount: 0,
      pulledByEntity: {},
    };
  });
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
