# Phase 5: Reactive System

## Overview
Implement the reactive subscription system that automatically re-runs attribute scripts when dependencies change, handles cascading updates, prevents infinite loops, and manages script execution order.

## Goals
- Implement `subscribe()` function
- Build dependency graph for all scripts
- Detect circular dependencies at design-time
- Auto-execute scripts when dependencies change
- Handle cascading updates (one script triggering another)
- Prevent infinite loops with execution limits
- Implement transaction/rollback mechanism
- Execute item event handlers (on_equip, on_consume, etc.)
- Execute action handlers (on_activate, on_deactivate)

## Subscription System

### subscribe() Implementation
```typescript
class SubscriptionManager {
  private subscriptions: Map<string, Set<string>>; // scriptId -> Set<attributeIds>
  
  registerSubscription(scriptId: string, ...attributeNames: string[]): void {
    // Convert attribute names to IDs
    // Store in subscriptions map
    // Build reverse index for quick lookups
  }
  
  getSubscribers(attributeId: string): Set<string> {
    // Return all scriptIds that subscribe to this attribute
  }
  
  getDependencies(scriptId: string): Set<string> {
    // Return all attributeIds this script depends on
  }
}
```

### Built-in subscribe() Function
```typescript
function builtinSubscribe(...attributeNames: string[]): void {
  // Called from within attribute scripts
  // Register subscriptions with current script context
  
  const scriptId = this.context.scriptId;
  this.subscriptionManager.registerSubscription(scriptId, ...attributeNames);
}
```

### Subscription Types
- **Attribute subscriptions**: Re-run when attribute value changes
- **Action subscriptions**: Re-run when action.activate() fires

## Dependency Graph

### Graph Structure
```typescript
interface DependencyNode {
  scriptId: string;
  entityType: 'attribute' | 'action' | 'item';
  entityId: string;
  dependencies: Set<string>; // Attribute/action IDs this script depends on
  dependents: Set<string>;   // Script IDs that depend on this script's entity
}

class DependencyGraph {
  private nodes: Map<string, DependencyNode>;
  
  buildGraph(scripts: Script[]): void {
    // Build complete dependency graph for ruleset
    // Parse subscribe() calls from each script
    // Create nodes and edges
  }
  
  getExecutionOrder(changedAttributeId: string): string[] {
    // Topological sort to determine execution order
    // Returns ordered list of scriptIds to execute
  }
  
  detectCycles(): { hasCycle: boolean; cycle: string[] } {
    // Detect circular dependencies
    // Return cycle path if found
  }
}
```

### Building the Graph
```typescript
async function buildDependencyGraph(rulesetId: string): Promise<DependencyGraph> {
  const scripts = await db.scripts.where({ rulesetId }).toArray();
  const graph = new DependencyGraph();
  
  for (const script of scripts) {
    // Parse script to extract subscribe() calls
    // This requires running scripts or static analysis
    
    // Option 1: Execute scripts in "discovery mode"
    // Option 2: Parse AST to find subscribe() calls
    
    const subscriptions = extractSubscriptions(script.sourceCode);
    graph.addNode(script.id, script.entityId, subscriptions);
  }
  
  return graph;
}
```

### Extracting Subscriptions (Static Analysis)
```typescript
function extractSubscriptions(sourceCode: string): string[] {
  // Parse source code to find subscribe() calls
  // Return list of attribute/action names
  
  const tokens = new Lexer(sourceCode).tokenize();
  const ast = new Parser(tokens).parse();
  
  const subscriptions: string[] = [];
  
  // Walk AST to find subscribe() calls
  function walk(node: ASTNode): void {
    if (node.type === 'FunctionCall' && node.name === 'subscribe') {
      for (const arg of node.arguments) {
        if (arg.type === 'StringLiteral') {
          subscriptions.push(arg.value);
        }
      }
    }
    // Recursively walk child nodes
  }
  
  walk(ast);
  return subscriptions;
}
```

## Circular Dependency Detection

### Design-Time Validation
```typescript
async function validateScriptSubscriptions(script: Script): Promise<{
  valid: boolean;
  warnings: string[];
  errors: string[];
}> {
  // Build dependency graph including this script
  const graph = await buildDependencyGraph(script.rulesetId);
  
  // Check for cycles
  const cycleCheck = graph.detectCycles();
  
  if (cycleCheck.hasCycle) {
    return {
      valid: false,
      warnings: [],
      errors: [`Circular dependency detected: ${cycleCheck.cycle.join(' → ')}`],
    };
  }
  
  return { valid: true, warnings: [], errors: [] };
}
```

### Cycle Detection Algorithm
```typescript
class DependencyGraph {
  detectCycles(): { hasCycle: boolean; cycle: string[] } {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const result = this.dfs(nodeId, visited, recursionStack, path);
        if (result.hasCycle) {
          return result;
        }
      }
    }
    
    return { hasCycle: false, cycle: [] };
  }
  
  private dfs(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): { hasCycle: boolean; cycle: string[] } {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const node = this.nodes.get(nodeId);
    for (const dependencyId of node.dependencies) {
      if (!visited.has(dependencyId)) {
        const result = this.dfs(dependencyId, visited, recursionStack, path);
        if (result.hasCycle) return result;
      } else if (recursionStack.has(dependencyId)) {
        // Cycle found
        const cycleStart = path.indexOf(dependencyId);
        return {
          hasCycle: true,
          cycle: path.slice(cycleStart),
        };
      }
    }
    
    recursionStack.delete(nodeId);
    path.pop();
    return { hasCycle: false, cycle: [] };
  }
}
```

## Reactive Execution

### Triggering Scripts on Change
```typescript
class ReactiveExecutor {
  private graph: DependencyGraph;
  private executionLimit = 100; // Max executions per trigger
  
  async onAttributeChange(attributeId: string, characterId: string): Promise<void> {
    // Get all scripts that depend on this attribute
    const scriptsToRun = this.graph.getExecutionOrder(attributeId);
    
    // Execute in dependency order
    await this.executeScriptChain(scriptsToRun, characterId);
  }
  
  private async executeScriptChain(
    scriptIds: string[],
    characterId: string
  ): Promise<void> {
    const snapshot = await this.createSnapshot(characterId);
    const executionCount = new Map<string, number>();
    
    try {
      for (const scriptId of scriptIds) {
        // Check execution limit
        const count = executionCount.get(scriptId) || 0;
        if (count >= this.executionLimit) {
          throw new Error(`Execution limit exceeded for script ${scriptId} - possible infinite loop`);
        }
        
        // Execute script
        await this.executeScript(scriptId, characterId);
        executionCount.set(scriptId, count + 1);
        
        // Check if this execution triggered more changes
        // If so, add those scripts to the queue
      }
    } catch (error) {
      // Rollback to snapshot
      await this.rollback(snapshot, characterId);
      
      // Log error
      await this.logScriptError(scriptId, characterId, error);
      
      throw error;
    }
  }
}
```

### Execution Tracking
```typescript
interface ExecutionContext {
  characterId: string;
  triggerAttributeId: string;
  executionChain: string[]; // Scripts executed in this chain
  executionCount: Map<string, number>; // Per-script execution count
  startTime: number;
  snapshot: CharacterSnapshot;
}

class ExecutionTracker {
  private activeExecutions: Map<string, ExecutionContext>;
  
  startExecution(characterId: string, triggerAttributeId: string): string {
    // Generate execution ID
    // Create execution context
    // Store in activeExecutions
  }
  
  recordExecution(executionId: string, scriptId: string): void {
    // Increment execution count for script
    // Add to execution chain
    // Check limits
  }
  
  endExecution(executionId: string): void {
    // Remove from activeExecutions
    // Clean up
  }
}
```

## Transaction & Rollback

### Creating Snapshots
```typescript
interface CharacterSnapshot {
  characterId: string;
  timestamp: number;
  attributes: Map<string, any>; // attributeId -> value
  inventory: InventoryItem[];
}

async function createSnapshot(characterId: string): Promise<CharacterSnapshot> {
  const attributes = await db.characterAttributes
    .where({ characterId })
    .toArray();
  
  const inventory = await db.inventoryItems
    .where({ characterId })
    .toArray();
  
  return {
    characterId,
    timestamp: Date.now(),
    attributes: new Map(attributes.map(a => [a.id, a.value])),
    inventory: JSON.parse(JSON.stringify(inventory)), // Deep clone
  };
}
```

### Rollback on Error
```typescript
async function rollback(snapshot: CharacterSnapshot, characterId: string): Promise<void> {
  // Restore attribute values
  const updates = [];
  for (const [attrId, value] of snapshot.attributes.entries()) {
    updates.push(
      db.characterAttributes.update(attrId, { value })
    );
  }
  
  // Restore inventory
  await db.inventoryItems.where({ characterId }).delete();
  await db.inventoryItems.bulkAdd(snapshot.inventory);
  
  await Promise.all(updates);
}
```

## Infinite Loop Prevention

### Execution Limits
- Max 100 script executions per trigger
- Max 10 executions of same script per trigger
- Time limit: 5 seconds total

### Detection
```typescript
function checkExecutionLimits(context: ExecutionContext): void {
  const totalExecutions = context.executionChain.length;
  
  if (totalExecutions > 100) {
    throw new Error('Execution limit exceeded - possible infinite loop');
  }
  
  const elapsed = Date.now() - context.startTime;
  if (elapsed > 5000) {
    throw new Error('Execution time limit exceeded (5s)');
  }
  
  // Check per-script limits
  for (const [scriptId, count] of context.executionCount.entries()) {
    if (count > 10) {
      throw new Error(`Script ${scriptId} executed ${count} times - possible infinite loop`);
    }
  }
}
```

### User Notification
```typescript
async function handleInfiniteLoop(characterId: string, error: Error): Promise<void> {
  // Disable all scripts for this character
  await db.characterAttributes
    .where({ characterId })
    .modify({ scriptDisabled: true });
  
  // Show error to user
  showNotification({
    type: 'error',
    title: 'Script Error: Infinite Loop Detected',
    message: 'All scripts have been disabled for this character. Please review your scripts and re-enable them manually.',
  });
  
  // Log error
  await db.scriptErrors.add({
    characterId,
    errorMessage: error.message,
    context: 'infinite_loop_detection',
    timestamp: Date.now(),
  });
}
```

## Event Handlers

### Item Events
```typescript
async function executeItemEvent(
  itemId: string,
  characterId: string,
  eventType: 'on_equip' | 'on_unequip' | 'on_consume'
): Promise<void> {
  // Get item's script
  const item = await db.items.get(itemId);
  if (!item.scriptId) return;
  
  const script = await db.scripts.get(item.scriptId);
  if (!script) return;
  
  // Parse script to find event handler
  const ast = parseScript(script.sourceCode);
  const handler = findEventHandler(ast, eventType);
  
  if (!handler) return;
  
  // Execute handler
  const context: ScriptExecutionContext = {
    ownerId: characterId,
    rulesetId: item.rulesetId,
    scriptId: script.id,
    triggerType: 'item_event',
    db,
  };
  
  const runner = new ScriptRunner(context);
  await runner.run(handler.sourceCode);
}
```

### Action Events
```typescript
async function executeActionEvent(
  actionId: string,
  characterId: string,
  targetId: string | null,
  eventType: 'on_activate' | 'on_deactivate'
): Promise<void> {
  // Similar to item events
  // Execute on_activate or on_deactivate handler
  // Pass Target if provided
  
  const context: ScriptExecutionContext = {
    ownerId: characterId,
    targetId: targetId,
    rulesetId: action.rulesetId,
    scriptId: script.id,
    triggerType: 'action_click',
    db,
  };
  
  const runner = new ScriptRunner(context);
  await runner.run(handler.sourceCode);
}
```

## Script Execution Order

### Topological Sort
```typescript
function getExecutionOrder(graph: DependencyGraph, startNodeId: string): string[] {
  // Topological sort starting from changed attribute
  // Returns scripts in order they should execute
  
  const order: string[] = [];
  const visited = new Set<string>();
  
  function visit(nodeId: string): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = graph.nodes.get(nodeId);
    for (const dependentId of node.dependents) {
      visit(dependentId);
    }
    
    order.push(nodeId);
  }
  
  visit(startNodeId);
  return order.reverse();
}
```

## Testing

### Unit Tests
- [ ] Subscription registration
- [ ] Dependency graph building
- [ ] Circular dependency detection
- [ ] Execution order calculation
- [ ] Snapshot creation
- [ ] Rollback mechanism
- [ ] Execution limit checking
- [ ] Event handler parsing

### Integration Tests
- [ ] Single attribute change triggers dependent scripts
- [ ] Cascading updates (A → B → C)
- [ ] Circular dependency error handling
- [ ] Infinite loop detection and recovery
- [ ] Rollback on script error
- [ ] Item event execution
- [ ] Action event execution
- [ ] Multiple simultaneous changes

### Stress Tests
- [ ] 100+ scripts in dependency chain
- [ ] Complex circular dependencies
- [ ] Rapid attribute changes
- [ ] Large character snapshots
- [ ] Concurrent script executions

## Performance Considerations
- Cache dependency graph (rebuild only on script changes)
- Batch attribute updates to trigger once
- Optimize snapshot creation (only snapshot what's needed)
- Use Set/Map for fast lookups
- Consider web workers for heavy graph operations

## Dependencies
- Phase 3 (Interpreter Core) - Script execution
- Phase 4 (Game Entity Integration) - Attribute updates
- Existing database

## Deliverables
- [ ] SubscriptionManager
- [ ] DependencyGraph with cycle detection
- [ ] ReactiveExecutor
- [ ] ExecutionTracker
- [ ] Snapshot and rollback system
- [ ] Infinite loop prevention
- [ ] Event handler execution
- [ ] Comprehensive test suite
- [ ] Performance benchmarks

## Notes
- This phase makes scripts truly reactive
- Critical to get right - bugs here can corrupt character data
- Extensive testing required
- Performance is important (scripts run frequently)
- Design-time validation saves runtime errors
