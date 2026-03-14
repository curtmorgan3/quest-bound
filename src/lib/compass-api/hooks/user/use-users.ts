import { db, deleteAssetIfUnreferenced, useCurrentUser } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRulesets } from '../rulesets';

const LAST_LOGGED_IN_KEY = 'qb.lastLoggedInUsername';

/** Ensures we only attempt to auto-create a user once per app session (avoids Strict Mode + live query timing). */
let hasAttemptedAutoCreate = false;

function randomUsername(): string {
  return `User_${crypto.randomUUID().slice(0, 8)}`;
}

type UpdateUser = {
  username?: string;
  email?: string | null;
  assetId?: string | null;
  image?: string | null;
  preferences?: Record<string, any>;
  cloudUserId?: string | null;
};

export const useUsers = () => {
  const { currentUser, setCurrentUser } = useCurrentUser();
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
    if (users === undefined) return;

    const lastLoggedInUsername = localStorage.getItem(LAST_LOGGED_IN_KEY);

    if (users.length === 0) {
      if (hasAttemptedAutoCreate) return;
      hasAttemptedAutoCreate = true;
      const username = randomUsername();
      db.users
        .add({
          id: crypto.randomUUID(),
          username,
          email: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {},
          image: null,
          assetId: null,
          cloudUserId: null,
        })
        .then((id) => db.users.get(id))
        .then((user) => {
          if (user) setCurrentUser(user);
        });
      return;
    }

    const matchedUser = lastLoggedInUsername
      ? users.find((u) => u.username === lastLoggedInUsername) ?? null
      : null;

    if (!matchedUser) {
      setCurrentUser(users[0]);
    } else {
      setCurrentUser(matchedUser);
    }
  }, [setCurrentUser, users]);

  const createUser = async (username: string) => {
    setLoading(true);
    const id = await db.users.add({
      id: crypto.randomUUID(),
      username,
      email: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {},
      image: null,
      assetId: null,
      cloudUserId: null,
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

      if (updates.assetId === null && user?.assetId) {
        await deleteAssetIfUnreferenced(db, user.assetId);
      }

      const userUpdates = {
        ...user,
        ...updates,
        image: updates.assetId === null && !updates.image ? null : updates.image,
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

      // Delete rulesets owned by this user (createdBy matches username)
      const allRulesets = await db.rulesets.toArray();
      for (const r of allRulesets) {
        if (r.createdBy === user.username) {
          await deleteRuleset(r.id);
        }
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
