import type { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { create } from 'zustand';

interface CloudAuthState {
  cloudUser: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Called once at app startup to restore session and subscribe to auth changes. */
  init: () => Promise<void>;
}

export const useCloudAuthStore = create<CloudAuthState>((set) => ({
  cloudUser: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  init: async () => {
    if (!isCloudConfigured) {
      set({ isLoading: false });
      return;
    }
    try {
      const session = await getSession();
      set({
        session,
        cloudUser: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }

    onAuthStateChange((_event, session) => {
      set({
        session: session ?? null,
        cloudUser: session?.user ?? null,
        isAuthenticated: !!session,
      });
    });
  },
}));
