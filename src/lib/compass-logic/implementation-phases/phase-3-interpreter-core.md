# Phase 3: Interpreter Core

## Overview

Build the QBScript interpreter that can execute script source code. This is the heart of the scripting system - a lexer, parser, and evaluator that can run QBScript in the main thread.

## Goals

- Tokenize QBScript source code (Lexer)
- Parse tokens into Abstract Syntax Tree (Parser)
- Execute AST (Evaluator)
- Implement all language features
- Support built-in functions
- Provide execution context
- Handle errors gracefully

## Architecture

### Three-Stage Pipeline

```
Source Code → Lexer → Tokens → Parser → AST → Evaluator → Result
```

### Components

1. **Lexer** - Converts source code string into tokens
2. **Parser** - Converts tokens into Abstract Syntax Tree (AST)
3. **Evaluator** - Executes AST and returns result

## Lexer (Tokenizer)

### Token Types

```typescript
enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',

  // Identifiers
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  IN = 'IN',
  RETURN = 'RETURN',
  SUBSCRIBE = 'SUBSCRIBE',

  // Operators
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  MULTIPLY = 'MULTIPLY', // *
  DIVIDE = 'DIVIDE', // /
  POWER = 'POWER', // **
  MODULO = 'MODULO', // %

  // Comparison
  EQUAL = 'EQUAL', // ==
  NOT_EQUAL = 'NOT_EQUAL', // !=
  GREATER = 'GREATER', // >
  LESS = 'LESS', // <
  GREATER_EQ = 'GREATER_EQ', // >=
  LESS_EQ = 'LESS_EQ', // <=

  // Boolean
  AND = 'AND', // &&
  OR = 'OR', // ||
  NOT = 'NOT', // !

  // Assignment
  ASSIGN = 'ASSIGN', // =

  // Delimiters
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  COMMA = 'COMMA', // ,
  COLON = 'COLON', // :
  DOT = 'DOT', // .

  // Special
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  EOF = 'EOF',
  COMMENT = 'COMMENT',
}

interface Token {
  type: TokenType;
  value: any;
  line: number;
  column: number;
}
```

### Lexer Implementation

```typescript
class Lexer {
  private source: string;
  private position: number;
  private line: number;
  private column: number;

  constructor(source: string) {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;

      const token = this.nextToken();
      if (token.type !== TokenType.COMMENT) {
        tokens.push(token);
      }
    }

    tokens.push({ type: TokenType.EOF, value: null, line: this.line, column: this.column });
    return tokens;
  }

  private nextToken(): Token {
    // Implementation for each token type
    // Handle numbers, strings, identifiers, operators, etc.
  }

  private handleIndentation(): Token[] {
    // Track indentation levels for Python-style blocks
    // Return INDENT/DEDENT tokens
  }
}
```

### Indentation Handling

- Track indentation level stack
- Generate INDENT token when indentation increases
- Generate DEDENT token when indentation decreases
- Handle multiple dedents at once

### String Interpolation

- Detect `{{variable}}` patterns in strings
- Convert to concatenation or special AST node
- Example: `'HP: {{hp}}'` → `'HP: ' + hp`

## Parser

### AST Node Types

```typescript
type ASTNode =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | Identifier
  | BinaryOp
  | UnaryOp
  | Assignment
  | FunctionCall
  | FunctionDef
  | IfStatement
  | ForLoop
  | ReturnStatement
  | SubscribeCall
  | ArrayLiteral
  | ArrayAccess
  | MemberAccess
  | Program;

interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

interface BinaryOp {
  type: 'BinaryOp';
  operator:
    | '+'
    | '-'
    | '*'
    | '/'
    | '**'
    | '%'
    | '=='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | '&&'
    | '||';
  left: ASTNode;
  right: ASTNode;
}

interface FunctionCall {
  type: 'FunctionCall';
  name: string;
  arguments: ASTNode[];
}

interface IfStatement {
  type: 'IfStatement';
  condition: ASTNode;
  thenBlock: ASTNode[];
  elseIfBlocks: { condition: ASTNode; block: ASTNode[] }[];
  elseBlock: ASTNode[] | null;
}

// ... other node types
```

### Parser Implementation

```typescript
class Parser {
  private tokens: Token[];
  private current: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.current = 0;
  }

  parse(): Program {
    const statements: ASTNode[] = [];

    while (!this.isAtEnd()) {
      statements.push(this.statement());
    }

    return { type: 'Program', statements };
  }

  private statement(): ASTNode {
    // Parse different statement types
    // if, for, return, assignment, function call, etc.
  }

  private expression(): ASTNode {
    // Parse expressions using precedence climbing
  }

  private parseBinaryOp(precedence: number): ASTNode {
    // Operator precedence parsing
  }
}
```

### Operator Precedence

```
1. || (OR)
2. && (AND)
3. == != (Equality)
4. > < >= <= (Comparison)
5. + - (Addition/Subtraction)
6. * / % (Multiplication/Division/Modulo)
7. ** (Power)
8. ! (NOT)
9. . (Member access)
10. [] (Array access)
11. () (Function call)
```

## Evaluator

### Execution Environment

```typescript
interface Environment {
  variables: Map<string, any>;
  parent: Environment | null;

  get(name: string): any;
  set(name: string, value: any): void;
  define(name: string, value: any): void;
}

class Evaluator {
  private globalEnv: Environment;
  private currentEnv: Environment;

  constructor() {
    this.globalEnv = new Environment(null);
    this.currentEnv = this.globalEnv;
    this.registerBuiltins();
  }

  eval(node: ASTNode): any {
    switch (node.type) {
      case 'NumberLiteral':
        return node.value;
      case 'StringLiteral':
        return this.interpolateString(node.value);
      case 'BinaryOp':
        return this.evalBinaryOp(node);
      case 'FunctionCall':
        return this.evalFunctionCall(node);
      case 'IfStatement':
        return this.evalIfStatement(node);
      // ... other node types
    }
  }

  private registerBuiltins(): void {
    // Register built-in functions
    this.globalEnv.define('roll', this.builtinRoll);
    this.globalEnv.define('floor', Math.floor);
    this.globalEnv.define('ceil', Math.ceil);
    this.globalEnv.define('round', Math.round);
    this.globalEnv.define('announce', this.builtinAnnounce);
    this.globalEnv.define('console.log', this.builtinConsoleLog);
  }
}
```

### Built-in Functions

#### roll()

```typescript
function builtinRoll(expression: string): number {
  // Parse dice expression (e.g., '2d6+4')
  // Use existing dice-utils.ts
  // Return rolled result

  const tokens = parseDiceExpression(expression);
  let total = 0;

  for (const segment of tokens) {
    for (const token of segment) {
      if (token.type === 'dice') {
        for (let i = 0; i < token.count; i++) {
          total += rollDie(token.sides);
        }
      } else if (token.type === 'modifier') {
        total += token.value;
      }
    }
  }

  return total;
}
```

#### floor(), ceil(), round()

```typescript
// Use Math.floor, Math.ceil, Math.round directly
```

#### announce()

```typescript
function builtinAnnounce(message: string): void {
  // Store message for display to player
  // Will be sent via signal in Phase 6
  console.log('[ANNOUNCE]', message);
}
```

#### log()

```typescript
function builtinConsoleLog(...args: any[]): void {
  // Store log for debug console
  // Will be sent via signal in Phase 6
  console.log('[SCRIPT]', ...args);
}
```

### String Interpolation

```typescript
function interpolateString(str: string, env: Environment): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const value = env.get(varName.trim());
    return value !== undefined ? String(value) : match;
  });
}
```

### Control Flow

#### If/Else

```typescript
function evalIfStatement(node: IfStatement): any {
  const condition = this.eval(node.condition);

  if (this.isTruthy(condition)) {
    return this.evalBlock(node.thenBlock);
  }

  for (const elseIf of node.elseIfBlocks) {
    if (this.isTruthy(this.eval(elseIf.condition))) {
      return this.evalBlock(elseIf.block);
    }
  }

  if (node.elseBlock) {
    return this.evalBlock(node.elseBlock);
  }

  return null;
}
```

#### For Loop

```typescript
function evalForLoop(node: ForLoop): any {
  if (node.iterableType === 'range') {
    // for i in 10:
    const count = this.eval(node.iterable);
    for (let i = 0; i < count; i++) {
      this.currentEnv.define(node.variable, i);
      this.evalBlock(node.body);
    }
  } else {
    // for item in array:
    const array = this.eval(node.iterable);
    for (const item of array) {
      this.currentEnv.define(node.variable, item);
      this.evalBlock(node.body);
    }
  }
}
```

### Function Definitions

```typescript
function evalFunctionDef(node: FunctionDef): void {
  // Store function in environment
  this.currentEnv.define(node.name, {
    type: 'function',
    params: node.params,
    body: node.body,
    closure: this.currentEnv, // Lexical scope
  });
}

function evalFunctionCall(node: FunctionCall): any {
  const func = this.currentEnv.get(node.name);

  if (typeof func === 'function') {
    // Built-in function
    const args = node.arguments.map((arg) => this.eval(arg));
    return func(...args);
  } else if (func.type === 'function') {
    // User-defined function
    const newEnv = new Environment(func.closure);

    // Bind parameters
    for (let i = 0; i < func.params.length; i++) {
      newEnv.define(func.params[i], this.eval(node.arguments[i]));
    }

    // Execute function body
    const prevEnv = this.currentEnv;
    this.currentEnv = newEnv;
    const result = this.evalBlock(func.body);
    this.currentEnv = prevEnv;

    return result;
  }
}
```

## Error Handling

### Runtime Errors

```typescript
class RuntimeError extends Error {
  line: number;
  column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.line = line;
    this.column = column;
  }
}
```

### Error Recovery

- Catch errors during evaluation
- Include line/column information
- Provide helpful error messages
- Don't crash - return error object

### Common Errors

- Division by zero
- Undefined variable
- Invalid function call
- Type mismatch (e.g., adding string + number)
- Array index out of bounds

## Testing

### Unit Tests - Lexer

- [ ] Tokenize numbers, strings, booleans
- [ ] Tokenize operators
- [ ] Tokenize keywords
- [ ] Handle indentation (INDENT/DEDENT)
- [ ] Handle comments
- [ ] Line/column tracking

### Unit Tests - Parser

- [ ] Parse literals
- [ ] Parse binary operations
- [ ] Parse function calls
- [ ] Parse if/else statements
- [ ] Parse for loops
- [ ] Parse function definitions
- [ ] Parse assignments
- [ ] Parse array literals and access
- [ ] Parse member access

### Unit Tests - Evaluator

- [ ] Evaluate arithmetic
- [ ] Evaluate comparisons
- [ ] Evaluate boolean logic
- [ ] Evaluate if/else
- [ ] Evaluate for loops
- [ ] Evaluate function definitions and calls
- [ ] Evaluate built-in functions
- [ ] String interpolation
- [ ] Variable scoping
- [ ] Error handling

## Performance Considerations

- Efficient tokenization (single pass)
- AST caching for repeated execution
- Avoid unnecessary object creation
- Benchmark against target performance (< 100ms for typical scripts)

## Dependencies

- Phase 1 (Data Model) - Script entity
- Existing `dice-utils.ts` for dice rolling

## Deliverables

- [ ] Lexer implementation
- [ ] Parser implementation
- [ ] Evaluator implementation
- [ ] All built-in functions
- [ ] String interpolation
- [ ] Error handling
- [ ] Comprehensive test suite
- [ ] Performance benchmarks

## Notes

- This phase runs interpreter in main thread
- No Owner/Target/Ruleset APIs yet (Phase 4)
- Can test with simple scripts (math, logic, functions)
- Service Worker migration happens in Phase 6
- Focus on correctness first, optimization later
