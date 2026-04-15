import { useNotifications } from '@/hooks';
import { registerEmail as registerEmailWithApi } from '@/lib/cloud/auth';
import { db } from '../db';
import { useCurrentUser } from '@/stores/current-user-store';
import { useEffect, useState } from 'react';

export const useRegisterEmail = () => {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const { addNotification } = useNotifications();
  const [email, setEmail] = useState<string | null>(currentUser?.email ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(currentUser?.email ?? null);
  }, [currentUser?.id, currentUser?.email]);

  const registerEmail = async () => {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    if (!currentUser) {
      throw new Error('No user selected');
    }

    try {
      setLoading(true);
      const result = await registerEmailWithApi(email.trim());
      if (result.error) {
        addNotification('Failed to register email', { type: 'error' });
        return;
      }
      const updatedAt = new Date().toISOString();
      await db.users.update(currentUser.id, {
        email: email.trim(),
        emailVerified: true,
        updatedAt,
      });
      const updatedUser = await db.users.get(currentUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
      addNotification('Email registered successfully');
    } catch (e) {
      addNotification('Failed to register email', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    registerEmail,
    emailRegistered: !!currentUser?.email,
    loading,
  };
};
