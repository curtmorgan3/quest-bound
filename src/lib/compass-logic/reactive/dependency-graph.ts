import type { DB } from '@/stores/db/hooks/types';
import type { DependencyGraphNode } from '@/types';
import { analyzeScript } from './script-analyzer';

/**
 * Node in the dependency graph representing a script and its dependencies.
 */
export interface GraphNode {
  scriptId: string;
  entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'global' | 'characterLoader';
  entityId: string | null;
  dependencies: Set<string>; // Attribute IDs this script depends on
  dependents: Set<string>; // Script IDs that depend on this script's entity
}

/**
 * DependencyGraph manages the relationships between scripts and attributes.
 * It tracks which scripts depend on which attributes and provides methods
 * to determine execution order and detect circular dependencies.
 */
export class DependencyGraph {
  private nodes: Map<string, GraphNode>; // scriptId -> GraphNode
  private attributeToScripts: Map<string, Set<string>>; // attributeId -> Set of scriptIds
  private rulesetId: string;
  private db: DB;

  constructor(rulesetId: string, db: DB) {
    this.nodes = new Map();
    this.attributeToScripts = new Map();
    this.rulesetId = rulesetId;
    this.db = db;
  }

  /**
   * Build the complete dependency graph for the ruleset.
   * Analyzes all scripts and creates nodes with dependencies.
   */
  async buildGraph(): Promise<void> {
    // Clear existing data
    this.nodes.clear();
    this.attributeToScripts.clear();

    // Load all scripts for this ruleset
    const scripts = await this.db.scripts.where({ rulesetId: this.rulesetId }).toArray();

    // Load all attributes to map names to IDs
    const attributes = await this.db.attributes.where({ rulesetId: this.rulesetId }).toArray();
    const attributeNameToId = new Map<string, string>();
    for (const attr of attributes) {
      attributeNameToId.set(attr.title, attr.id);
    }

    // Analyze each script and create graph nodes
    for (const script of scripts) {
      if (!script.enabled) continue; // Skip disabled scripts

      const analysis = analyzeScript(script.sourceCode);
      const dependencies = new Set<string>();

      // Convert attribute names to IDs
      for (const attrName of analysis.subscriptions) {
        const attrId = attributeNameToId.get(attrName);
        if (attrId) {
          dependencies.add(attrId);

          // Add to reverse index
          if (!this.attributeToScripts.has(attrId)) {
            this.attributeToScripts.set(attrId, new Set());
          }
          this.attributeToScripts.get(attrId)!.add(script.id);
        }
      }

      // Create node
      const node: GraphNode = {
        scriptId: script.id,
        entityType: script.entityType,
        entityId: script.entityId,
        dependencies,
        dependents: new Set(),
      };

      this.nodes.set(script.id, node);
    }

    // Build dependents relationships
    // If script A depends on attribute X, and script B computes attribute X,
    // then script B is a dependent of script A
    for (const [_scriptId, node] of this.nodes.entries()) {
      // If this script is for an attribute, find all scripts that depend on it
      if (node.entityType === 'attribute' && node.entityId) {
        const dependentScripts = this.attributeToScripts.get(node.entityId);
        if (dependentScripts) {
          for (const depScriptId of dependentScripts) {
            node.dependents.add(depScriptId);
          }
        }
      }
    }
  }

  /**
   * Get all scripts that should be executed when an attribute changes.
   * Returns scripts in topological order (dependencies first).
   * @param attributeId - ID of the attribute that changed
   * @returns Array of script IDs in execution order
   */
  getExecutionOrder(attributeId: string): string[] {
    const scriptsToRun = this.attributeToScripts.get(attributeId);
    if (!scriptsToRun || scriptsToRun.size === 0) {
      return [];
    }

    // Perform topological sort
    const order: string[] = [];
    const visited = new Set<string>();
    const tempMarked = new Set<string>();

    const visit = (scriptId: string): void => {
      if (tempMarked.has(scriptId)) {
        // Cycle detected - skip to avoid infinite loop
        return;
      }
      if (visited.has(scriptId)) {
        return;
      }

      tempMarked.add(scriptId);

      const node = this.nodes.get(scriptId);
      if (node) {
        // Visit all dependents first (scripts that depend on this script's output)
        for (const dependentId of node.dependents) {
          visit(dependentId);
        }
      }

      tempMarked.delete(scriptId);
      visited.add(scriptId);
      order.push(scriptId);
    };

    // Visit all scripts that depend on this attribute
    for (const scriptId of scriptsToRun) {
      visit(scriptId);
    }

    return order.reverse(); // Reverse to get correct execution order
  }

  /**
   * Detect circular dependencies in the graph.
   * @returns Object indicating if a cycle exists and the cycle path
   */
  detectCycles(): { hasCycle: boolean; cycle: string[] } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): { hasCycle: boolean; cycle: string[] } => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        // Check dependencies (attributes this script subscribes to)
        for (const attributeId of node.dependencies) {
          // Find the script that computes this attribute
          for (const [otherScriptId, otherNode] of this.nodes.entries()) {
            if (otherNode.entityType === 'attribute' && otherNode.entityId === attributeId) {
              if (!visited.has(otherScriptId)) {
                const result = dfs(otherScriptId);
                if (result.hasCycle) return result;
              } else if (recursionStack.has(otherScriptId)) {
                // Cycle found
                const cycleStart = path.indexOf(otherScriptId);
                return {
                  hasCycle: true,
                  cycle: path.slice(cycleStart),
                };
              }
            }
          }
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return { hasCycle: false, cycle: [] };
    };

    // Check all nodes
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const result = dfs(nodeId);
        if (result.hasCycle) {
          return result;
        }
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  /**
   * Save the dependency graph to the database.
   */
  async saveToDatabase(): Promise<void> {
    // Delete existing nodes for this ruleset
    await this.db.dependencyGraphNodes.where({ rulesetId: this.rulesetId }).delete();

    // Convert graph nodes to database records
    const dbNodes: Omit<DependencyGraphNode, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    for (const [_scriptId, node] of this.nodes.entries()) {
      dbNodes.push({
        rulesetId: this.rulesetId,
        scriptId: node.scriptId,
        entityType: node.entityType,
        entityId: node.entityId,
        dependencies: Array.from(node.dependencies),
        dependents: Array.from(node.dependents),
      });
    }

    // Bulk insert
    if (dbNodes.length > 0) {
      await this.db.dependencyGraphNodes.bulkAdd(dbNodes as any[]);
    }
  }

  /**
   * Load the dependency graph from the database.
   */
  async loadFromDatabase(): Promise<void> {
    this.nodes.clear();
    this.attributeToScripts.clear();

    const dbNodes = await this.db.dependencyGraphNodes
      .where({ rulesetId: this.rulesetId })
      .toArray();

    for (const dbNode of dbNodes) {
      const node: GraphNode = {
        scriptId: dbNode.scriptId,
        entityType: dbNode.entityType,
        entityId: dbNode.entityId,
        dependencies: new Set(dbNode.dependencies),
        dependents: new Set(dbNode.dependents),
      };

      this.nodes.set(dbNode.scriptId, node);

      // Rebuild attributeToScripts index
      for (const attrId of node.dependencies) {
        if (!this.attributeToScripts.has(attrId)) {
          this.attributeToScripts.set(attrId, new Set());
        }
        this.attributeToScripts.get(attrId)!.add(dbNode.scriptId);
      }
    }
  }

  /**
   * Get all script IDs that subscribe to a specific attribute.
   * @param attributeId - ID of the attribute
   * @returns Set of script IDs
   */
  getSubscribers(attributeId: string): Set<string> {
    return this.attributeToScripts.get(attributeId) || new Set();
  }

  /**
   * Get all attribute IDs that a script depends on.
   * @param scriptId - ID of the script
   * @returns Set of attribute IDs
   */
  getDependencies(scriptId: string): Set<string> {
    const node = this.nodes.get(scriptId);
    return node ? node.dependencies : new Set();
  }

  /**
   * Check if the graph has any nodes.
   */
  isEmpty(): boolean {
    return this.nodes.size === 0;
  }

  /**
   * Get all attribute script IDs in topological order for initial sync.
   * Script A comes before script B if B depends on the attribute that A writes.
   * This ensures derived attributes are computed after their dependencies.
   */
  getGlobalAttributeScriptOrder(): string[] {
    const attributeScripts = Array.from(this.nodes.entries()).filter(
      ([_, node]) => node.entityType === 'attribute' && node.entityId != null,
    );
    if (attributeScripts.length === 0) return [];

    const scriptIds = new Set(attributeScripts.map(([id]) => id));
    const attributeToWriter = new Map<string, string>();
    for (const [scriptId, node] of attributeScripts) {
      if (node.entityId) attributeToWriter.set(node.entityId, scriptId);
    }

    // Predecessors: T is predecessor of S if S depends on the attribute T writes
    const inDegree = new Map<string, number>();
    const successors = new Map<string, string[]>();
    for (const scriptId of scriptIds) {
      inDegree.set(scriptId, 0);
      successors.set(scriptId, []);
    }
    for (const [scriptId, node] of attributeScripts) {
      for (const attrId of node.dependencies) {
        const predScriptId = attributeToWriter.get(attrId);
        if (predScriptId && predScriptId !== scriptId && scriptIds.has(predScriptId)) {
          inDegree.set(scriptId, (inDegree.get(scriptId) ?? 0) + 1);
          const predSuccessors = successors.get(predScriptId) ?? [];
          predSuccessors.push(scriptId);
          successors.set(predScriptId, predSuccessors);
        }
      }
    }

    const order: string[] = [];
    const queue = Array.from(scriptIds).filter((id) => inDegree.get(id) === 0);
    while (queue.length > 0) {
      const s = queue.shift()!;
      order.push(s);
      for (const t of successors.get(s) ?? []) {
        const d = (inDegree.get(t) ?? 1) - 1;
        inDegree.set(t, d);
        if (d === 0) queue.push(t);
      }
    }
    return order;
  }
}

/**
 * Build or rebuild the dependency graph for a ruleset.
 * This is the main entry point for creating/updating the graph.
 * @param rulesetId - ID of the ruleset
 * @param db - Database instance
 * @returns The built dependency graph
 */
export async function buildDependencyGraph(rulesetId: string, db: DB): Promise<DependencyGraph> {
  const graph = new DependencyGraph(rulesetId, db);
  await graph.buildGraph();
  await graph.saveToDatabase();
  return graph;
}

/**
 * Load an existing dependency graph from the database.
 * @param rulesetId - ID of the ruleset
 * @param db - Database instance
 * @returns The loaded dependency graph, or null if not found
 */
export async function loadDependencyGraph(
  rulesetId: string,
  db: DB,
): Promise<DependencyGraph | null> {
  const graph = new DependencyGraph(rulesetId, db);
  await graph.loadFromDatabase();

  if (graph.isEmpty()) {
    return null;
  }

  return graph;
}
