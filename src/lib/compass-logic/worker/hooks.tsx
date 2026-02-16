/**
 * React Hooks for QBScript Worker Integration
 *
 * Provides easy-to-use hooks for executing scripts from React components.
 */

import type { RollFn } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttributeChangeOptions, ScriptExecutionOptions } from './client';
import { getQBScriptClient } from './client';

// ============================================================================
// useQBScriptClient - Access the client directly
// ============================================================================

export function useQBScriptClient() {
  const client = useRef(getQBScriptClient());
  return client.current;
}

// ============================================================================
// useExecuteScript - Execute scripts with state management
// ============================================================================

export interface UseExecuteScriptResult {
  execute: (options: Omit<ScriptExecutionOptions, 'timeout'>) => Promise<void>;
  result: any;
  announceMessages: string[];
  logMessages: any[][];
  executionTime: number | null;
  isExecuting: boolean;
  error: Error | null;
  reset: () => void;
}

export function useExecuteScript(timeout = 10000): UseExecuteScriptResult {
  const client = useQBScriptClient();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [announceMessages, setAnnounceMessages] = useState<string[]>([]);
  const [logMessages, setLogMessages] = useState<any[][]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (options: Omit<ScriptExecutionOptions, 'timeout'>) => {
      setIsExecuting(true);
      setError(null);

      try {
        const response = await client.executeScript({ ...options, timeout });
        setResult(response.value);
        setAnnounceMessages(response.announceMessages);
        setLogMessages(response.logMessages);
        setExecutionTime(response.executionTime);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setResult(null);
        setAnnounceMessages([]);
        setLogMessages([]);
        setExecutionTime(null);
      } finally {
        setIsExecuting(false);
      }
    },
    [client, timeout],
  );

  const reset = useCallback(() => {
    setResult(null);
    setAnnounceMessages([]);
    setLogMessages([]);
    setExecutionTime(null);
    setError(null);
  }, []);

  return {
    execute,
    result,
    announceMessages,
    logMessages,
    executionTime,
    isExecuting,
    error,
    reset,
  };
}

// ============================================================================
// useExecuteAction - Execute action scripts
// ============================================================================

export interface UseExecuteActionResult {
  executeAction: (actionId: string, characterId: string, targetId?: string) => Promise<void>;
  result: any;
  announceMessages: string[];
  logMessages: any[][];
  executionTime: number | null;
  isExecuting: boolean;
  error: Error | null;
  reset: () => void;
}

export function useExecuteAction(timeout = 10000): UseExecuteActionResult {
  const client = useQBScriptClient();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [announceMessages, setAnnounceMessages] = useState<string[]>([]);
  const [logMessages, setLogMessages] = useState<any[][]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const executeAction = useCallback(
    async (actionId: string, characterId: string, targetId?: string) => {
      setIsExecuting(true);
      setError(null);

      try {
        const response = await client.executeAction(actionId, characterId, targetId, timeout);
        setResult(response.value);
        setAnnounceMessages(response.announceMessages);
        setLogMessages(response.logMessages);
        setExecutionTime(response.executionTime);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setResult(null);
        setAnnounceMessages([]);
        setLogMessages([]);
        setExecutionTime(null);
      } finally {
        setIsExecuting(false);
      }
    },
    [client, timeout],
  );

  const reset = useCallback(() => {
    setResult(null);
    setAnnounceMessages([]);
    setLogMessages([]);
    setExecutionTime(null);
    setError(null);
  }, []);

  return {
    executeAction,
    result,
    announceMessages,
    logMessages,
    executionTime,
    isExecuting,
    error,
    reset,
  };
}

// ============================================================================
// useExecuteActionEvent - Execute action event handlers (on_activate, on_deactivate)
// ============================================================================

export interface UseExecuteActionEventResult {
  executeActionEvent: (
    actionId: string,
    characterId: string,
    targetId: string | null,
    eventType: 'on_activate' | 'on_deactivate',
    roll?: RollFn,
  ) => Promise<void>;
  result: any;
  announceMessages: string[];
  logMessages: any[][];
  executionTime: number | null;
  isExecuting: boolean;
  error: Error | null;
  reset: () => void;
}

export function useExecuteActionEvent(timeout = 10000): UseExecuteActionEventResult {
  const client = useQBScriptClient();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [announceMessages, setAnnounceMessages] = useState<string[]>([]);
  const [logMessages, setLogMessages] = useState<any[][]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const executeActionEvent = useCallback(
    async (
      actionId: string,
      characterId: string,
      targetId: string | null,
      eventType: 'on_activate' | 'on_deactivate',
      roll?: RollFn,
    ) => {
      setIsExecuting(true);
      setError(null);

      try {
        const response = await client.executeActionEvent(
          actionId,
          characterId,
          targetId,
          eventType,
          roll,
          timeout,
        );

        setResult(response.value);
        setAnnounceMessages(response.announceMessages);
        setLogMessages(response.logMessages);
        setExecutionTime(response.executionTime);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setResult(null);
        setAnnounceMessages([]);
        setLogMessages([]);
        setExecutionTime(null);
      } finally {
        setIsExecuting(false);
      }
    },
    [client, timeout],
  );

  const reset = useCallback(() => {
    setResult(null);
    setAnnounceMessages([]);
    setLogMessages([]);
    setExecutionTime(null);
    setError(null);
  }, []);

  return {
    executeActionEvent,
    result,
    announceMessages,
    logMessages,
    executionTime,
    isExecuting,
    error,
    reset,
  };
}

// ============================================================================
// useExecuteItemEvent - Execute item event scripts
// ============================================================================

export interface UseExecuteItemEventResult {
  executeItemEvent: (
    itemId: string,
    characterId: string,
    eventType: string,
    roll?: RollFn,
  ) => Promise<void>;
  result: any;
  announceMessages: string[];
  logMessages: any[][];
  executionTime: number | null;
  isExecuting: boolean;
  error: Error | null;
  reset: () => void;
}

export function useExecuteItemEvent(timeout = 10000): UseExecuteItemEventResult {
  const client = useQBScriptClient();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [announceMessages, setAnnounceMessages] = useState<string[]>([]);
  const [logMessages, setLogMessages] = useState<any[][]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const executeItemEvent = useCallback(
    async (itemId: string, characterId: string, eventType: string, roll?: RollFn) => {
      setIsExecuting(true);
      setError(null);

      try {
        const response = await client.executeItemEvent(
          itemId,
          characterId,
          eventType,
          roll,
          timeout,
        );
        setResult(response.value);
        setAnnounceMessages(response.announceMessages);
        setLogMessages(response.logMessages);
        setExecutionTime(response.executionTime);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setResult(null);
        setAnnounceMessages([]);
        setLogMessages([]);
        setExecutionTime(null);
      } finally {
        setIsExecuting(false);
      }
    },
    [client, timeout],
  );

  const reset = useCallback(() => {
    setResult(null);
    setAnnounceMessages([]);
    setLogMessages([]);
    setExecutionTime(null);
    setError(null);
  }, []);

  return {
    executeItemEvent,
    result,
    announceMessages,
    logMessages,
    executionTime,
    isExecuting,
    error,
    reset,
  };
}

// ============================================================================
// useAttributeChange - Notify of attribute changes
// ============================================================================

export interface UseAttributeChangeResult {
  notifyChange: (options: Omit<AttributeChangeOptions, 'timeout'>) => Promise<void>;
  scriptsExecuted: string[];
  executionCount: number;
  isProcessing: boolean;
  error: Error | null;
}

export function useAttributeChange(timeout = 10000): UseAttributeChangeResult {
  const client = useQBScriptClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [scriptsExecuted, setScriptsExecuted] = useState<string[]>([]);
  const [executionCount, setExecutionCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const notifyChange = useCallback(
    async (options: Omit<AttributeChangeOptions, 'timeout'>) => {
      setIsProcessing(true);
      setError(null);

      try {
        const response = await client.onAttributeChange({ ...options, timeout });
        setScriptsExecuted(response.scriptsExecuted);
        setExecutionCount(response.executionCount);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setScriptsExecuted([]);
        setExecutionCount(0);
      } finally {
        setIsProcessing(false);
      }
    },
    [client, timeout],
  );

  return {
    notifyChange,
    scriptsExecuted,
    executionCount,
    isProcessing,
    error,
  };
}

// ============================================================================
// useScriptValidation - Validate script syntax
// ============================================================================

export interface UseScriptValidationResult {
  validate: (scriptId: string, sourceCode: string) => Promise<void>;
  isValid: boolean | null;
  errors: Array<{ message: string; line?: number; column?: number }>;
  isValidating: boolean;
}

export function useScriptValidation(timeout = 5000): UseScriptValidationResult {
  const client = useQBScriptClient();
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Array<{ message: string; line?: number; column?: number }>>(
    [],
  );

  const validate = useCallback(
    async (scriptId: string, sourceCode: string) => {
      setIsValidating(true);

      try {
        const result = await client.validateScript(scriptId, sourceCode, timeout);
        setIsValid(result.valid);
        setErrors(result.errors || []);
      } catch (err) {
        setIsValid(false);
        setErrors([
          {
            message: err instanceof Error ? err.message : String(err),
          },
        ]);
      } finally {
        setIsValidating(false);
      }
    },
    [client, timeout],
  );

  return {
    validate,
    isValid,
    errors,
    isValidating,
  };
}

// ============================================================================
// useScriptAnnouncements - Listen for announcements
// ============================================================================

export function useScriptAnnouncements(onAnnounce?: (message: string) => void): void {
  useEffect(() => {
    const handleAnnounce = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      if (onAnnounce) {
        onAnnounce(customEvent.detail.message);
      }
    };

    window.addEventListener('qbscript:announce', handleAnnounce);

    return () => {
      window.removeEventListener('qbscript:announce', handleAnnounce);
    };
  }, [onAnnounce]);
}

// ============================================================================
// useReactiveScriptExecution - Execute scripts with reactive triggering
// ============================================================================

export interface ReactiveScriptExecutionOptions {
  scriptId?: string;
  sourceCode: string;
  characterId: string;
  targetId?: string;
  rulesetId: string;
  triggerType?: 'load' | 'attribute_change' | 'action_click' | 'item_event';
  /** Attribute ID to trigger reactive updates for after execution */
  reactiveAttributeId?: string;
  /** When script is attached to an entity (attribute, action, item), enables 'Self' in the script environment. */
  entityType?: string;
  entityId?: string;
}

export interface UseReactiveScriptExecutionResult {
  execute: (options: ReactiveScriptExecutionOptions) => Promise<void>;
  result: any;
  announceMessages: string[];
  logMessages: any[][];
  executionTime: number | null;
  isExecuting: boolean;
  error: Error | null;
  reset: () => void;
  /** Scripts that were executed reactively after the main script */
  reactiveScriptsExecuted: string[];
  /** Total number of reactive script executions */
  reactiveExecutionCount: number;
}

/**
 * Hook for executing scripts with automatic reactive triggering.
 * After the main script executes, if a reactiveAttributeId is provided,
 * it will trigger all dependent scripts for that attribute.
 */
export function useReactiveScriptExecution(timeout = 10000): UseReactiveScriptExecutionResult {
  const client = useQBScriptClient();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [announceMessages, setAnnounceMessages] = useState<string[]>([]);
  const [logMessages, setLogMessages] = useState<any[][]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reactiveScriptsExecuted, setReactiveScriptsExecuted] = useState<string[]>([]);
  const [reactiveExecutionCount, setReactiveExecutionCount] = useState(0);

  const execute = useCallback(
    async (options: ReactiveScriptExecutionOptions) => {
      setIsExecuting(true);
      setError(null);
      setReactiveScriptsExecuted([]);
      setReactiveExecutionCount(0);

      try {
        // Execute the main script
        const response = await client.executeScript({
          scriptId: options.scriptId,
          sourceCode: options.sourceCode,
          characterId: options.characterId,
          targetId: options.targetId,
          rulesetId: options.rulesetId,
          triggerType: options.triggerType,
          entityType: options.entityType,
          entityId: options.entityId,
          timeout,
        });

        setResult(response.value);
        setAnnounceMessages(response.announceMessages);
        setLogMessages(response.logMessages);
        setExecutionTime(response.executionTime);

        // If a reactive attribute ID is provided, trigger reactive updates
        if (options.reactiveAttributeId) {
          try {
            const reactiveResult = await client.onAttributeChange({
              attributeId: options.reactiveAttributeId,
              characterId: options.characterId,
              rulesetId: options.rulesetId,
              timeout,
            });

            setReactiveScriptsExecuted(reactiveResult.scriptsExecuted);
            setReactiveExecutionCount(reactiveResult.executionCount);
          } catch (reactiveError) {
            // Log reactive error but don't fail the main execution
            console.warn('Reactive script execution error:', reactiveError);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setResult(null);
        setAnnounceMessages([]);
        setLogMessages([]);
        setExecutionTime(null);
      } finally {
        setIsExecuting(false);
      }
    },
    [client, timeout],
  );

  const reset = useCallback(() => {
    setResult(null);
    setAnnounceMessages([]);
    setLogMessages([]);
    setExecutionTime(null);
    setError(null);
    setReactiveScriptsExecuted([]);
    setReactiveExecutionCount(0);
  }, []);

  return {
    execute,
    result,
    announceMessages,
    logMessages,
    executionTime,
    isExecuting,
    error,
    reset,
    reactiveScriptsExecuted,
    reactiveExecutionCount,
  };
}

// ============================================================================
// useDependencyGraph - Manage dependency graph
// ============================================================================

export interface UseDependencyGraphResult {
  build: (rulesetId: string) => Promise<void>;
  clear: (rulesetId?: string) => void;
  isBuilding: boolean;
  success: boolean | null;
  nodeCount: number | null;
  edgeCount: number | null;
  error: Error | null;
}

export function useDependencyGraph(timeout = 30000): UseDependencyGraphResult {
  const client = useQBScriptClient();
  const [isBuilding, setIsBuilding] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [nodeCount, setNodeCount] = useState<number | null>(null);
  const [edgeCount, setEdgeCount] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const build = useCallback(
    async (rulesetId: string) => {
      setIsBuilding(true);
      setError(null);

      try {
        const response = await client.buildDependencyGraph(rulesetId, timeout);
        setSuccess(response.success);
        setNodeCount(response.nodeCount || null);
        setEdgeCount(response.edgeCount || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setSuccess(false);
        setNodeCount(null);
        setEdgeCount(null);
      } finally {
        setIsBuilding(false);
      }
    },
    [client, timeout],
  );

  const clear = useCallback(
    (rulesetId?: string) => {
      client.clearGraph(rulesetId);
      setSuccess(null);
      setNodeCount(null);
      setEdgeCount(null);
      setError(null);
    },
    [client],
  );

  return {
    build,
    clear,
    isBuilding,
    success,
    nodeCount,
    edgeCount,
    error,
  };
}
