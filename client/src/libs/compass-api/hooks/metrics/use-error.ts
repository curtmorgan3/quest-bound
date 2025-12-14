import { NotificationPriority, useNotifications } from '@/stores';
import { useEffect } from 'react';

interface UseErrorProps {
  message: string;
  error?:  Error;
  priority?: NotificationPriority;
  status?: 'error' | 'success' | 'info';
  location?: string;
  context?: Record<any, any>;
}

export const useError = ({
  error,
  message,
  priority,
  status,
  location,
  context = {},
}: UseErrorProps) => {
  const notificationContext = useNotifications();
  const addNotification = notificationContext?.addNotification ?? (() => null);

  const onError = (e: any, context: Record<any, any> = {}) => {
    if (e.message === 'Limit exceeded') {
      // Upgrade CTA
      notificationContext?.setUpgradeCta(true);
    } else {
      addNotification({
        message,
        priority: priority ?? NotificationPriority.LOW,
        status: status ?? 'error',
      });
    }
  };

  useEffect(() => {
    if (!error) return;

    onError(error, context);
  }, [error]);

  return {
    onError,
  };
};
