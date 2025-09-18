import { useError } from '@/hooks';
import { FileManager } from '@/lib/compass-file-manager';
import { useUserStore } from '@/stores';
import { useEffect, useState } from 'react';

export const useUserEffects = () => {
  const { usernames, fetchAndSetUsers, setCurrentUser, currentUser, setLoading, error } =
    useUserStore();
  const [hasRootDir, setHasDir] = useState(FileManager.hasRootDir());

  useError({
    error,
    message: 'Unable to get current user. Please try again.',
    status: 'error',
  });

  useEffect(() => {
    if (!usernames && hasRootDir) {
      fetchAndSetUsers();
    }
  }, [usernames, fetchAndSetUsers, hasRootDir]);

  useEffect(() => {
    window.addEventListener('qb.fileManagerReady', () => {
      setHasDir(FileManager.hasRootDir());
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('qb.lastLoggedInUsername', currentUser.username);
      return;
    }

    const lastLoggedInUsername = localStorage.getItem('qb.lastLoggedInUsername');

    if (!lastLoggedInUsername) {
      setLoading(false);
    }

    if (lastLoggedInUsername && !currentUser) {
      window.addEventListener('qb.fileManagerReady', () => {
        setCurrentUser(lastLoggedInUsername);
      });
    }
  }, [currentUser, setCurrentUser, setLoading]);

  return {
    hasRootDir,
  };
};
