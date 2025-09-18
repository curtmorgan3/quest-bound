import { FileManager } from '@/lib/compass-file-manager';
import type { User } from '@/types';
import { create } from 'zustand';
import type { CompassStore } from './types';

interface UserStore extends CompassStore {
  currentUser: User | null;
  setCurrentUser: (username: string | null) => void;
  createUser: (username: string) => Promise<User>;
  usernames: string[] | null;
  fetchAndSetUsers: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setRootDir: () => Promise<void>;
}

export const useUserStore = create<UserStore>()((set, get) => ({
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
        set({ usernames: usernames.sort() });
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

      const { usernames } = get();

      if (user) {
        if (!usernames?.includes(username)) {
          set({ usernames: [...(usernames || []), username] });
        }
        set({ currentUser: user });
      }
    } catch (e) {
      set({ error: e as Error });
    } finally {
      set({ loading: false });
    }
  },
  createUser: async (username) => {
    set({ loading: true });
    try {
      set({ error: undefined });
      const newUser = await FileManager.createUser(username);
      const { usernames } = get();
      if (newUser) {
        if (!usernames?.includes(username)) {
          set({ usernames: [...(usernames || []), username] });
        }
        set({ currentUser: newUser });
      }
      return newUser;
    } catch (e) {
      set({ error: e as Error });
      throw e;
    } finally {
      set({ loading: false });
    }
  },
  setRootDir: () => FileManager.setRootDirectory(),
}));
