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
Execute action scripts by action ID (runs the full script, e.g. when the user clicks the action).

### `useExecuteActionEvent()`
Execute action **event** handlers (`on_activate`, `on_deactivate`) in the worker. Uses `EventHandlerExecutor` so only the chosen handler runs. You can pass an optional `roll` function so scripts can call `roll()` in the worker: the worker sends a `ROLL_REQUEST` to the main thread, the main thread runs your `roll(expression)` and sends `ROLL_RESPONSE` back (functions can't be sent via `postMessage`, so this round-trip is used instead).

**Example: fire an action event from a React component (runs in worker thread)**

```tsx
import { useExecuteActionEvent } from '@/lib/compass-logic/worker';

function ActionSheetPanel({
  actionId,
  characterId,
  targetId,
}: {
  actionId: string;
  characterId: string;
  targetId: string | null;
}) {
  const {
    executeActionEvent,
    result,
    logMessages,
    isExecuting,
    error,
    reset,
  } = useExecuteActionEvent(10000);

  // Run on_activate when this panel opens (e.g. in useEffect or on mount)
  const handleActivate = () => {
    executeActionEvent(actionId, characterId, targetId ?? null, 'on_activate');
  };

  const handleDeactivate = () => {
    executeActionEvent(actionId, characterId, targetId ?? null, 'on_deactivate');
  };

  return (
    <div>
      <button onClick={handleActivate} disabled={isExecuting}>
        Activate
      </button>
      <button onClick={handleDeactivate} disabled={isExecuting}>
        Deactivate
      </button>
      {error && <p role="alert">{error.message}</p>}
      {logMessages.length > 0 && (
        <ul>
          {logMessages.map((args, i) => (
            <li key={i}>{args.map(String).join(' ')}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### `useExecuteItemEvent()`
Execute item event handlers (`on_equip`, `on_unequip`, `on_consume`).

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
