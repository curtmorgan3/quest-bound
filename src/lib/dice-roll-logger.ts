import type { DiceResult, SegmentResult } from '@/pages/dice/types';
import { get, set } from 'idb-keyval';

export interface DiceRollLogEntry {
  id: string;
  timestamp: string;
  notation: string;
  total: number;
  segments: SegmentResult[];
  source?: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface DiceRollLoggerConfig {
  maxEntries?: number;
  enableConsoleLog?: boolean;
  enableIndexedDBLog?: boolean;
}

class DiceRollLogger {
  private config: Required<DiceRollLoggerConfig>;
  private readonly STORAGE_KEY = 'qb.diceRollLog';

  constructor(config: DiceRollLoggerConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      enableConsoleLog: config.enableConsoleLog ?? false,
      enableIndexedDBLog: config.enableIndexedDBLog ?? true,
    };
  }

  async logRoll(
    result: DiceResult,
    context?: {
      source?: string;
      userId?: string;
      additionalContext?: Record<string, unknown>;
    },
  ): Promise<void> {
    const rollEntry: DiceRollLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      notation: result.notation,
      total: result.total,
      segments: result.segments,
      source: context?.source,
      userId: context?.userId,
      context: context?.additionalContext,
    };

    // Console logging
    if (this.config.enableConsoleLog) {
      this.logToConsole(rollEntry);
    }

    // IndexedDB logging
    if (this.config.enableIndexedDBLog) {
      await this.logToIndexedDB(rollEntry);
    }
  }

  private logToConsole(entry: DiceRollLogEntry): void {
    console.log(
      `[${entry.timestamp}] Dice Roll: ${entry.notation} = ${entry.total}`,
      entry.segments,
    );
  }

  private async logToIndexedDB(entry: DiceRollLogEntry): Promise<void> {
    try {
      const existingLogs = (await get<DiceRollLogEntry[]>(this.STORAGE_KEY)) ?? [];

      // Add new entry
      existingLogs.unshift(entry);

      // Trim to max entries
      if (existingLogs.length > this.config.maxEntries) {
        existingLogs.splice(this.config.maxEntries);
      }

      await set(this.STORAGE_KEY, existingLogs);
    } catch (error) {
      console.error('Failed to log dice roll to IndexedDB:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getRollLogs(limit?: number): Promise<DiceRollLogEntry[]> {
    try {
      const logs = (await get<DiceRollLogEntry[]>(this.STORAGE_KEY)) ?? [];
      return limit ? logs.slice(0, limit) : logs;
    } catch (error) {
      console.error('Failed to retrieve dice roll logs:', error);
      return [];
    }
  }

  async clearRollLogs(): Promise<void> {
    try {
      await set(this.STORAGE_KEY, []);
    } catch (error) {
      console.error('Failed to clear dice roll logs:', error);
    }
  }

  async exportRollLogs(limit: number = 100): Promise<string> {
    try {
      const logs = await this.getRollLogs(limit);
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('Failed to export dice roll logs:', error);
      return '[]';
    }
  }
}

// Create singleton instance
export const diceRollLogger = new DiceRollLogger();

// Export the class for custom instances
export { DiceRollLogger };
