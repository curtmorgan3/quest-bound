# QBScript CLI

A command-line interface for running QBScript (.qbs) files.

## Installation

The CLI is included with the Quest Bound project. No additional installation needed.

## Usage

```bash
npm run qbscript <file.qbs> [options]
```

### Options

- `--help`, `-h` - Show help message
- `--version` - Show version information
- `--verbose`, `-v` - Show detailed execution information including timing
- `--tokens` - Display tokenized output before execution
- `--ast` - Display the abstract syntax tree
- `--no-result` - Don't print the final return value

## Examples

### Basic Usage

```bash
# Run a script
npm run qbscript examples/qbscript/hello.qbs
```

Output:
```
--- ANNOUNCEMENTS ---
📢 Hello, QBScript!
📢 Welcome, Adventurer!
```

### Verbose Mode

```bash
# Show performance metrics
npm run qbscript -- -v examples/qbscript/character-stats.qbs
```

Output includes:
- Announcements
- Logs
- Final result
- Performance breakdown (lexer, parser, evaluator timing)

### Debug Mode

```bash
# Show tokens
npm run qbscript -- --tokens examples/qbscript/hello.qbs

# Show AST
npm run qbscript -- --ast examples/qbscript/hello.qbs

# Show both
npm run qbscript -- --tokens --ast examples/qbscript/hello.qbs
```

### Suppress Output

```bash
# Don't show the final return value
npm run qbscript -- --no-result examples/qbscript/character-stats.qbs
```

## Output Format

The CLI organizes output into sections:

### Announcements
Messages from `announce()` calls, prefixed with 📢

```
--- ANNOUNCEMENTS ---
📢 Hello, World!
```

### Logs
Debug output from `log()` calls, prefixed with 🔍

```
--- LOGS ---
🔍 "Debug message" 42
```

### Result
The final return value of the script

```
--- RESULT ---
39
```

### Performance (with --verbose)
Timing breakdown for each stage

```
--- PERFORMANCE ---
Lexer:     0.54ms
Parser:    0.85ms
Evaluator: 0.34ms
Total:     1.74ms
```

## Error Handling

The CLI provides helpful error messages with line and column information:

```bash
npm run qbscript examples/broken.qbs
```

Output:
```
❌ ERROR
Runtime Error: Undefined variable 'x'
  at line 5, column 10
```

## Creating QBScript Files

QBScript files use the `.qbs` extension and support:

- **Variables**: `x = 42`
- **Functions**: `myFunc(param):`
- **Control Flow**: `if`/`else if`/`else`, `for` loops
- **Built-ins**: `roll()`, `floor()`, `ceil()`, `round()`, `announce()`, `log()`
- **String Interpolation**: `"Value: {{x}}"`
- **Comments**: `//` single-line, `/* */` multi-line

See `examples/qbscript/` for complete examples.

## Tips

1. **Use `--verbose`** to see performance metrics and verify your script runs efficiently
2. **Use `--tokens`** to debug lexer issues or understand tokenization
3. **Use `--ast`** to debug parser issues or understand the syntax tree
4. **Use `log()`** for debug output that won't show in production
5. **Use `announce()`** for messages that should display to players

## Integration

The CLI uses the same interpreter that runs in the Quest Bound application, so scripts tested with the CLI will behave identically in the app.
