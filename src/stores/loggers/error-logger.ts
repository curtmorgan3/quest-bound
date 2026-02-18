import { get, set } from 'idb-keyval';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  component?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

export interface ErrorLoggerConfig {
  maxEntries?: number;
  enableConsoleLog?: boolean;
  enableIndexedDBLog?: boolean;
}

class ErrorLogger {
  private config: Required<ErrorLoggerConfig>;
  private readonly STORAGE_KEY = 'qb.errorLog';

  constructor(config: ErrorLoggerConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      enableConsoleLog: config.enableConsoleLog ?? true,
      enableIndexedDBLog: config.enableIndexedDBLog ?? true,
    };
  }

  async logError(
    error: Error | string,
    context?: {
      component?: string;
      userId?: string;
      severity?: ErrorLogEntry['severity'];
      additionalContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    const errorEntry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      component: context?.component,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: context?.userId,
      severity: context?.severity ?? 'medium',
      context: context?.additionalContext,
    };

    // Console logging
    if (this.config.enableConsoleLog) {
      this.logToConsole(errorEntry);
    }

    // IndexedDB logging
    if (this.config.enableIndexedDBLog) {
      await this.logToIndexedDB(errorEntry);
    }
  }

  private logToConsole(entry: ErrorLogEntry): void {
    const logMethod = this.getConsoleMethod(entry.severity);
    const logMessage = `[${entry.timestamp}] ${entry.severity.toUpperCase()}: ${entry.message}`;

    if (entry.component) {
      console.group(`🔴 Error in ${entry.component}`);
    }

    logMethod(logMessage);

    if (entry.stack) {
      console.error('Stack trace:', entry.stack);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      console.error('Context:', entry.context);
    }

    if (entry.component) {
      console.groupEnd();
    }
  }

  private getConsoleMethod(severity: ErrorLogEntry['severity']) {
    switch (severity) {
      case 'critical':
      case 'high':
        return console.error;
      case 'medium':
        return console.warn;
      case 'low':
        return console.info;
      default:
        return console.log;
    }
  }

  private async logToIndexedDB(entry: ErrorLogEntry): Promise<void> {
    try {
      const existingLogs = (await get<ErrorLogEntry[]>(this.STORAGE_KEY)) ?? [];

      // Add new entry
      existingLogs.unshift(entry);

      // Trim to max entries
      if (existingLogs.length > this.config.maxEntries) {
        existingLogs.splice(this.config.maxEntries);
      }

      await set(this.STORAGE_KEY, existingLogs);
    } catch (error) {
      console.error('Failed to log error to IndexedDB:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getErrorLogs(limit?: number): Promise<ErrorLogEntry[]> {
    try {
      const logs = (await get<ErrorLogEntry[]>(this.STORAGE_KEY)) ?? [];
      return limit ? logs.slice(0, limit) : logs;
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  async clearErrorLogs(): Promise<void> {
    try {
      await set(this.STORAGE_KEY, []);
    } catch (error) {
      console.error('Failed to clear error logs:', error);
    }
  }

  async exportErrorLogs(limit: number = 100): Promise<string> {
    try {
      const logs = await this.getErrorLogs(limit);
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export error logs:', error);
      return '[]';
    }
  }

}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export the class for custom instances
export { ErrorLogger };
