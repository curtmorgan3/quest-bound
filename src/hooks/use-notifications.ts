import { toast } from 'sonner';

export type NotificationType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useNotifications() {
  const addNotification = (
    message: string,
    options?: NotificationOptions
  ) => {
    const { type = 'default', description, duration, action } = options || {};

    const toastOptions = {
      description,
      duration,
      action,
    };

    switch (type) {
      case 'success':
        return toast.success(message, toastOptions);
      case 'error':
        return toast.error(message, toastOptions);
      case 'warning':
        return toast.warning(message, toastOptions);
      case 'info':
        return toast.info(message, toastOptions);
      case 'loading':
        return toast.loading(message, toastOptions);
      case 'default':
      default:
        return toast(message, toastOptions);
    }
  };

  const dismissNotification = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  const dismissAllNotifications = () => {
    toast.dismiss();
  };

  return {
    addNotification,
    dismissNotification,
    dismissAllNotifications,
  };
}