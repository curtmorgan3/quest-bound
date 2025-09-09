import { NotificationPriority, useNotifications } from '@/stores';
import { debugLog } from '@/utils';
import { useEffect } from 'react';

interface UseErrorProps {
  message: string;
  error?: Error;
  priority?: NotificationPriority;
  status?: 'error' | 'success' | 'info';
  location?: string;
  context?: Record<any, any>;
}

const debug = debugLog('API', 'useCurrentUser');

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
    addNotification({
      message,
      priority: priority ?? NotificationPriority.LOW,
      status: status ?? 'error',
    });

    debug.error('Error', { message, error: e, location, context: { ...context } });
  };

  useEffect(() => {
    if (!error) return;

    onError(error, context);
  }, [error, context]);

  return {
    onError,
  };
};
