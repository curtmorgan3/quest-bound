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
  useAttributeChange,
  useScriptValidation,
  useScriptAnnouncements,
  useDependencyGraph,
} from './hooks';
export type {
  UseExecuteScriptResult,
  UseExecuteActionResult,
  UseAttributeChangeResult,
  UseScriptValidationResult,
  UseDependencyGraphResult,
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
