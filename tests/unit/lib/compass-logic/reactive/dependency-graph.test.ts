import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DependencyGraph } from '@/lib/compass-logic/reactive/dependency-graph';
import type { DB } from '@/stores/db/hooks/types';

describe('DependencyGraph', () => {
  let mockDb: Partial<DB>;
  let graph: DependencyGraph;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      scripts: {
        where: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any,
      attributes: {
        where: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any,
      dependencyGraphNodes: {
        where: vi.fn().mockReturnValue({
          delete: vi.fn().mockResolvedValue(undefined),
          toArray: vi.fn().mockResolvedValue([]),
        }),
        bulkAdd: vi.fn().mockResolvedValue(undefined),
      } as any,
    };

    graph = new DependencyGraph('ruleset-1', mockDb as DB);
  });

  describe('buildGraph', () => {
    it('should build graph from scripts', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'subscribe("HP")\nOwner.Attribute("MaxHP").value',
        },
      ];

      const mockAttributes = [
        { id: 'attr-1', title: 'MaxHP' },
        { id: 'attr-2', title: 'HP' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();

      // Check that the graph was built
      const subscribers = graph.getSubscribers('attr-2'); // HP
      expect(subscribers.has('script-1')).toBe(true);
    });

    it('should skip disabled scripts', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: false,
          sourceCode: 'subscribe("HP")',
        },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      await graph.buildGraph();

      const subscribers = graph.getSubscribers('attr-1');
      expect(subscribers.size).toBe(0);
    });

    it('should handle scripts with no subscriptions', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'Owner.Attribute("HP").add(10)',
        },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      await graph.buildGraph();

      // Should not throw errors
      expect(graph.isEmpty()).toBe(false);
    });
  });

  describe('getExecutionOrder', () => {
    it('should return scripts in correct execution order', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-hp',
          enabled: true,
          sourceCode: 'subscribe("Level")',
        },
        {
          id: 'script-2',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-maxhp',
          enabled: true,
          sourceCode: 'subscribe("HP")',
        },
      ];

      const mockAttributes = [
        { id: 'attr-level', title: 'Level' },
        { id: 'attr-hp', title: 'HP' },
        { id: 'attr-maxhp', title: 'MaxHP' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();

      const order = graph.getExecutionOrder('attr-level');
      expect(order).toContain('script-1');
    });

    it('should return empty array for attribute with no subscribers', () => {
      const order = graph.getExecutionOrder('unknown-attr');
      expect(order).toEqual([]);
    });
  });

  describe('detectCycles', () => {
    it('should detect circular dependencies', async () => {
      // Create a circular dependency: script-1 depends on attr-2, script-2 depends on attr-1
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'subscribe("Attr2")',
        },
        {
          id: 'script-2',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-2',
          enabled: true,
          sourceCode: 'subscribe("Attr1")',
        },
      ];

      const mockAttributes = [
        { id: 'attr-1', title: 'Attr1' },
        { id: 'attr-2', title: 'Attr2' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();

      const result = graph.detectCycles();
      expect(result.hasCycle).toBe(true);
      expect(result.cycle.length).toBeGreaterThan(0);
    });

    it('should not detect cycles in linear dependencies', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'subscribe("Level")',
        },
        {
          id: 'script-2',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-2',
          enabled: true,
          sourceCode: 'subscribe("Attr1")',
        },
      ];

      const mockAttributes = [
        { id: 'attr-level', title: 'Level' },
        { id: 'attr-1', title: 'Attr1' },
        { id: 'attr-2', title: 'Attr2' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();

      const result = graph.detectCycles();
      expect(result.hasCycle).toBe(false);
    });
  });

  describe('getSubscribers', () => {
    it('should return all scripts subscribing to an attribute', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'subscribe("HP")',
        },
        {
          id: 'script-2',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-2',
          enabled: true,
          sourceCode: 'subscribe("HP")',
        },
      ];

      const mockAttributes = [
        { id: 'attr-hp', title: 'HP' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();

      const subscribers = graph.getSubscribers('attr-hp');
      expect(subscribers.size).toBe(2);
      expect(subscribers.has('script-1')).toBe(true);
      expect(subscribers.has('script-2')).toBe(true);
    });

    it('should return empty set for unknown attribute', () => {
      const subscribers = graph.getSubscribers('unknown');
      expect(subscribers.size).toBe(0);
    });
  });

  describe('getDependencies', () => {
    it('should return all attributes a script depends on', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'subscribe("HP", "MP", "Level")',
        },
      ];

      const mockAttributes = [
        { id: 'attr-hp', title: 'HP' },
        { id: 'attr-mp', title: 'MP' },
        { id: 'attr-level', title: 'Level' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();

      const dependencies = graph.getDependencies('script-1');
      expect(dependencies.size).toBe(3);
      expect(dependencies.has('attr-hp')).toBe(true);
      expect(dependencies.has('attr-mp')).toBe(true);
      expect(dependencies.has('attr-level')).toBe(true);
    });

    it('should return empty set for unknown script', () => {
      const dependencies = graph.getDependencies('unknown');
      expect(dependencies.size).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty graph', () => {
      expect(graph.isEmpty()).toBe(true);
    });

    it('should return false after building graph with scripts', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'Owner.Attribute("HP").add(10)',
        },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      await graph.buildGraph();

      expect(graph.isEmpty()).toBe(false);
    });
  });

  describe('saveToDatabase', () => {
    it('should save graph nodes to database', async () => {
      const mockScripts = [
        {
          id: 'script-1',
          rulesetId: 'ruleset-1',
          entityType: 'attribute' as const,
          entityId: 'attr-1',
          enabled: true,
          sourceCode: 'subscribe("HP")',
        },
      ];

      const mockAttributes = [
        { id: 'attr-hp', title: 'HP' },
      ];

      mockDb.scripts!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockScripts),
      });

      mockDb.attributes!.where = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockAttributes),
      });

      await graph.buildGraph();
      await graph.saveToDatabase();

      expect(mockDb.dependencyGraphNodes!.bulkAdd).toHaveBeenCalled();
    });
  });
});
