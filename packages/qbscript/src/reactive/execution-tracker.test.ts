import { describe, expect, it, beforeEach } from 'vitest';
import { ExecutionTracker, ExecutionLimitError } from '@/lib/compass-logic/reactive/execution-tracker';

describe('ExecutionTracker', () => {
  let tracker: ExecutionTracker;

  beforeEach(() => {
    tracker = new ExecutionTracker();
  });

  describe('startExecution', () => {
    it('should create execution context with unique ID', () => {
      const id1 = tracker.startExecution('char-1');
      const id2 = tracker.startExecution('char-2');

      expect(id1).not.toBe(id2);
      expect(tracker.isActive(id1)).toBe(true);
      expect(tracker.isActive(id2)).toBe(true);
    });

    it('should set initial execution state', () => {
      const executionId = tracker.startExecution('char-1', 'attr-1');
      const context = tracker.getContext(executionId);

      expect(context).toBeDefined();
      expect(context?.characterId).toBe('char-1');
      expect(context?.triggerAttributeId).toBe('attr-1');
      expect(context?.executionChain).toEqual([]);
      expect(context?.executionCount.size).toBe(0);
    });

    it('should handle null trigger attribute', () => {
      const executionId = tracker.startExecution('char-1', null);
      const context = tracker.getContext(executionId);

      expect(context?.triggerAttributeId).toBeNull();
    });
  });

  describe('recordExecution', () => {
    it('should record script execution', () => {
      const executionId = tracker.startExecution('char-1');
      tracker.recordExecution(executionId, 'script-1');

      const context = tracker.getContext(executionId);
      expect(context?.executionChain).toEqual(['script-1']);
      expect(context?.executionCount.get('script-1')).toBe(1);
    });

    it('should track multiple script executions', () => {
      const executionId = tracker.startExecution('char-1');
      tracker.recordExecution(executionId, 'script-1');
      tracker.recordExecution(executionId, 'script-2');
      tracker.recordExecution(executionId, 'script-1');

      const context = tracker.getContext(executionId);
      expect(context?.executionChain).toEqual(['script-1', 'script-2', 'script-1']);
      expect(context?.executionCount.get('script-1')).toBe(2);
      expect(context?.executionCount.get('script-2')).toBe(1);
    });

    it('should throw error if execution context not found', () => {
      expect(() => {
        tracker.recordExecution('invalid-id', 'script-1');
      }).toThrow('Execution context not found');
    });
  });

  describe('execution limits', () => {
    it('should throw error when total execution limit exceeded', () => {
      const executionId = tracker.startExecution('char-1');
      const context = tracker.getContext(executionId)!;
      context.maxExecutions = 5;

      // Execute 6 scripts
      expect(() => {
        for (let i = 0; i < 6; i++) {
          tracker.recordExecution(executionId, `script-${i}`);
        }
      }).toThrow(ExecutionLimitError);
    });

    it('should throw error when per-script limit exceeded', () => {
      const executionId = tracker.startExecution('char-1');
      const context = tracker.getContext(executionId)!;
      context.maxPerScript = 3;

      // Execute same script 4 times
      expect(() => {
        for (let i = 0; i < 4; i++) {
          tracker.recordExecution(executionId, 'script-1');
        }
      }).toThrow(ExecutionLimitError);
    });

    it('should include execution context in error', () => {
      const executionId = tracker.startExecution('char-1');
      const context = tracker.getContext(executionId)!;
      context.maxPerScript = 2;

      try {
        for (let i = 0; i < 3; i++) {
          tracker.recordExecution(executionId, 'script-1');
        }
        expect.fail('Should have thrown ExecutionLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(ExecutionLimitError);
        const limitError = error as ExecutionLimitError;
        expect(limitError.executionContext.characterId).toBe('char-1');
        expect(limitError.limitType).toBe('per_script_limit');
      }
    });

    it('should not throw error when under limits', () => {
      const executionId = tracker.startExecution('char-1');
      const context = tracker.getContext(executionId)!;
      context.maxExecutions = 10;
      context.maxPerScript = 5;

      // Execute within limits
      for (let i = 0; i < 5; i++) {
        tracker.recordExecution(executionId, 'script-1');
      }

      for (let i = 0; i < 3; i++) {
        tracker.recordExecution(executionId, 'script-2');
      }

      expect(tracker.isActive(executionId)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', () => {
      const executionId = tracker.startExecution('char-1');
      tracker.recordExecution(executionId, 'script-1');
      tracker.recordExecution(executionId, 'script-2');
      tracker.recordExecution(executionId, 'script-1');

      const stats = tracker.getStats(executionId);

      expect(stats).toBeDefined();
      expect(stats?.totalExecutions).toBe(3);
      expect(stats?.uniqueScripts).toBe(2);
      expect(stats?.scriptCounts.get('script-1')).toBe(2);
      expect(stats?.scriptCounts.get('script-2')).toBe(1);
      expect(stats?.elapsedTime).toBeGreaterThanOrEqual(0);
    });

    it('should return null for invalid execution ID', () => {
      const stats = tracker.getStats('invalid-id');
      expect(stats).toBeNull();
    });
  });

  describe('endExecution', () => {
    it('should remove execution context', () => {
      const executionId = tracker.startExecution('char-1');
      expect(tracker.isActive(executionId)).toBe(true);

      tracker.endExecution(executionId);
      expect(tracker.isActive(executionId)).toBe(false);
      expect(tracker.getContext(executionId)).toBeUndefined();
    });
  });

  describe('getActiveExecutions', () => {
    it('should return all active execution IDs', () => {
      const id1 = tracker.startExecution('char-1');
      const id2 = tracker.startExecution('char-2');

      const active = tracker.getActiveExecutions();
      expect(active).toContain(id1);
      expect(active).toContain(id2);
      expect(active.length).toBe(2);
    });

    it('should return empty array when no active executions', () => {
      const active = tracker.getActiveExecutions();
      expect(active).toEqual([]);
    });
  });

  describe('clearAll', () => {
    it('should clear all active executions', () => {
      tracker.startExecution('char-1');
      tracker.startExecution('char-2');
      expect(tracker.getActiveExecutions().length).toBe(2);

      tracker.clearAll();
      expect(tracker.getActiveExecutions()).toEqual([]);
    });
  });

  describe('ExecutionLimitError', () => {
    it('should provide detailed error report', () => {
      const executionId = tracker.startExecution('char-1', 'attr-1');
      const context = tracker.getContext(executionId)!;
      context.maxPerScript = 2;

      try {
        for (let i = 0; i < 3; i++) {
          tracker.recordExecution(executionId, 'script-1');
        }
      } catch (error) {
        const limitError = error as ExecutionLimitError;
        const report = limitError.getReport();

        expect(report.characterId).toBe('char-1');
        expect(report.limitType).toBe('per_script_limit');
        expect(report.totalExecutions).toBe(3);
        expect(report.executionChain).toEqual(['script-1', 'script-1', 'script-1']);
        expect(report.scriptCounts['script-1']).toBe(3);
      }
    });
  });
});
