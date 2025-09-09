import React from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { ErrorPage } from './error-page';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export const ErrorBoundary = ({ children }: ErrorBoundaryProps) => {
  const Fallback = (
    <div
      id='error-boundary'
      style={{
        paddingTop: '70px',
        paddingLeft: '24px',
        paddingRight: '24px',
        height: 'calc(100vh - 70px)',
        backgroundColor: '#2A2A2A',
        color: '#FAF7F2',
        overflow: 'hidden',
      }}>
      <ErrorPage />
    </div>
  );

  return <ReactErrorBoundary fallback={Fallback}>{children}</ReactErrorBoundary>;
};
