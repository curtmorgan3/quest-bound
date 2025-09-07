import { User } from '@/libs/compass-api/_types';
import { createContext, useState } from 'react';

interface CompassStore {
  loading: boolean;
  error: Error | null;
}

interface UserContext extends CompassStore {
  currentUser: User | null;
  setCurrentUser: (username: string) => User | null;
}

export const UserContext = createContext<UserContext>(null!);
export const UserProvider = UserContext.Provider;

export const useUserContextState = (): UserContext => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const setCurrentUser = (username: string) => {
    // Find user from file manager and set it.
    return null;
  };

  console.log('current User:', currentUser);

  return {
    currentUser,
    setCurrentUser,
    loading,
    error,
  };
};
