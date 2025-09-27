import { db, useCurrentUser } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssets } from '../assets';
import { useRulesets } from '../rulesets';

type UpdateUser = {
  username?: string;
  assetId?: string | null;
  preferences?: Record<string, any>;
  rulesets?: string[];
};

export const useUsers = () => {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { deleteAsset } = useAssets();
  const { deleteRuleset } = useRulesets();
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
      image: null,
      assetId: null,
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

  const updateUser = async (id: string, updates: UpdateUser) => {
    setLoading(true);
    try {
      const user = await db.users.get(id);
      if (!user) {
        console.error('User not found for id', id);
        setLoading(false);
        return;
      }

      if (updates.assetId === null) {
        console.log(user);
        if (user?.assetId) {
          await deleteAsset(user.assetId);
        }
      }

      const userUpdates = {
        ...user,
        ...updates,
        image: null,
        updatedAt: new Date().toISOString(),
      };
      await db.users.put(userUpdates);

      const updatedUser = await db.users.get(id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    } catch (e) {
      console.error('Failed to update user', e);
    }
    setLoading(false);
  };

  const deleteUser = async (id: string) => {
    setLoading(true);
    try {
      const user = await db.users.get(id);
      if (!user) {
        console.error('User not found for id', id);
        setLoading(false);
        return;
      }

      // Delete associated rulesets
      for (const rulesetId of user.rulesets || []) {
        await deleteRuleset(rulesetId);
      }

      if (user.assetId) {
        await deleteAsset(user.assetId);
      }

      await db.users.delete(id);
      if (currentUser?.id === id) {
        setCurrentUser(null);
        navigate('/');
      }
    } catch (e) {
      console.error('Failed to delete user', e);
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
    deleteUser,
    loading,
  };
};
