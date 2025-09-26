import { db, useCurrentUser } from '@/stores';
import type { User } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const useUsers = () => {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const users = useLiveQuery(() => db.users.toArray(), []);

  const signOut = () => {
    setSearchParams({});
    setCurrentUser(null);
    navigate('/');
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
      rulesets: [],
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
      console.error('User not found for id', id);
      return;
    }

    setCurrentUser(user);
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    setLoading(true);
    try {
      const user = await db.users.get(id);
      if (!user) {
        console.error('User not found for id', id);
        setLoading(false);
        return;
      }

      const updatedUser = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await db.users.put(updatedUser);
      setCurrentUser(updatedUser);
    } catch (e) {
      console.error('Failed to update user', e);
    }
    setLoading(false);
  };

  return {
    users,
    currentUser,
    updateUser,
    setCurrentUserById,
    signOut,
    createUser,
    loading,
  };
};
