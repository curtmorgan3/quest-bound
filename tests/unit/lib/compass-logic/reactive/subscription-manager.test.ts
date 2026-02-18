import {
  SubscriptionManager,
  createSubscribeBuiltin,
} from '@/lib/compass-logic/reactive/subscription-manager';
import type { DB } from '@/stores/db/hooks/types';
import { beforeEach, describe, expect, it } from 'vitest';

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let mockDb: Partial<DB>;

  beforeEach(() => {
    mockDb = {} as any;
    manager = new SubscriptionManager(mockDb as DB);
  });

  describe('setCurrentScript', () => {
    it('should set current script context', () => {
      manager.setCurrentScript('script-1');
      // Context is set internally, we'll test it through registerSubscription
    });
  });

  describe('registerSubscription', () => {
    it('should register single subscription', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP');

      const deps = manager.getDependencies('script-1');
      expect(deps.has('HP')).toBe(true);
    });

    it('should register multiple subscriptions', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP', 'MP', 'Level');

      const deps = manager.getDependencies('script-1');
      expect(deps.has('HP')).toBe(true);
      expect(deps.has('MP')).toBe(true);
      expect(deps.has('Level')).toBe(true);
      expect(deps.size).toBe(3);
    });

    it('should throw error if no current script', async () => {
      await expect(manager.registerSubscription('HP')).rejects.toThrow(
        'Cannot register subscription outside of script context',
      );
    });

    it('should handle multiple scripts', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP');

      manager.setCurrentScript('script-2');
      await manager.registerSubscription('MP');

      expect(manager.getDependencies('script-1').has('HP')).toBe(true);
      expect(manager.getDependencies('script-2').has('MP')).toBe(true);
    });
  });

  describe('getSubscribers', () => {
    it('should return scripts subscribing to attribute', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP');

      manager.setCurrentScript('script-2');
      await manager.registerSubscription('HP');

      const subscribers = manager.getSubscribers('HP');
      expect(subscribers.size).toBe(2);
      expect(subscribers.has('script-1')).toBe(true);
      expect(subscribers.has('script-2')).toBe(true);
    });

    it('should return empty set for attribute with no subscribers', () => {
      const subscribers = manager.getSubscribers('Unknown');
      expect(subscribers.size).toBe(0);
    });
  });

  describe('getDependencies', () => {
    it('should return attributes a script depends on', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP', 'MP');

      const deps = manager.getDependencies('script-1');
      expect(deps.size).toBe(2);
      expect(deps.has('HP')).toBe(true);
      expect(deps.has('MP')).toBe(true);
    });

    it('should return empty set for unknown script', () => {
      const deps = manager.getDependencies('unknown');
      expect(deps.size).toBe(0);
    });
  });

  describe('clearSubscriptions', () => {
    it('should clear subscriptions for a script', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP', 'MP');

      manager.clearSubscriptions('script-1');

      const deps = manager.getDependencies('script-1');
      expect(deps.size).toBe(0);
    });

    it('should update reverse index', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP');

      manager.clearSubscriptions('script-1');

      const subscribers = manager.getSubscribers('HP');
      expect(subscribers.size).toBe(0);
    });

    it('should handle clearing non-existent script', () => {
      expect(() => manager.clearSubscriptions('unknown')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should clear all subscriptions', async () => {
      manager.setCurrentScript('script-1');
      await manager.registerSubscription('HP');

      manager.setCurrentScript('script-2');
      await manager.registerSubscription('MP');

      manager.clearAll();

      expect(manager.getDependencies('script-1').size).toBe(0);
      expect(manager.getDependencies('script-2').size).toBe(0);
      expect(manager.getSubscribers('HP').size).toBe(0);
      expect(manager.getSubscribers('MP').size).toBe(0);
    });
  });

  describe('clearCurrentScript', () => {
    it('should clear current script context', async () => {
      manager.setCurrentScript('script-1');
      manager.clearCurrentScript();

      await expect(manager.registerSubscription('HP')).rejects.toThrow();
    });
  });

  describe('createSubscribeBuiltin', () => {
    it('should create a builtin function', () => {
      const subscribe = createSubscribeBuiltin(manager);
      expect(typeof subscribe).toBe('function');
    });

    it('should filter non-string arguments', () => {
      const subscribe = createSubscribeBuiltin(manager);
      // Should not throw with mixed arguments
      expect(() =>
        subscribe('HP', 123 as unknown as string, true as unknown as string, 'MP'),
      ).not.toThrow();
    });

    it('should be callable without arguments', () => {
      const subscribe = createSubscribeBuiltin(manager);
      expect(() => subscribe()).not.toThrow();
    });
  });
});
