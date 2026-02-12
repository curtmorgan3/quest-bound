# QBScript Interpreter

A complete interpreter for QBScript, the scripting language for Quest Bound.

## Overview

QBScript is a dynamically typed, interpreted language with Python-like indentation-based syntax and C-like operators. It's designed for game designers to create reactive attributes, event-driven actions, and complex game logic.

## Components

### 1. Lexer (`lexer.ts`)
Tokenizes QBScript source code into a stream of tokens.

**Features:**
- All token types (literals, operators, keywords, delimiters)
- 4-space indentation handling with INDENT/DEDENT tokens
- Single-line (`//`) and multi-line (`/* */`) comments
- Line and column tracking for error reporting
- String escape sequences

**Tests:** 75 unit tests

### 2. Parser (`parser.ts`)
Parses token stream into an Abstract Syntax Tree (AST).

**Features:**
- All AST node types defined in `ast.ts`
- Proper operator precedence
- Statement parsing (functions, if/else, for loops, return, subscribe)
- Expression parsing with precedence climbing
- Member access, array access, function calls
- Error handling with line/column information

**Tests:** 79 unit tests

### 3. Evaluator (`evaluator.ts`)
Executes the AST and produces results.

**Features:**
- Environment-based variable scoping
- All binary and unary operations
- Control flow (if/else if/else, for loops)
- Function definitions with lexical closure
- Built-in functions (roll, floor, ceil, round, abs, min, max, announce, log)
- String interpolation (`{{variable}}`)
- Array operations with bounds checking
- Comprehensive error handling

**Tests:** 96 unit tests

### 4. CLI (`cli.ts`)
Command-line interface for running QBScript files.

**Features:**
- Run .qbs files from the command line
- Verbose mode with performance metrics
- Debug modes (--tokens, --ast)
- Formatted output (announcements, logs, results)
- Error reporting with line/column info

**Usage:** See [CLI.md](./CLI.md)

## Performance

All components are optimized for fast execution:
- **Lexer:** < 10ms for typical scripts
- **Parser:** < 10ms for typical scripts
- **Evaluator:** < 100ms for typical scripts
- **Total:** < 100ms end-to-end

**Tests:** 11 performance benchmarks

## Language Features

### Variables
```javascript
x = 42
name = "Adventurer"
items = [1, 2, 3]
```

### Functions
```javascript
calculateModifier(score):
    return floor((score - 10) / 2)

result = calculateModifier(16)
```

### Control Flow
```javascript
if hp > 50:
    status = "Healthy"
else if hp > 0:
    status = "Injured"
else:
    status = "Dead"

for i in 10:
    log(i)

for item in items:
    process(item)
```

### Built-in Functions
```javascript
roll("2d6+4")        // Dice rolling
floor(3.7)           // Math functions
announce("Message")  // Player messages
log("Debug")         // Debug output
```

### String Interpolation
```javascript
hp = 100
announce("You have {{hp}} health")
```

### Arrays
```javascript
items = [1, 2, 3]
first = items[0]
items.length
```

## Testing

**Total: 261 tests passing**
- 75 Lexer tests
- 79 Parser tests
- 96 Evaluator tests
- 11 Performance tests

Run tests:
```bash
npm run test:unit -- tests/unit/lib/compass-logic/interpreter/
```

## Examples

See `examples/qbscript/` for complete working examples:
- `hello.qbs` - Basic syntax and string interpolation
- `dice-roll.qbs` - Dice rolling and conditionals
- `character-stats.qbs` - D&D-style stat calculator
- `fibonacci.qbs` - Recursive functions
- `combat-simulation.qbs` - Complex game logic

Run examples:
```bash
npm run qbscript examples/qbscript/hello.qbs
```

## Architecture

```
Source Code (.qbs file)
    ↓
Lexer (lexer.ts)
    ↓
Tokens
    ↓
Parser (parser.ts)
    ↓
AST (ast.ts)
    ↓
Evaluator (evaluator.ts)
    ↓
Result + Side Effects (announce, log)
```

## Error Handling

All components provide detailed error messages:

```
❌ ERROR
Runtime Error: Undefined variable 'x'
  at line 5, column 10
```

Errors include:
- Division by zero
- Undefined variables
- Invalid function calls
- Array bounds violations
- Type mismatches
- Parse errors

## Integration

The interpreter is designed to integrate with Quest Bound:

**Phase 3 (Current):** Core interpreter running in main thread
**Phase 4:** Owner/Target/Ruleset APIs for game entity access
**Phase 6:** Service Worker execution for non-blocking performance

## Files

```
src/lib/compass-logic/interpreter/
├── lexer.ts           # Tokenizer
├── parser.ts          # Parser
├── ast.ts             # AST node definitions
├── evaluator.ts       # Evaluator/runtime
├── cli.ts             # Command-line interface
├── README.md          # This file
└── CLI.md             # CLI documentation

tests/unit/lib/compass-logic/interpreter/
├── lexer.test.ts      # Lexer tests
├── parser.test.ts     # Parser tests
├── evaluator.test.ts  # Evaluator tests
└── performance.test.ts # Performance benchmarks

examples/qbscript/
├── hello.qbs
├── dice-roll.qbs
├── character-stats.qbs
├── fibonacci.qbs
├── combat-simulation.qbs
└── README.md
```

## Development

### Adding Built-in Functions

Add to `evaluator.ts`:

```typescript
this.globalEnv.define('myFunc', (arg: any) => {
  // Implementation
  return result;
});
```

### Adding Language Features

1. Add token type to `lexer.ts` if needed
2. Add AST node type to `ast.ts`
3. Add parsing logic to `parser.ts`
4. Add evaluation logic to `evaluator.ts`
5. Add tests for all components

## Resources

- [QBScript Language Specification](../QBScript.md)
- [Phase 3 Implementation Plan](../implementation-phases/phase-3-interpreter-core.md)
- [CLI Documentation](./CLI.md)
- [Example Scripts](../../../examples/qbscript/)
