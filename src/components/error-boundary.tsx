import { errorLogger } from '@/stores';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    errorLogger.logError(error, {
      component: 'ErrorBoundary',
      severity: 'critical',
      additionalContext: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className='min-h-screen flex items-center justify-center p-4 bg-background'>
          <Card className='w-full max-w-2xl'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10'>
                <AlertTriangle className='h-6 w-6 text-destructive' />
              </div>
              <CardTitle className='text-2xl'>Something went wrong</CardTitle>
              <CardDescription>An unexpected error occurred.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-col sm:flex-row gap-2 justify-center'>
                <Button
                  onClick={this.handleRetry}
                  variant='default'
                  className='flex items-center gap-2'>
                  <RefreshCw className='h-4 w-4' />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant='outline'
                  className='flex items-center gap-2'>
                  <RefreshCw className='h-4 w-4' />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant='outline'
                  className='flex items-center gap-2'>
                  <Home className='h-4 w-4' />
                  Go Home
                </Button>
              </div>

              {this.props.showDetails && this.state.error && (
                <details className='mt-4 p-4 bg-muted rounded-lg'>
                  <summary className='cursor-pointer font-medium mb-2'>Error Details</summary>
                  <div className='space-y-2 text-sm'>
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className='mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40'>
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className='mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-40'>
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
