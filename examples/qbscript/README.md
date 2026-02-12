# QBScript Examples

This directory contains example QBScript (.qbs) files demonstrating various features of the language.

## Running Examples

Use the QBScript CLI to run any example:

```bash
npm run qbscript examples/qbscript/hello.qbs
```

### Options

- `--verbose` or `-v` - Show detailed execution information including timing
- `--tokens` - Display tokenized output before execution
- `--ast` - Display the abstract syntax tree
- `--no-result` - Don't print the final return value

### Examples

```bash
# Run a simple script
npm run qbscript examples/qbscript/hello.qbs

# Run with verbose output
npm run qbscript -- -v examples/qbscript/character-stats.qbs

# Show tokens and AST
npm run qbscript -- --tokens --ast examples/qbscript/dice-roll.qbs
```

## Example Scripts

### hello.qbs
Simple hello world demonstrating:
- `announce()` function
- String interpolation with `{{variable}}`

### dice-roll.qbs
Dice rolling example showing:
- `roll()` function with dice notation
- Conditional logic
- `log()` for debug output

### character-stats.qbs
D&D-style character calculator with:
- Function definitions
- Ability score modifiers
- Derived stat calculations
- Multiple announcements

### fibonacci.qbs
Recursive fibonacci sequence:
- Recursive function calls
- For loops
- Return values

### combat-simulation.qbs
Turn-based combat simulation:
- Complex control flow
- Multiple variables
- Nested conditionals
- Loop with early exit logic
- Dice rolls for randomness

## Language Features Demonstrated

- **Variables**: Dynamic typing, no declarations needed
- **Functions**: First-class functions with parameters and return values
- **Control Flow**: if/else if/else, for loops
- **Operators**: Arithmetic (+, -, *, /, **, %), comparison (>, <, >=, <=, ==, !=), boolean (&&, ||, !)
- **Built-ins**: roll(), floor(), ceil(), round(), announce(), log()
- **String Interpolation**: `{{variable}}` syntax
- **Arrays**: Literals and iteration
- **Comments**: Single-line (//) and multi-line (/* */)
