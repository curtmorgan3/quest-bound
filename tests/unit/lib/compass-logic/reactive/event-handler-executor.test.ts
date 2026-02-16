import { describe, expect, it, vi } from 'vitest';
import {
  EventHandlerExecutor,
  type OnAttributesModifiedFn,
  type RunScriptForTestFn,
} from '@/lib/compass-logic/reactive/event-handler-executor';
import type { DB } from '@/stores/db/hooks/types';

describe('EventHandlerExecutor', () => {
  describe('onAttributesModified callback', () => {
    it('calls onAttributesModified with modified attribute ids after action event runs', async () => {
      const onAttributesModified = vi.fn<OnAttributesModifiedFn>().mockResolvedValue(undefined);

      const runScriptForTest: RunScriptForTestFn = vi.fn().mockResolvedValue({
        value: null,
        announceMessages: [],
        logMessages: [],
        modifiedAttributeIds: ['attr-hp', 'attr-mp'],
      });

      const mockDb = {
        actions: { get: vi.fn().mockResolvedValue({ id: 'action-1', rulesetId: 'r1', scriptId: 's1' }) },
        scripts: {
          get: vi.fn().mockResolvedValue({
            id: 's1',
            enabled: true,
            sourceCode: 'def on_activate():\n    x = 1',
          }),
        },
      } as unknown as DB;

      const executor = new EventHandlerExecutor(
        mockDb,
        onAttributesModified,
        runScriptForTest,
      );

      await executor.executeActionEvent(
        'action-1',
        'char-1',
        null,
        'on_activate',
      );

      expect(onAttributesModified).toHaveBeenCalledTimes(1);
      expect(onAttributesModified).toHaveBeenCalledWith(
        ['attr-hp', 'attr-mp'],
        'char-1',
        'r1',
      );
    });

    it('calls onAttributesModified with modified attribute ids after item event runs', async () => {
      const onAttributesModified = vi.fn<OnAttributesModifiedFn>().mockResolvedValue(undefined);

      const runScriptForTest: RunScriptForTestFn = vi.fn().mockResolvedValue({
        value: null,
        announceMessages: [],
        logMessages: [],
        modifiedAttributeIds: ['attr-stamina'],
      });

      const mockDb = {
        items: {
          get: vi.fn().mockResolvedValue({ id: 'item-1', rulesetId: 'r1', scriptId: 's1' }),
        },
        scripts: {
          get: vi.fn().mockResolvedValue({
            id: 's1',
            enabled: true,
            sourceCode: 'def on_equip():\n    x = 1',
          }),
        },
      } as unknown as DB;

      const executor = new EventHandlerExecutor(
        mockDb,
        onAttributesModified,
        runScriptForTest,
      );

      await executor.executeItemEvent('item-1', 'char-1', 'on_equip');

      expect(onAttributesModified).toHaveBeenCalledTimes(1);
      expect(onAttributesModified).toHaveBeenCalledWith(
        ['attr-stamina'],
        'char-1',
        'r1',
      );
    });

    it('does not call onAttributesModified when script result has no modifiedAttributeIds', async () => {
      const onAttributesModified = vi.fn<OnAttributesModifiedFn>().mockResolvedValue(undefined);

      const runScriptForTest: RunScriptForTestFn = vi.fn().mockResolvedValue({
        value: null,
        announceMessages: [],
        logMessages: [],
        // no modifiedAttributeIds
      });

      const mockDb = {
        actions: { get: vi.fn().mockResolvedValue({ id: 'action-1', rulesetId: 'r1', scriptId: 's1' }) },
        scripts: {
          get: vi.fn().mockResolvedValue({
            id: 's1',
            enabled: true,
            sourceCode: 'def on_activate():\n    x = 1',
          }),
        },
      } as unknown as DB;

      const executor = new EventHandlerExecutor(
        mockDb,
        onAttributesModified,
        runScriptForTest,
      );

      await executor.executeActionEvent(
        'action-1',
        'char-1',
        null,
        'on_activate',
      );

      expect(onAttributesModified).not.toHaveBeenCalled();
    });

    it('does not call onAttributesModified when script result has error', async () => {
      const onAttributesModified = vi.fn<OnAttributesModifiedFn>().mockResolvedValue(undefined);

      const runScriptForTest: RunScriptForTestFn = vi.fn().mockResolvedValue({
        value: null,
        announceMessages: [],
        logMessages: [],
        error: new Error('script failed'),
        modifiedAttributeIds: ['attr-hp'],
      });

      const mockDb = {
        actions: { get: vi.fn().mockResolvedValue({ id: 'action-1', rulesetId: 'r1', scriptId: 's1' }) },
        scripts: {
          get: vi.fn().mockResolvedValue({
            id: 's1',
            enabled: true,
            sourceCode: 'def on_activate():\n    x = 1',
          }),
        },
      } as unknown as DB;

      const executor = new EventHandlerExecutor(
        mockDb,
        onAttributesModified,
        runScriptForTest,
      );

      await executor.executeActionEvent(
        'action-1',
        'char-1',
        null,
        'on_activate',
      );

      expect(onAttributesModified).not.toHaveBeenCalled();
    });
  });
});
