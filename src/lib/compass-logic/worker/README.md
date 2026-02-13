# QBScript Web Worker

This directory contains the Web Worker implementation for QBScript execution.

## Quick Start

```tsx
import { useExecuteScript } from '@/lib/compass-logic/worker';

function MyComponent() {
  const { execute, result, isExecuting } = useExecuteScript();

  const runScript = () => {
    execute({
      sourceCode: 'roll("2d6+4")',
      characterId: 'char-123',
      rulesetId: 'ruleset-456',
    });
  };

  return (
    <button onClick={runScript} disabled={isExecuting}>
      {result !== null ? `Result: ${result}` : 'Execute'}
    </button>
  );
}
```

## Files

- **`signals.ts`** - Type definitions for worker communication protocol
- **`qbscript-worker.ts`** - Web Worker implementation (runs in worker thread)
- **`client.ts`** - QBScriptClient for main thread communication
- **`hooks.tsx`** - React hooks for easy component integration
- **`index.ts`** - Public API exports

## Available Hooks

### `useExecuteScript()`
Execute arbitrary scripts with full control.

### `useExecuteAction()`
Execute action scripts by action ID.

### `useAttributeChange()`
Notify worker of attribute changes (triggers reactive scripts).

### `useScriptValidation()`
Validate script syntax without executing.

### `useScriptAnnouncements()`
Listen for announcement messages from scripts.

### `useDependencyGraph()`
Build and manage dependency graphs for rulesets.

## Documentation

See `../docs/implementation-phases/phase-6-implementation-complete.md` for full documentation.

See `../examples/worker-examples.tsx` for usage examples.
