import { useState, useEffect, useCallback } from 'react';
import { errorLogger } from '@/lib/error-logger';

export function useFileLogging() {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check if file logging is configured on mount
  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const configured = await errorLogger.isFileLoggingConfigured();
        setIsConfigured(configured);
      } catch (error) {
        console.error('Failed to check file logging configuration:', error);
        setIsConfigured(false);
      }
    };

    checkConfiguration();
  }, []);

  const setupFileLogging = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const success = await errorLogger.setupFileLogging();
      setIsConfigured(success);
      return success;
    } catch (error) {
      console.error('Failed to setup file logging:', error);
      setIsConfigured(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkConfiguration = useCallback(async (): Promise<void> => {
    try {
      const configured = await errorLogger.isFileLoggingConfigured();
      setIsConfigured(configured);
    } catch (error) {
      console.error('Failed to check file logging configuration:', error);
      setIsConfigured(false);
    }
  }, []);

  return {
    isConfigured,
    isLoading,
    setupFileLogging,
    checkConfiguration,
  };
}