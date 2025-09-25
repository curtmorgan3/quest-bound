import type { FileSystemAPIDirectoryHandle } from '@/vite-env';
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
  enableFileLog?: boolean;
  enableIndexedDBLog?: boolean;
}

class ErrorLogger {
  private config: Required<ErrorLoggerConfig>;
  private readonly STORAGE_KEY = 'qb.errorLog';

  constructor(config: ErrorLoggerConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      enableConsoleLog: config.enableConsoleLog ?? true,
      enableFileLog: config.enableFileLog ?? true,
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

    // File system logging (if available)
    if (this.config.enableFileLog) {
      await this.logToFile(errorEntry);
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

  private async logToFile(entry: ErrorLogEntry): Promise<void> {
    try {
      // Check if File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        return; // Skip file logging if not supported
      }

      // Try to get the root directory from the existing file manager
      let rootDir = await get('qb.rootDir');

      // If no root directory is set, prompt the user to choose one
      if (!rootDir) {
        try {
          rootDir = await this.promptForRootDirectory();
          if (!rootDir) {
            return; // User cancelled or failed to select directory
          }
        } catch (error) {
          console.warn('User cancelled directory selection or selection failed:', error);
          return; // Skip file logging if user cancels
        }
      }

      // Create logs directory
      const logsDir = await rootDir.getDirectoryHandle('logs', { create: true });

      // Create today's log file
      const today = new Date().toISOString().split('T')[0];
      const logFile = await logsDir.getFileHandle(`errors-${today}.json`, { create: true });

      // Read existing content
      let existingLogs: ErrorLogEntry[] = [];
      try {
        const file = await logFile.getFile();
        const content = await file.text();
        if (content.trim()) {
          existingLogs = JSON.parse(content);
        }
      } catch {
        // File is empty or invalid, start fresh
      }

      // Add new entry
      existingLogs.unshift(entry);

      // Trim to max entries per day
      if (existingLogs.length > this.config.maxEntries) {
        existingLogs.splice(this.config.maxEntries);
      }

      // Write back to file
      const writable = await logFile.createWritable();
      await writable.write(JSON.stringify(existingLogs, null, 2));
      await writable.close();
    } catch (error) {
      console.error('Failed to log error to file:', error);
    }
  }

  private async promptForRootDirectory(): Promise<FileSystemAPIDirectoryHandle | null> {
    try {
      const isAllowed = window.confirm('Allow this site to store error logs in your file system?');
      if (!isAllowed) {
        return null;
      }

      // Show directory picker to user
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });

      // Store the selected directory for future use
      await set('qb.rootDir', directoryHandle);

      return directoryHandle || null;
    } catch (error) {
      // User cancelled or error occurred
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the directory picker
        return null;
      }

      // Re-throw other errors
      throw error;
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

  async exportErrorLogs(): Promise<string> {
    try {
      const logs = await this.getErrorLogs();
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export error logs:', error);
      return '[]';
    }
  }

  async setupFileLogging(): Promise<boolean> {
    try {
      // Check if File System Access API is available
      if (!('showDirectoryPicker' in window)) {
        console.warn('File System Access API not supported in this browser');
        return false;
      }

      // Check if root directory is already set
      const existingRootDir = await get('qb.rootDir');
      if (existingRootDir) {
        console.log('File logging already configured');
        return true;
      }

      // Prompt user to select directory
      const rootDir = await this.promptForRootDirectory();
      if (rootDir) {
        console.log('File logging configured successfully');
        return true;
      } else {
        console.log('File logging setup cancelled by user');
        return false;
      }
    } catch (error) {
      console.error('Failed to setup file logging:', error);
      return false;
    }
  }

  async isFileLoggingConfigured(): Promise<boolean> {
    try {
      const rootDir = await get('qb.rootDir');
      return rootDir !== null && rootDir !== undefined;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export the class for custom instances
export { ErrorLogger };
