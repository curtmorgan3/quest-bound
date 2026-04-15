/**
 * Context for tracking a chain of script executions.
 */
export interface ExecutionContext {
  executionId: string;
  characterId: string;
  triggerAttributeId: string | null; // Attribute that triggered this execution chain
  executionChain: string[]; // Script IDs executed in order
  executionCount: Map<string, number>; // Per-script execution count
  startTime: number;
  maxExecutions: number; // Total execution limit
  maxPerScript: number; // Per-script execution limit
  timeLimit: number; // Time limit in milliseconds
}

/**
 * ExecutionTracker monitors script execution to detect and prevent infinite loops.
 * It tracks execution counts, time limits, and provides detailed error information.
 */
export class ExecutionTracker {
  private activeExecutions: Map<string, ExecutionContext>;
  private executionIdCounter: number;

  constructor() {
    this.activeExecutions = new Map();
    this.executionIdCounter = 0;
  }

  /**
   * Start tracking a new execution chain.
   * @param characterId - ID of the character executing scripts
   * @param triggerAttributeId - Optional ID of the attribute that triggered this chain
   * @returns Execution ID for tracking this chain
   */
  startExecution(
    characterId: string,
    triggerAttributeId: string | null = null,
  ): string {
    const executionId = `exec_${this.executionIdCounter++}_${Date.now()}`;

    const context: ExecutionContext = {
      executionId,
      characterId,
      triggerAttributeId,
      executionChain: [],
      executionCount: new Map(),
      startTime: Date.now(),
      maxExecutions: 100, // Max total executions
      maxPerScript: 10, // Max executions per script
      timeLimit: 5000, // 5 seconds
    };

    this.activeExecutions.set(executionId, context);
    return executionId;
  }

  /**
   * Record a script execution in the chain.
   * @param executionId - ID of the execution chain
   * @param scriptId - ID of the script being executed
   * @throws Error if execution limits are exceeded
   */
  recordExecution(executionId: string, scriptId: string): void {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution context not found: ${executionId}`);
    }

    // Add to execution chain
    context.executionChain.push(scriptId);

    // Update execution count for this script
    const count = context.executionCount.get(scriptId) || 0;
    context.executionCount.set(scriptId, count + 1);

    // Check limits
    this.checkLimits(context, scriptId);
  }

  /**
   * Check if execution limits have been exceeded.
   * @param context - Execution context
   * @param currentScriptId - Script currently being checked
   * @throws Error if limits are exceeded
   */
  private checkLimits(context: ExecutionContext, currentScriptId: string): void {
    // Check total execution limit
    if (context.executionChain.length > context.maxExecutions) {
      throw new ExecutionLimitError(
        `Execution limit exceeded: ${context.executionChain.length} total executions (limit: ${context.maxExecutions})`,
        context,
        'total_limit',
      );
    }

    // Check per-script limit
    const scriptCount = context.executionCount.get(currentScriptId) || 0;
    if (scriptCount > context.maxPerScript) {
      throw new ExecutionLimitError(
        `Script ${currentScriptId} executed ${scriptCount} times (limit: ${context.maxPerScript})`,
        context,
        'per_script_limit',
      );
    }

    // Check time limit
    const elapsed = Date.now() - context.startTime;
    if (elapsed > context.timeLimit) {
      throw new ExecutionLimitError(
        `Execution time limit exceeded: ${elapsed}ms (limit: ${context.timeLimit}ms)`,
        context,
        'time_limit',
      );
    }
  }

  /**
   * Get the current execution context.
   * @param executionId - ID of the execution chain
   * @returns Execution context or undefined
   */
  getContext(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }

  /**
   * End an execution chain and clean up.
   * @param executionId - ID of the execution chain
   */
  endExecution(executionId: string): void {
    this.activeExecutions.delete(executionId);
  }

  /**
   * Check if an execution is currently active.
   * @param executionId - ID of the execution chain
   * @returns True if active
   */
  isActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  /**
   * Get execution statistics for debugging.
   * @param executionId - ID of the execution chain
   * @returns Statistics object or null
   */
  getStats(executionId: string): {
    totalExecutions: number;
    uniqueScripts: number;
    elapsedTime: number;
    scriptCounts: Map<string, number>;
  } | null {
    const context = this.activeExecutions.get(executionId);
    if (!context) return null;

    return {
      totalExecutions: context.executionChain.length,
      uniqueScripts: context.executionCount.size,
      elapsedTime: Date.now() - context.startTime,
      scriptCounts: new Map(context.executionCount),
    };
  }

  /**
   * Get all active execution IDs.
   * @returns Array of execution IDs
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Clear all active executions (emergency stop).
   */
  clearAll(): void {
    this.activeExecutions.clear();
  }
}

/**
 * Custom error class for execution limit violations.
 */
export class ExecutionLimitError extends Error {
  public readonly executionContext: ExecutionContext;
  public readonly limitType: 'total_limit' | 'per_script_limit' | 'time_limit';

  constructor(
    message: string,
    executionContext: ExecutionContext,
    limitType: 'total_limit' | 'per_script_limit' | 'time_limit',
  ) {
    super(message);
    this.name = 'ExecutionLimitError';
    this.executionContext = executionContext;
    this.limitType = limitType;
  }

  /**
   * Get a detailed error report for logging/display.
   */
  getReport(): {
    message: string;
    limitType: string;
    characterId: string;
    totalExecutions: number;
    executionChain: string[];
    scriptCounts: Record<string, number>;
    elapsedTime: number;
  } {
    return {
      message: this.message,
      limitType: this.limitType,
      characterId: this.executionContext.characterId,
      totalExecutions: this.executionContext.executionChain.length,
      executionChain: this.executionContext.executionChain,
      scriptCounts: Object.fromEntries(this.executionContext.executionCount),
      elapsedTime: Date.now() - this.executionContext.startTime,
    };
  }
}
