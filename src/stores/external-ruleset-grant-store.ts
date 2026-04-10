import { create } from 'zustand';

export type ExternalRulesetPermission = 'read_only' | 'full';

interface ExternalRulesetGrantState {
  permissionByRulesetId: Partial<Record<string, ExternalRulesetPermission>>;
  setPermissionsFromRows: (
    rows: { ruleset_id: string; permission: ExternalRulesetPermission }[],
  ) => void;
  clear: () => void;
}

export const useExternalRulesetGrantStore = create<ExternalRulesetGrantState>((set) => ({
  permissionByRulesetId: {},
  setPermissionsFromRows: (rows) => {
    const next: Partial<Record<string, ExternalRulesetPermission>> = {};
    for (const r of rows) {
      next[r.ruleset_id] = r.permission;
    }
    set({ permissionByRulesetId: next });
  },
  clear: () => set({ permissionByRulesetId: {} }),
}));
