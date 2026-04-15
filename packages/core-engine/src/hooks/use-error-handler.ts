import { errorLogger, type ErrorLogEntry } from '@/stores';
import { useCallback } from 'react';
import { useNotifications } from './use-notifications';

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  severity?: ErrorLogEntry['severity'];
  component?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export function useErrorHandler() {
  const { addNotification } = useNotifications();

  const handleError = useCallback(
    async (error: Error | string, options: ErrorHandlerOptions = {}): Promise<void> => {
      const { showNotification = true, severity = 'medium', component, userId, context } = options;

      const errorMessage = typeof error === 'string' ? error : error.message;

      // Show notification if enabled
      if (showNotification) {
        const notificationType = getNotificationTypeFromSeverity(severity);

        addNotification(errorMessage, {
          type: notificationType,
          description: getSeverityDescription(severity),
          duration: getDurationFromSeverity(severity),
        });
      }

      // Log the error
      errorLogger.logError(error, {
        component,
        userId,
        severity,
        additionalContext: context,
      });
    },
    [addNotification],
  );

  const handleAsyncError = useCallback(
    async (error: Error | string, options: ErrorHandlerOptions = {}): Promise<void> => {
      await handleError(error, options);
    },
    [handleError],
  );

  const handleCriticalError = useCallback(
    async (error: Error | string, context?: Record<string, unknown>): Promise<void> => {
      await handleError(error, {
        severity: 'critical',
        showNotification: true,
        context,
      });
    },
    [handleError],
  );

  const handleUserError = useCallback(
    async (
      error: Error | string,
      userId?: string,
      context?: Record<string, unknown>,
    ): Promise<void> => {
      await handleError(error, {
        severity: 'medium',
        showNotification: true,
        userId,
        context,
      });
    },
    [handleError],
  );

  return {
    handleError,
    handleAsyncError,
    handleCriticalError,
    handleUserError,
  };
}

function getNotificationTypeFromSeverity(severity: ErrorLogEntry['severity']) {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error' as const;
    case 'medium':
      return 'warning' as const;
    case 'low':
      return 'info' as const;
    default:
      return 'error' as const;
  }
}

function getSeverityDescription(severity: ErrorLogEntry['severity']): string {
  switch (severity) {
    case 'critical':
      return 'A critical error occurred. Please contact support immediately.';
    case 'high':
      return 'A high-priority error occurred. Please check your actions.';
    case 'medium':
      return 'An error occurred. Please try again.';
    case 'low':
      return 'A minor issue was detected.';
    default:
      return 'An error occurred.';
  }
}

function getDurationFromSeverity(severity: ErrorLogEntry['severity']): number {
  switch (severity) {
    case 'critical':
      return 10000; // 10 seconds
    case 'high':
    case 'medium':
    case 'low':
    default:
      return 8000; // 8 seconds
  }
}
