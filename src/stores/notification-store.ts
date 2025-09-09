import { debugLog, generateId } from '@/utils';
import { create } from 'zustand';

const { warn } = debugLog('utils', 'notification');

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

type NotificationAction = {
  label: string;
  onClick: () => void;
};

export type Notification = {
  message: React.ReactNode;
  priority?: NotificationPriority;
  actions?: NotificationAction[];
  status?: 'success' | 'info' | 'error' | 'warn';
  dismissable?: boolean;
};

interface NotificationWithId extends Notification {
  id: string;
}

type NotificationStore = {
  notifications: NotificationWithId[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  upgradeCta: boolean;
  setUpgradeCta: (open: boolean) => void;
};

const NOTIFICATION_DURATION = 5000;

export const useNotifications = create<NotificationStore>()((set) => ({
  notifications: [],
  upgradeCta: false,
  setUpgradeCta: (open) => set({ upgradeCta: open }),
  removeNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
  addNotification: (notification: Notification) => {
    const id = generateId();
    const priority = notification.priority ?? NotificationPriority.LOW;

    set((state) => {
      const existingNotifications = state.notifications;
      if (
        existingNotifications.find((existingNote) => existingNote.message === notification.message)
      ) {
        warn('Notification already exists');
        return { notifications: existingNotifications };
      }

      if (priority === NotificationPriority.LOW) {
        setTimeout(
          () => {
            set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
          },
          NOTIFICATION_DURATION * Math.max(existingNotifications.length + 1, 1),
        );
      }

      return {
        notifications: [
          ...existingNotifications,
          {
            ...notification,
            status: notification.status ?? 'info',
            dismissable: notification.dismissable ?? true,
            priority,
            id,
          },
        ],
      };
    });
  },
}));
