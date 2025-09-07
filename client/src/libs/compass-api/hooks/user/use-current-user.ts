import { debugLog } from '@/libs/compass-web-utils';
import { useUserStore } from '@/stores/user-store';
import { useEffect } from 'react';
import { useError } from '../metrics';

const debug = debugLog('API', 'useCurrentUser');

export const useCurrentUser = (_pollInterval = 0) => {
  const { currentUser, setCurrentUser, loading, error } = useUserStore();

  useEffect(() => {
    if (!!currentUser || loading) return;

    const lastLoggedInUsername = localStorage.getItem('qb.lastLoggedInUsername');

    if (lastLoggedInUsername) {
      setCurrentUser(lastLoggedInUsername);
    }
  }, [currentUser, loading]);

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
