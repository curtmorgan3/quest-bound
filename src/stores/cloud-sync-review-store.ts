import { commitRulesetSync, planRulesetSync, type RulesetSyncPlanOk } from '@/lib/cloud/sync/sync-service';
import { sumSyncEntityCounts } from '@/lib/cloud/sync/sync-entity-labels';
import type { DB } from '@/stores/db/hooks/types';
import { create } from 'zustand';
import { useCloudSyncSummaryPanelStore } from './cloud-sync-summary-panel-store';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';

interface CloudSyncReviewState {
  open: boolean;
  plan: RulesetSyncPlanOk | null;
  rulesetId: string | null;
  planning: boolean;
  committing: boolean;
  startReview: (rulesetId: string, db: DB) => Promise<void>;
  cancel: () => void;
  confirm: (db: DB) => Promise<void>;
}

export const useCloudSyncReviewStore = create<CloudSyncReviewState>((set, get) => ({
  open: false,
  plan: null,
  rulesetId: null,
  planning: false,
  committing: false,

  cancel: () => set({ open: false, plan: null, rulesetId: null }),

  startReview: async (rulesetId, db) => {
    const s = get();
    if (useSyncStateStore.getState().isSyncing || s.planning || s.committing || s.open) return;
    set({ planning: true, rulesetId });
    const result = await planRulesetSync(rulesetId, db);
    set({ planning: false });
    if ('error' in result) {
      useSyncStateStore.getState().setSyncError(result.error);
      set({ rulesetId: null });
      return;
    }
    const pullTotal = sumSyncEntityCounts(result.pulledByEntity);
    const pushTotal = sumSyncEntityCounts(result.pushedByEntity);
    if (pullTotal === 0 && pushTotal === 0) {
      const outcome = await commitRulesetSync(rulesetId, db, result);
      set({ rulesetId: null });
      if (!outcome.error) {
        useCloudSyncSummaryPanelStore.getState().showSummary(outcome);
      }
      return;
    }
    set({ open: true, plan: result });
  },

  confirm: async (db) => {
    const { plan, rulesetId } = get();
    if (!plan || !rulesetId) return;
    set({ committing: true, open: false });
    const outcome = await commitRulesetSync(rulesetId, db, plan);
    set({ committing: false, plan: null, rulesetId: null });
    if (!outcome.error) {
      useCloudSyncSummaryPanelStore.getState().showSummary(outcome);
    }
  },
}));
