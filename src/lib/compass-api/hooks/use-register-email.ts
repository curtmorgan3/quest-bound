import { useNotifications } from '@/hooks';
import { useState } from 'react';

export const useRegisterEmail = () => {
  const existingEmail = localStorage.getItem('user-email');

  const { addNotification } = useNotifications();
  const [email, setEmail] = useState<string | null>(existingEmail);
  const [loading, setLoading] = useState(false);

  const registerEmail = async () => {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    try {
      setLoading(true);
      const response = await fetch('https://api.questbound.com/register-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register email: ${response.statusText}`);
      }

      localStorage.setItem('user-email', email);
      addNotification('Email registered successfully');
    } catch (e) {
      addNotification(`Failed to register email`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    registerEmail,
    emailRegistered: !!localStorage.getItem('user-email'),
    loading,
  };
};
