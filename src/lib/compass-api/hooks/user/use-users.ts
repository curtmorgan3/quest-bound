import { useError } from '@/hooks';
import { db, useCurrentUser } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

export const useUsers = () => {
  const { currentUser, setCurrentUser } = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const users = useLiveQuery(() => db.users.toArray(), []);

  useError({
    error,
    message: error?.message || 'Error in useUsers',
    location: 'useUsers',
    context: { error },
  });

  const signOut = () => {
    setCurrentUser(null);
  };

  useEffect(() => {
    const lastLoggedInUsername = localStorage.getItem('qb.lastLoggedInUsername');
    if (lastLoggedInUsername && users) {
      const user = users.find((u) => u.username === lastLoggedInUsername) || null;
      if (user) {
        setCurrentUser(user);
      }
    }
  }, [setCurrentUser, users]);

  const createUser = async (username: string) => {
    setLoading(true);
    const id = await db.users.add({
      id: crypto.randomUUID(),
      username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {},
      avatar: null,
    });

    const user = await db.users.get(id);
    if (user) {
      setCurrentUser(user);
    }

    setLoading(false);
    return id;
  };

  const setCurrentUserById = async (id: string) => {
    const user = await db.users.get(id);

    if (!user) {
      setError(new Error('User not found for id ' + id));
      return;
    }

    setCurrentUser(user);
  };

  return {
    users,
    currentUser,
    setCurrentUserById,
    signOut,
    createUser,
    loading,
  };
};
