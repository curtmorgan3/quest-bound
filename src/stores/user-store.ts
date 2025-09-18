import { FileManager } from '@/lib/compass-file-manager';
import type { User } from '@/types';
import { create } from 'zustand';
import type { CompassStore } from './types';

interface UserStore extends CompassStore {
  currentUser: User | null;
  setCurrentUser: (username: string | null) => void;
  usernames: string[] | null;
  fetchAndSetUsers: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  currentUser: null,
  usernames: null,
  loading: true,
  error: undefined,
  setLoading: (loading) => set({ loading }),
  fetchAndSetUsers: async () => {
    try {
      set({ error: undefined });
      const usernames = await FileManager.getUsernames();
      if (usernames) {
        set({ usernames });
      }
    } catch (e) {
      set({ error: e as Error });
    }
  },
  setCurrentUser: async (username) => {
    set({ loading: true });
    if (!username) {
      set({ currentUser: null, loading: false });
      return;
    }

    try {
      set({ loading: true, error: undefined });
      const user = await FileManager.getUser(username);
      if (user) {
        set({ currentUser: user });
      }
    } catch (e) {
      set({ error: e as Error });
    } finally {
      set({ loading: false });
    }
  },
}));
