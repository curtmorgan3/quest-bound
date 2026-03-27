import { fetchCloudSyncEnabled, getSession, onAuthStateChange } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

interface CloudAuthState {
  cloudUser: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Server flag: public.users.cloud_enabled (via RPC; not part of JWT session). */
  cloudSyncEnabled: boolean;
  /** True while fetching cloud_sync_enabled() after login. */
  isCloudSyncEligibilityLoading: boolean;
  /** Called once at app startup to restore session and subscribe to auth changes. */
  init: () => Promise<void>;
  /** Re-fetch cloud sync eligibility (e.g. after an admin enables sync in the dashboard). */
  refreshCloudSyncEligibility: () => Promise<void>;
  /** Bumped after org invite accept / leave so cloud ruleset lists refetch (org-linked rulesets). */
  cloudRulesetListEpoch: number;
  touchCloudRulesetList: () => void;
}

/** Dedupes RPC: same Supabase user id + not forced → skip; concurrent calls share one in-flight promise. */
const eligibilityRef: {
  lastFetchedUserId: string | null;
  inFlight: Promise<void> | null;
} = {
  lastFetchedUserId: null,
  inFlight: null,
};

function loadCloudSyncEligibility(
  set: (partial: Partial<CloudAuthState>) => void,
  hasSession: boolean,
  userId: string | null | undefined,
  opts?: { force?: boolean },
): Promise<void> {
  if (!isCloudConfigured || !hasSession || !userId) {
    eligibilityRef.lastFetchedUserId = null;
    set({ cloudSyncEnabled: false, isCloudSyncEligibilityLoading: false });
    return Promise.resolve();
  }

  if (!opts?.force && eligibilityRef.lastFetchedUserId === userId) {
    return Promise.resolve();
  }

  if (eligibilityRef.inFlight) {
    if (!opts?.force) {
      return eligibilityRef.inFlight;
    }
    eligibilityRef.inFlight;
  }

  /** Avoid hiding UI that keys off cloud_sync during background refetch for the same user. */
  const showEligibilityLoading = eligibilityRef.lastFetchedUserId !== userId;

  eligibilityRef.inFlight = (async () => {
    if (showEligibilityLoading) {
      set({ isCloudSyncEligibilityLoading: true });
    }
    try {
      const enabled = await fetchCloudSyncEnabled();
      set({ cloudSyncEnabled: enabled, isCloudSyncEligibilityLoading: false });
      eligibilityRef.lastFetchedUserId = userId;
    } catch {
      set({ cloudSyncEnabled: false, isCloudSyncEligibilityLoading: false });
    } finally {
      eligibilityRef.inFlight = null;
    }
  })();

  return eligibilityRef.inFlight;
}

export const useCloudAuthStore = create<CloudAuthState>((set) => ({
  cloudUser: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  cloudSyncEnabled: false,
  isCloudSyncEligibilityLoading: false,
  cloudRulesetListEpoch: 0,

  touchCloudRulesetList: () => set((s) => ({ cloudRulesetListEpoch: s.cloudRulesetListEpoch + 1 })),

  refreshCloudSyncEligibility: async () => {
    const session = await getSession();
    const userId = session?.user?.id;
    await loadCloudSyncEligibility(set, !!session, userId, { force: true });
  },

  init: async () => {
    if (!isCloudConfigured) {
      set({ isLoading: false, cloudSyncEnabled: false, isCloudSyncEligibilityLoading: false });
      return;
    }

    const applySession = (session: Session | null) => {
      const nextUserId = session?.user?.id ?? null;
      set((state) => {
        const prevUserId = state.cloudUser?.id ?? null;
        const userChanged = prevUserId !== nextUserId;
        return {
          session: session ?? null,
          cloudUser: session?.user ?? null,
          isAuthenticated: !!session,
          isLoading: false,
          ...(userChanged && nextUserId
            ? { cloudSyncEnabled: false, isCloudSyncEligibilityLoading: true }
            : userChanged && !nextUserId
              ? { cloudSyncEnabled: false, isCloudSyncEligibilityLoading: false }
              : {}),
        };
      });
      void loadCloudSyncEligibility(set, !!session, nextUserId ?? undefined);
    };

    try {
      const session = await getSession();
      applySession(session);
    } catch {
      set({
        isLoading: false,
        cloudSyncEnabled: false,
        isCloudSyncEligibilityLoading: false,
      });
    }

    onAuthStateChange((_event, session) => {
      applySession(session);
    });
  },
}));
