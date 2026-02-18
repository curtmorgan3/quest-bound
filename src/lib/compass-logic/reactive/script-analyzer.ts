import type { ASTNode } from '../interpreter/ast';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';

/**
 * Result of analyzing a script for subscriptions and event handlers.
 */
export interface ScriptAnalysis {
  subscriptions: string[]; // Attribute names this script subscribes to
  eventHandlers: {
    on_equip?: string; // Source code of on_equip handler
    on_unequip?: string; // Source code of on_unequip handler
    on_consume?: string; // Source code of on_consume handler
    on_activate?: string; // Source code of on_activate handler
    on_deactivate?: string; // Source code of on_deactivate handler
  };
}

/**
 * Extract subscribe() calls from script source code using static analysis.
 * @param sourceCode - The QBScript source code to analyze
 * @returns Array of attribute names the script subscribes to
 */
export function extractSubscriptions(sourceCode: string): string[] {
  try {
    const tokens = new Lexer(sourceCode).tokenize();
    const ast = new Parser(tokens).parse();

    const subscriptions: string[] = [];

    function walk(node: ASTNode): void {
      // Check if this is a subscribe() call
      if (node.type === 'SubscribeCall') {
        // Extract string arguments
        for (const arg of (node as any).arguments) {
          if (arg.type === 'StringLiteral') {
            subscriptions.push(arg.value);
          }
        }
      }

      // Also check for regular function calls to 'subscribe'
      if (node.type === 'FunctionCall' && (node as any).name === 'subscribe') {
        for (const arg of (node as any).arguments) {
          if (arg.type === 'StringLiteral') {
            subscriptions.push(arg.value);
          }
        }
      }

      // Recursively walk all child nodes
      walkChildren(node);
    }

    function walkChildren(node: any): void {
      // Walk through various node structures
      if (node.statements) {
        node.statements.forEach(walk);
      }
      if (node.body) {
        if (Array.isArray(node.body)) {
          node.body.forEach(walk);
        } else {
          walk(node.body);
        }
      }
      if (node.thenBlock) {
        node.thenBlock.forEach(walk);
      }
      if (node.elseBlock) {
        node.elseBlock.forEach(walk);
      }
      if (node.elseIfBlocks) {
        node.elseIfBlocks.forEach((elseIf: any) => {
          if (elseIf.block) {
            elseIf.block.forEach(walk);
          }
        });
      }
      if (node.left) walk(node.left);
      if (node.right) walk(node.right);
      if (node.condition) walk(node.condition);
      if (node.value) walk(node.value);
      if (node.arguments) {
        node.arguments.forEach(walk);
      }
    }

    walk(ast);
    return [...new Set(subscriptions)]; // Remove duplicates
  } catch (error) {
    // If parsing fails, return empty array
    console.error('Failed to extract subscriptions:', error);
    return [];
  }
}

/**
 * Extract event handler functions from script source code.
 * Event handlers are functions named on_equip, on_unequip, etc.
 * @param sourceCode - The QBScript source code to analyze
 * @returns Object with event handler source code
 */
export function extractEventHandlers(sourceCode: string): ScriptAnalysis['eventHandlers'] {
  try {
    const tokens = new Lexer(sourceCode).tokenize();
    const ast = new Parser(tokens).parse();

    const handlers: ScriptAnalysis['eventHandlers'] = {};

    function walk(node: ASTNode): void {
      // Check if this is a function definition with an event handler name
      if (node.type === 'FunctionDef') {
        const funcNode = node as any;
        const funcName = funcNode.name;

        if (
          funcName === 'on_equip' ||
          funcName === 'on_unequip' ||
          funcName === 'on_consume' ||
          funcName === 'on_activate' ||
          funcName === 'on_deactivate'
        ) {
          // Reconstruct the function body as source code
          handlers[funcName as keyof ScriptAnalysis['eventHandlers']] = reconstructFunctionBody(
            funcNode,
          );
        }
      }

      // Recursively walk children
      walkChildren(node);
    }

    function walkChildren(node: any): void {
      if (node.statements) {
        node.statements.forEach(walk);
      }
    }

    walk(ast);
    return handlers;
  } catch (error) {
    console.error('Failed to extract event handlers:', error);
    return {};
  }
}

/**
 * Reconstruct source code from a function definition's body.
 * This is a simplified version that converts AST back to source.
 * @param funcNode - The FunctionDef AST node
 * @returns Source code string of the function body
 */
function reconstructFunctionBody(funcNode: any): string {
  // For now, we'll store a simplified representation
  // In a real implementation, we might want to preserve the original source
  // or implement a proper AST-to-source converter

  // This is a placeholder - in practice, event handlers will be executed
  // by re-parsing and executing just that function's body
  return `function ${funcNode.name}() { /* body */ }`;
}

/**
 * Analyze a script for both subscriptions and event handlers.
 * @param sourceCode - The QBScript source code to analyze
 * @returns Complete script analysis
 */
export function analyzeScript(sourceCode: string): ScriptAnalysis {
  return {
    subscriptions: extractSubscriptions(sourceCode),
    eventHandlers: extractEventHandlers(sourceCode),
  };
}

/**
 * Validate that a script's subscriptions don't create circular dependencies.
 * This is a helper for design-time validation.
 * @param scriptId - ID of the script being validated
 * @param subscriptions - Attribute names this script subscribes to
 * @param existingGraph - Current dependency graph (map of scriptId -> dependencies)
 * @returns Validation result with any circular dependency detected
 */
export function detectCircularDependency(
  scriptId: string,
  subscriptions: string[],
  existingGraph: Map<string, Set<string>>,
): { hasCycle: boolean; cycle: string[] } {
  // Build a temporary graph including this script
  const graph = new Map(existingGraph);
  graph.set(scriptId, new Set(subscriptions));

  // Use DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): { hasCycle: boolean; cycle: string[] } {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const dependencies = graph.get(nodeId);
    if (dependencies) {
      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          const result = dfs(depId);
          if (result.hasCycle) return result;
        } else if (recursionStack.has(depId)) {
          // Cycle found
          const cycleStart = path.indexOf(depId);
          return {
            hasCycle: true,
            cycle: path.slice(cycleStart),
          };
        }
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return { hasCycle: false, cycle: [] };
  }

  // Check all nodes
  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      const result = dfs(nodeId);
      if (result.hasCycle) {
        return result;
      }
    }
  }

  return { hasCycle: false, cycle: [] };
}
