# Phase 4: Game Entity Integration

## Overview
Integrate the interpreter with Quest Bound's game entities. Implement the Owner, Target, and Ruleset accessor objects and all their methods so scripts can read/write game data.

## Goals
- Implement Owner, Target, Ruleset accessor objects
- Add Attribute methods (.value, .set(), .add(), etc.)
- Add Character methods (hasItem, addItem, removeItem)
- Add Item methods and custom properties
- Add Action methods (activate, deactivate)
- Add Chart query methods
- Provide execution context with character data
- Enable scripts to modify game state

## Accessor Objects

### Owner Accessor
Represents the character executing the script.

```typescript
class OwnerAccessor {
  private characterId: string;
  private db: Dexie;
  
  constructor(characterId: string, db: Dexie) {
    this.characterId = characterId;
    this.db = db;
  }
  
  Attribute(name: string): AttributeProxy {
    // Find character attribute by name
    // Return proxy object with methods
  }
  
  Action(name: string): ActionProxy {
    // Find action by name
    // Return proxy object with methods
  }
  
  Item(name: string): ItemProxy | null {
    // Find first matching item in character inventory
    // Return proxy or null
  }
  
  Items(name: string): ItemArrayProxy {
    // Find all matching items in character inventory
    // Return array proxy with methods
  }
  
  hasItem(name: string): boolean {
    // Check if character has item
  }
  
  addItem(name: string, quantity: number): void {
    // Add items to character inventory
  }
  
  removeItem(name: string, quantity: number): void {
    // Remove items from character inventory
  }
  
  get title(): string {
    // Return character name
  }
}
```

### Target Accessor
Represents another character (optional, selected by player).

```typescript
class TargetAccessor extends OwnerAccessor {
  // Same implementation as Owner, but for different character
  // May be null if no target selected
}
```

### Ruleset Accessor
Provides access to ruleset-level definitions.

```typescript
class RulesetAccessor {
  private rulesetId: string;
  private db: Dexie;
  
  constructor(rulesetId: string, db: Dexie) {
    this.rulesetId = rulesetId;
    this.db = db;
  }
  
  Attribute(name: string): AttributeDefinitionProxy {
    // Find attribute definition by name
    // Return proxy with .description, .title, etc.
  }
  
  Action(name: string): ActionDefinitionProxy {
    // Find action definition by name
    // Return proxy
  }
  
  Item(name: string): ItemDefinitionProxy {
    // Find item definition by name
    // Return proxy with custom properties
  }
  
  Chart(name: string): ChartProxy {
    // Find chart by name
    // Return proxy with query methods
  }
}
```

## Attribute Proxy

### AttributeProxy (for Owner/Target)
```typescript
class AttributeProxy {
  private characterAttribute: CharacterAttribute;
  private attribute: Attribute;
  private db: Dexie;
  
  get value(): any {
    return this.characterAttribute.value;
  }
  
  set(newValue: any): void {
    // Update character attribute value
    this.db.characterAttributes.update(this.characterAttribute.id, {
      value: newValue,
    });
  }
  
  add(amount: number): void {
    const current = Number(this.characterAttribute.value);
    this.set(current + amount);
  }
  
  subtract(amount: number): void {
    const current = Number(this.characterAttribute.value);
    this.set(current - amount);
  }
  
  multiply(factor: number): void {
    const current = Number(this.characterAttribute.value);
    this.set(current * factor);
  }
  
  divide(divisor: number): void {
    const current = Number(this.characterAttribute.value);
    this.set(current / divisor);
  }
  
  max(): void {
    // Set to attribute's max value
    if (this.attribute.max !== undefined) {
      this.set(this.attribute.max);
    }
  }
  
  min(): void {
    // Set to attribute's min value
    if (this.attribute.min !== undefined) {
      this.set(this.attribute.min);
    }
  }
  
  flip(): void {
    // Toggle boolean attribute
    this.set(!this.characterAttribute.value);
  }
  
  random(): any {
    // Set to random option (list attributes)
    if (this.attribute.type === 'list' && this.attribute.options) {
      const randomIndex = Math.floor(Math.random() * this.attribute.options.length);
      this.set(this.attribute.options[randomIndex]);
      return this.attribute.options[randomIndex];
    }
  }
  
  next(): any {
    // Set to next option in list
    if (this.attribute.type === 'list' && this.attribute.options) {
      const currentIndex = this.attribute.options.indexOf(this.characterAttribute.value);
      const nextIndex = (currentIndex + 1) % this.attribute.options.length;
      this.set(this.attribute.options[nextIndex]);
      return this.attribute.options[nextIndex];
    }
  }
  
  prev(): any {
    // Set to previous option in list
    if (this.attribute.type === 'list' && this.attribute.options) {
      const currentIndex = this.attribute.options.indexOf(this.characterAttribute.value);
      const prevIndex = (currentIndex - 1 + this.attribute.options.length) % this.attribute.options.length;
      this.set(this.attribute.options[prevIndex]);
      return this.attribute.options[prevIndex];
    }
  }
  
  get description(): string {
    return this.attribute.description;
  }
  
  get title(): string {
    return this.attribute.title;
  }
}
```

## Item Proxy

### ItemProxy
```typescript
class ItemProxy {
  private inventoryItem: InventoryItem;
  private item: Item;
  private db: Dexie;
  
  get quantity(): number {
    return this.inventoryItem.quantity;
  }
  
  get weight(): number {
    return this.item.weight;
  }
  
  get description(): string {
    return this.item.description;
  }
  
  get title(): string {
    return this.item.title;
  }
  
  // Custom properties (from item.customProperties)
  // Dynamically added based on item definition
  [key: string]: any;
  
  consume(): void {
    // Trigger on_consume() event
    // Handled in Phase 5 (Reactive System)
  }
}
```

### ItemArrayProxy
```typescript
class ItemArrayProxy {
  private items: ItemProxy[];
  
  count(): number {
    return this.items.length;
  }
  
  first(): ItemProxy | null {
    return this.items[0] || null;
  }
  
  last(): ItemProxy | null {
    return this.items[this.items.length - 1] || null;
  }
  
  push(item: ItemProxy): void {
    this.items.push(item);
  }
  
  pop(): ItemProxy | null {
    return this.items.pop() || null;
  }
  
  [index: number]: ItemProxy;
}
```

## Action Proxy

### ActionProxy
```typescript
class ActionProxy {
  private action: Action;
  private characterId: string;
  private db: Dexie;
  
  activate(target?: TargetAccessor): void {
    // Execute action's on_activate() script
    // Handled in Phase 5 (Reactive System)
  }
  
  deactivate(target?: TargetAccessor): void {
    // Execute action's on_deactivate() script
    // Handled in Phase 5 (Reactive System)
  }
  
  get description(): string {
    return this.action.description;
  }
  
  get title(): string {
    return this.action.title;
  }
}
```

## Chart Proxy

### ChartProxy
```typescript
class ChartProxy {
  private chart: Chart;
  private data: any[][];
  
  constructor(chart: Chart) {
    this.chart = chart;
    this.data = JSON.parse(chart.data);
  }
  
  get(columnName: string): any[] {
    // Find column index by name
    const headers = this.data[0];
    const columnIndex = headers.indexOf(columnName);
    
    if (columnIndex === -1) {
      throw new Error(`Column '${columnName}' not found in chart '${this.chart.title}'`);
    }
    
    // Return all values in column (skip header row)
    return this.data.slice(1).map(row => row[columnIndex]);
  }
  
  where(sourceColumn: string, sourceValue: any, targetColumn: string): any {
    const headers = this.data[0];
    const sourceIndex = headers.indexOf(sourceColumn);
    const targetIndex = headers.indexOf(targetColumn);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      return ''; // Column not found
    }
    
    // Find first matching row
    for (let i = 1; i < this.data.length; i++) {
      if (this.data[i][sourceIndex] == sourceValue) {
        return this.data[i][targetIndex];
      }
    }
    
    return ''; // No match found
  }
}
```

## Execution Context

### ScriptExecutionContext
```typescript
interface ScriptExecutionContext {
  ownerId: string;           // Character executing the script
  targetId?: string | null;  // Optional target character
  rulesetId: string;         // Current ruleset
  db: Dexie;                 // Database access
  scriptId: string;          // Which script is executing
  triggerType: 'load' | 'attribute_change' | 'action_click' | 'item_event';
}

class ScriptRunner {
  private context: ScriptExecutionContext;
  private interpreter: Evaluator;
  
  constructor(context: ScriptExecutionContext) {
    this.context = context;
    this.interpreter = new Evaluator();
    this.setupAccessors();
  }
  
  private setupAccessors(): void {
    // Create accessor objects
    const owner = new OwnerAccessor(this.context.ownerId, this.context.db);
    const target = this.context.targetId 
      ? new TargetAccessor(this.context.targetId, this.context.db)
      : null;
    const ruleset = new RulesetAccessor(this.context.rulesetId, this.context.db);
    
    // Inject into interpreter environment
    this.interpreter.globalEnv.define('Owner', owner);
    this.interpreter.globalEnv.define('Target', target);
    this.interpreter.globalEnv.define('Ruleset', ruleset);
  }
  
  async run(sourceCode: string): Promise<any> {
    try {
      const tokens = new Lexer(sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      const result = this.interpreter.eval(ast);
      return result;
    } catch (error) {
      // Log error to ScriptError table
      // Return error object
      throw error;
    }
  }
}
```

## Database Operations

### Read Operations
All accessor methods need to query the database:
- `db.characterAttributes.where({ characterId, attributeId }).first()`
- `db.inventoryItems.where({ characterId, entityId }).toArray()`
- `db.actions.where({ rulesetId, title }).first()`
- `db.charts.where({ rulesetId, title }).first()`

### Write Operations
Update operations need to modify database:
- `db.characterAttributes.update(id, { value })`
- `db.inventoryItems.add({ characterId, entityId, quantity })`
- `db.inventoryItems.delete(id)`

### Async Considerations
- Database operations are async
- Accessor methods should be async
- Or use synchronous cache (loaded before script execution)

### Caching Strategy
For performance, cache entity data before script execution:
```typescript
class CachedScriptRunner extends ScriptRunner {
  private cache: {
    attributes: Map<string, CharacterAttribute>;
    items: Map<string, InventoryItem[]>;
    actions: Map<string, Action>;
    charts: Map<string, Chart>;
  };
  
  async loadCache(): Promise<void> {
    // Pre-load all data the script might need
    // Makes accessor methods synchronous
  }
  
  async flushCache(): Promise<void> {
    // Write all changes back to database
    // Called after script execution
  }
}
```

## Custom Item Properties

### Dynamic Property Access
```typescript
function createItemProxy(item: Item, inventoryItem: InventoryItem): ItemProxy {
  const proxy = new ItemProxy(inventoryItem, item, db);
  
  // Add custom properties dynamically
  if (item.customProperties) {
    for (const [key, value] of Object.entries(item.customProperties)) {
      Object.defineProperty(proxy, key, {
        get: () => value,
        enumerable: true,
      });
    }
  }
  
  return proxy;
}
```

## Error Handling

### Missing Entities
- Attribute not found → throw error with helpful message
- Item not found → return null (for single) or empty array (for multiple)
- Chart not found → throw error
- Invalid chart query → return empty string

### Type Mismatches
- Adding to non-numeric attribute → throw error
- Calling flip() on non-boolean → throw error
- Array operations on non-array → throw error

## Testing

### Unit Tests - Accessors
- [ ] Owner.Attribute() returns correct proxy
- [ ] Owner.Item() finds items
- [ ] Owner.hasItem() checks inventory
- [ ] Target accessor works when provided
- [ ] Ruleset.Chart() returns chart proxy

### Unit Tests - Attribute Methods
- [ ] .value getter
- [ ] .set() updates database
- [ ] .add() adds correctly
- [ ] .subtract() subtracts correctly
- [ ] .flip() toggles boolean
- [ ] .random() selects random option
- [ ] .next()/.prev() cycle through list

### Unit Tests - Item Methods
- [ ] Custom properties accessible
- [ ] .count() returns correct count
- [ ] Array indexing works
- [ ] .first()/.last() work

### Unit Tests - Chart Methods
- [ ] .get() returns column values
- [ ] .where() finds matching row
- [ ] .where() returns empty string on no match

### Integration Tests
- [ ] Execute script with Owner operations
- [ ] Execute script with Target operations
- [ ] Execute script with Chart queries
- [ ] Execute script modifying multiple attributes
- [ ] Caching and flushing work correctly

## Performance Considerations
- Cache entity data before execution
- Batch database writes after execution
- Avoid repeated database queries
- Index commonly queried fields

## Dependencies
- Phase 1 (Data Model) - Entity schemas
- Phase 3 (Interpreter Core) - Evaluator
- Existing database (Dexie)
- Existing entity types

## Deliverables
- [ ] Owner/Target/Ruleset accessor classes
- [ ] Attribute proxy with all methods
- [ ] Item proxy with custom properties
- [ ] Action proxy
- [ ] Chart proxy with query methods
- [ ] ScriptExecutionContext
- [ ] CachedScriptRunner
- [ ] Unit tests for all methods
- [ ] Integration tests
- [ ] Performance benchmarks

## Notes
- This phase makes scripts useful - they can now interact with game data
- Scripts still run in main thread (Service Worker in Phase 6)
- No reactive subscriptions yet (Phase 5)
- Focus on correctness of each method
- Caching is critical for performance
