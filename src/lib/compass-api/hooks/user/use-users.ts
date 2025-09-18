import { FileManager } from '@/lib/compass-file-manager';
import { useUserStore } from '@/stores';
import { useUserEffects } from './use-user-effects';

export const useUsers = () => {
  const { usernames, setCurrentUser, currentUser, loading } = useUserStore();
  const { hasRootDir } = useUserEffects();

  const createUser = async (username: string) => {
    if (usernames?.find((u) => u === username)) {
      throw new Error('User already exists');
    }

    const newUser = await FileManager.createUser(username);
    setCurrentUser(newUser.username);
  };

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
    setRootDir: () => FileManager.setRootDirectory(),
  };
};
