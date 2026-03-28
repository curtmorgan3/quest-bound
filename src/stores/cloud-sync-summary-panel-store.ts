import type { CloudSyncOutcome } from '@/lib/cloud/sync/sync-service';
import { create } from 'zustand';

interface CloudSyncSummaryPanelState {
  open: boolean;
  expanded: boolean;
  outcome: CloudSyncOutcome | null;
  showSummary: (outcome: CloudSyncOutcome) => void;
  dismiss: () => void;
  setExpanded: (expanded: boolean) => void;
}

export const useCloudSyncSummaryPanelStore = create<CloudSyncSummaryPanelState>((set) => ({
  open: false,
  expanded: false,
  outcome: null,
  showSummary: (outcome) => set({ open: true, expanded: false, outcome }),
  dismiss: () => set({ open: false, expanded: false, outcome: null }),
  setExpanded: (expanded) => set({ expanded }),
}));
