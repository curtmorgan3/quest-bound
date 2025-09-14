import { useCallback } from 'react';
import { useCurrentUser } from './use-current-user';

interface UseSignOut {
  signOut: () => void;
}

export const useSignOut = (): UseSignOut => {
  const { revokeCurrentUser } = useCurrentUser();

  const signOut = useCallback(async () => {
    localStorage.removeItem('last-viewed-ruleset-id');
    revokeCurrentUser();
    window.location.reload();
  }, []);

  return {
    signOut,
  };
};
