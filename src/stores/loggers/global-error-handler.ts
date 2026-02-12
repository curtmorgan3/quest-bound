import { errorLogger } from './error-logger';

interface GlobalErrorHandlerConfig {
  enableUnhandledRejection?: boolean;
  enableUncaughtException?: boolean;
  enableConsoleError?: boolean;
}

class GlobalErrorHandler {
  private config: Required<GlobalErrorHandlerConfig>;
  private isInitialized = false;

  constructor(config: GlobalErrorHandlerConfig = {}) {
    this.config = {
      enableUnhandledRejection: config.enableUnhandledRejection ?? true,
      enableUncaughtException: config.enableUncaughtException ?? true,
      enableConsoleError: config.enableConsoleError ?? true,
    };
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Handle unhandled promise rejections
    if (this.config.enableUnhandledRejection) {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }

    // Handle uncaught exceptions
    if (this.config.enableUncaughtException) {
      window.addEventListener('error', this.handleUncaughtException);
    }

    // Override console.error to catch errors logged via console.error
    if (this.config.enableConsoleError) {
      this.overrideConsoleError();
    }

    this.isInitialized = true;
  }

  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleUncaughtException);

    this.isInitialized = false;
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log the error
    errorLogger.logError(new Error(`Unhandled Promise Rejection: ${errorMessage}`), {
      severity: 'high',
      component: 'GlobalErrorHandler',
      additionalContext: {
        originalError: error,
        stack: errorStack,
        type: 'unhandledrejection',
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });

    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  };

  private handleUncaughtException = (event: ErrorEvent): void => {
    const error = new Error(event.message);
    error.stack = event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`;

    // Log the error
    errorLogger.logError(error, {
      severity: 'critical',
      component: 'GlobalErrorHandler',
      additionalContext: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaughtexception',
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });

    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  };

  private overrideConsoleError(): void {
    const originalConsoleError = console.error;
    
    console.error = (...args: unknown[]) => {
      // Call original console.error first
      originalConsoleError.apply(console, args);
      
      // Check if any of the arguments is an Error object
      const errorArg = args.find(arg => arg instanceof Error);
      if (errorArg) {
        errorLogger.logError(errorArg, {
          severity: 'medium',
          component: 'ConsoleError',
          additionalContext: {
            consoleArgs: args,
            type: 'console.error',
            url: window.location.href,
            timestamp: new Date().toISOString(),
          },
        });
      }
    };
  }
}

// Create singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

// Initialize on module load
globalErrorHandler.initialize();