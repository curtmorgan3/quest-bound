import { FileManager } from '@/libs/compass-file-manager';
import type { User } from '@/types';
import { create } from 'zustand';
import type { CompassStore } from './types';

interface UserStore extends CompassStore {
  currentUser: User | null;
  setCurrentUser: (username: string | null) => void;
}

export const useUserStore = create<UserStore>()((set) => ({
  currentUser: null,
  loading: false,
  error: undefined,
  setCurrentUser: async (username) => {
    if (!username) {
      set({ currentUser: null });
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
