import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCustomEventListeners,
  registerCustomEventListener,
  resetCustomEventRegistryForTests,
  syncRulesetContextFromApplication,
} from '@/lib/compass-logic/runtime/custom-event-registry';

describe('custom-event-registry', () => {
  beforeEach(() => {
    resetCustomEventRegistryForTests();
  });

  it('replaces prior listener for same scriptId and event', () => {
    syncRulesetContextFromApplication('rs-1');

    registerCustomEventListener('rs-1', 'rest', {
      rulesetId: 'rs-1',
      scriptId: 'script-a',
      ownerId: null,
      blockSource: 'v1',
    });
    registerCustomEventListener('rs-1', 'rest', {
      rulesetId: 'rs-1',
      scriptId: 'script-a',
      ownerId: null,
      blockSource: 'v2',
    });

    const list = getCustomEventListeners('rs-1', 'rest');
    expect(list).toHaveLength(1);
    expect(list[0]!.blockSource).toBe('v2');
  });

  it('keeps separate listeners for different script ids', () => {
    syncRulesetContextFromApplication('rs-2');

    registerCustomEventListener('rs-2', 'tick', {
      rulesetId: 'rs-2',
      scriptId: 's1',
      ownerId: null,
      blockSource: 'a',
    });
    registerCustomEventListener('rs-2', 'tick', {
      rulesetId: 'rs-2',
      scriptId: 's2',
      ownerId: null,
      blockSource: 'b',
    });

    expect(getCustomEventListeners('rs-2', 'tick')).toHaveLength(2);
  });
});
