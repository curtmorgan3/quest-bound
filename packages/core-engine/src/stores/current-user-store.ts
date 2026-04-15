import type { User } from '@/types';
import { create } from 'zustand';

interface UserStore {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

export const useCurrentUser = create<UserStore>()((set) => ({
  currentUser: null,
  setCurrentUser: (user: User | null) => {
    if (!user) {
      localStorage.removeItem('qb.lastLoggedInUsername');
      set({ currentUser: null });
      return;
    }
    localStorage.setItem('qb.lastLoggedInUsername', user.username);
    set({ currentUser: user });
  },
}));
