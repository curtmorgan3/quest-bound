import { useError } from '@/hooks';
import { useUserStore } from '@/stores';
import { useEffect } from 'react';

export const useCurrentUser = () => {
  const { currentUser, setCurrentUser, error } = useUserStore();

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('qb.lastLoggedInUsername', currentUser.username);
      return;
    }

    const lastLoggedInUsername = localStorage.getItem('qb.lastLoggedInUsername');

    if (lastLoggedInUsername && !currentUser) {
      setCurrentUser(lastLoggedInUsername);
    }
  }, [currentUser, setCurrentUser]);

  useError({
    error,
    message: 'Unable to get current user. Please try again.',
    status: 'error',
  });

  const revokeCurrentUser = () => {
    setCurrentUser(null);
  };

  return {
    currentUser,
    setCurrentUser,
    isCreator: false,
    error: null,
    maxPlayers: 20,
    revokeCurrentUser,
    loading: false,
  };
};
