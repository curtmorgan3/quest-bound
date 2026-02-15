/**
 * QBScript Worker Module
 * 
 * Exports the worker-based script execution system.
 */

// Client
export { QBScriptClient, getQBScriptClient, terminateQBScriptClient } from './client';
export type {
  ScriptExecutionOptions,
  AttributeChangeOptions,
  ValidationResult,
  WorkerSignalHandler,
} from './client';

// Hooks
export {
  useQBScriptClient,
  useExecuteScript,
  useExecuteAction,
  useExecuteActionEvent,
  useExecuteItemEvent,
  useAttributeChange,
  useScriptValidation,
  useScriptAnnouncements,
  useDependencyGraph,
  useReactiveScriptExecution,
} from './hooks';
export type {
  UseExecuteScriptResult,
  UseExecuteActionResult,
  UseExecuteActionEventResult,
  UseExecuteItemEventResult,
  UseAttributeChangeResult,
  UseScriptValidationResult,
  UseDependencyGraphResult,
  UseReactiveScriptExecutionResult,
  ReactiveScriptExecutionOptions,
} from './hooks';

// Signals
export type {
  MainToWorkerSignal,
  WorkerToMainSignal,
  ExecuteScriptPayload,
  AttributeChangedPayload,
  ScriptResultPayload,
  ScriptErrorPayload,
} from './signals';
export { generateRequestId } from './signals';
