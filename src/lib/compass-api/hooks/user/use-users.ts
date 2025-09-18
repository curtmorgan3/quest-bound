import { useUserStore } from '@/stores';
import { useUserEffects } from './use-user-effects';

export const useUsers = () => {
  const { usernames, setCurrentUser, currentUser, loading, createUser, setRootDir } =
    useUserStore();
  const { hasRootDir } = useUserEffects();

  const signOut = () => {
    localStorage.removeItem('qb.lastLoggedInUsername');
    setCurrentUser(null);
  };

  return {
    currentUser,
    setCurrentUser,
    signOut,
    usernames,
    createUser,
    error: null,
    loading,
    hasRootDir,
    setRootDir,
  };
};
