import { get as getKeyval, set as setKeyval } from 'idb-keyval';
import { create } from 'zustand';
import type { DB } from '@/stores/db/hooks/types';
import { getRulesetIdForDelete } from './sync-utils';

const LAST_SYNCED_KEY = 'qb.cloud.lastSyncedAt';
const PENDING_DELETES_KEY = 'qb.cloud.pendingDeletes';
const SYNCED_RULESETS_KEY = 'qb.cloud.syncedRulesetIds';

export interface PendingSyncDelete {
  tableName: string;
  entityId: string;
  rulesetId: string;
}

export interface SyncState {
  isSyncing: boolean;
  /** keyed by rulesetId → ISO timestamp */
  lastSyncedAt: Record<string, string>;
  syncError: string | null;
  syncProgress: { current: number; total: number } | null;
  /** ruleset IDs with unsynced local changes (transient) */
  pendingPushRulesets: Set<string>;
  /** ruleset IDs marked as cloud-synced (after first push). Persisted in idb-keyval. */
  syncedRulesetIds: Set<string>;
  /** ruleset ID currently being viewed (for visibility-triggered sync). Transient. */
  currentRulesetId: string | null;
  /** timestamp of last completed sync (for 10s visibility debounce). Transient. */
  lastSyncCompletedAt: number;
  /** When true, the push-to-cloud dialog (e.g. in ruleset sidebar) should open. */
  pushDialogOpen: boolean;
  setSyncing: (value: boolean) => void;
  setSyncError: (error: string | null) => void;
  setSyncProgress: (progress: { current: number; total: number } | null) => void;
  setLastSyncedAt: (rulesetId: string, iso: string) => void;
  loadLastSyncedAt: () => Promise<void>;
  addPendingPushRuleset: (rulesetId: string) => void;
  clearPendingPushRuleset: (rulesetId: string) => void;
  setCurrentRulesetId: (rulesetId: string | null) => void;
  setLastSyncCompletedAt: (timestamp: number) => void;
  loadSyncedRulesetIds: () => Promise<void>;
  markRulesetSynced: (rulesetId: string) => Promise<void>;
  removeSyncedRulesetId: (rulesetId: string) => Promise<void>;
  isCloudSynced: (rulesetId: string) => boolean;
  setPushDialogOpen: (open: boolean) => void;
}

export const useSyncStateStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncedAt: {},
  syncError: null,
  syncProgress: null,
  pendingPushRulesets: new Set(),
  syncedRulesetIds: new Set(),
  currentRulesetId: null,
  lastSyncCompletedAt: 0,
  pushDialogOpen: false,

  setSyncing: (value) => set({ isSyncing: value }),
  setSyncError: (error) => set({ syncError: error }),
  setSyncProgress: (progress) => set({ syncProgress: progress }),
  setLastSyncedAt: (rulesetId, iso) => {
    const next = { ...get().lastSyncedAt, [rulesetId]: iso };
    set({ lastSyncedAt: next });
    setKeyval(LAST_SYNCED_KEY, next).catch(() => {});
  },
  loadLastSyncedAt: async () => {
    try {
      const stored = await getKeyval<Record<string, string>>(LAST_SYNCED_KEY);
      set({ lastSyncedAt: stored ?? {} });
    } catch {
      set({ lastSyncedAt: {} });
    }
  },
  addPendingPushRuleset: (rulesetId) => {
    set((s) => ({
      pendingPushRulesets: new Set(s.pendingPushRulesets).add(rulesetId),
    }));
  },
  clearPendingPushRuleset: (rulesetId) => {
    set((s) => {
      const next = new Set(s.pendingPushRulesets);
      next.delete(rulesetId);
      return { pendingPushRulesets: next };
    });
  },
  setCurrentRulesetId: (rulesetId) => set({ currentRulesetId: rulesetId }),
  setLastSyncCompletedAt: (timestamp) => set({ lastSyncCompletedAt: timestamp }),
  loadSyncedRulesetIds: async () => {
    try {
      const stored = await getKeyval<string[]>(SYNCED_RULESETS_KEY);
      set({ syncedRulesetIds: new Set(stored ?? []) });
    } catch {
      set({ syncedRulesetIds: new Set() });
    }
  },
  markRulesetSynced: async (rulesetId) => {
    const next = new Set(get().syncedRulesetIds).add(rulesetId);
    set({ syncedRulesetIds: next });
    await setKeyval(SYNCED_RULESETS_KEY, Array.from(next));
  },
  removeSyncedRulesetId: async (rulesetId) => {
    const next = new Set(get().syncedRulesetIds);
    next.delete(rulesetId);
    set({ syncedRulesetIds: next });
    await setKeyval(SYNCED_RULESETS_KEY, Array.from(next));
  },
  isCloudSynced: (rulesetId) => get().syncedRulesetIds.has(rulesetId),
  setPushDialogOpen: (open) => set({ pushDialogOpen: open }),
}));

/** Read current isSyncing without subscribing. Use in Dexie hooks. */
export function getSyncState(): { isSyncing: boolean } {
  return { isSyncing: useSyncStateStore.getState().isSyncing };
}

export async function getStoredLastSyncedAt(): Promise<Record<string, string>> {
  try {
    const stored = await getKeyval<Record<string, string>>(LAST_SYNCED_KEY);
    return stored ?? {};
  } catch {
    return {};
  }
}

export async function setStoredLastSyncedAt(lastSyncedAt: Record<string, string>): Promise<void> {
  await setKeyval(LAST_SYNCED_KEY, lastSyncedAt);
}

export async function getPendingSyncDeletes(): Promise<PendingSyncDelete[]> {
  try {
    const list = await getKeyval<PendingSyncDelete[]>(PENDING_DELETES_KEY);
    return list ?? [];
  } catch {
    return [];
  }
}

export async function addPendingSyncDelete(record: PendingSyncDelete): Promise<void> {
  const list = await getPendingSyncDeletes();
  if (list.some((r) => r.tableName === record.tableName && r.entityId === record.entityId))
    return;
  list.push(record);
  await setKeyval(PENDING_DELETES_KEY, list);
}

export async function clearPendingSyncDeletesForRuleset(rulesetId: string): Promise<void> {
  const list = await getPendingSyncDeletes();
  const filtered = list.filter((r) => r.rulesetId !== rulesetId);
  if (filtered.length !== list.length) await setKeyval(PENDING_DELETES_KEY, filtered);
}

export async function takePendingSyncDeletesForRuleset(
  rulesetId: string,
): Promise<PendingSyncDelete[]> {
  const list = await getPendingSyncDeletes();
  const taken = list.filter((r) => r.rulesetId === rulesetId);
  const rest = list.filter((r) => r.rulesetId !== rulesetId);
  await setKeyval(PENDING_DELETES_KEY, rest);
  return taken;
}

/**
 * Record a local delete for sync: if not currently syncing and we can resolve rulesetId,
 * add to pending sync_deletes so the next push will propagate the delete.
 */
export async function recordSyncDelete(
  db: DB,
  tableName: string,
  entityId: string,
  entity?: Record<string, unknown> | null,
): Promise<void> {
  if (getSyncState().isSyncing) return;
  const rulesetId = await getRulesetIdForDelete(db, tableName, entityId, entity);
  if (!rulesetId) return;
  await addPendingSyncDelete({ tableName, entityId, rulesetId });
}
