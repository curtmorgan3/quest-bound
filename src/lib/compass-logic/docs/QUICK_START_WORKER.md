# QBScript Worker - Quick Start Guide

## Installation

The worker is already set up! Just import and use the hooks.

## Basic Usage

### 1. Execute a Script

```tsx
import { useExecuteScript } from '@/lib/compass-logic/worker';

function DiceRoller() {
  const { execute, result, isExecuting, error } = useExecuteScript();

  return (
    <div>
      <button 
        onClick={() => execute({
          sourceCode: 'roll("2d6+4")',
          characterId: 'char-123',
          rulesetId: 'ruleset-456',
        })}
        disabled={isExecuting}
      >
        Roll Dice
      </button>
      
      {result && <p>Result: {result}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### 2. Execute an Action

```tsx
import { useExecuteAction } from '@/lib/compass-logic/worker';

function ActionButton({ actionId, characterId }) {
  const { executeAction, announceMessages, isExecuting } = useExecuteAction();

  return (
    <div>
      <button 
        onClick={() => executeAction(actionId, characterId)}
        disabled={isExecuting}
      >
        Attack
      </button>
      
      {announceMessages.map((msg, i) => (
        <div key={i}>{msg}</div>
      ))}
    </div>
  );
}
```

### 3. Handle Attribute Changes

```tsx
import { useAttributeChange } from '@/lib/compass-logic/worker';
import { db } from '@/stores/db';

function AttributeInput({ attributeId, characterId, rulesetId }) {
  const [value, setValue] = useState(0);
  const { notifyChange, isProcessing } = useAttributeChange();

  const handleChange = async (newValue: number) => {
    setValue(newValue);
    
    // Update database
    await db.characterAttributes.update(/* ... */);
    
    // Trigger reactive scripts
    await notifyChange({
      attributeId,
      characterId,
      rulesetId,
    });
  };

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => handleChange(Number(e.target.value))}
      disabled={isProcessing}
    />
  );
}
```

### 4. Show Announcements

```tsx
import { useScriptAnnouncements } from '@/lib/compass-logic/worker';
import { toast } from 'sonner';

function AnnouncementListener() {
  useScriptAnnouncements((message) => {
    toast.info(message);
  });
  
  return null; // This is a listener component
}

// Add to your app root:
function App() {
  return (
    <>
      <AnnouncementListener />
      {/* rest of your app */}
    </>
  );
}
```

## Advanced Usage

### Script Validation

```tsx
import { useScriptValidation } from '@/lib/compass-logic/worker';

function ScriptEditor() {
  const [code, setCode] = useState('');
  const { validate, isValid, errors } = useScriptValidation();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (code) validate('script-id', code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div>
      <textarea 
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {isValid === false && (
        <div>
          {errors.map((err, i) => (
            <div key={i}>{err.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Dependency Graph Management

```tsx
import { useDependencyGraph } from '@/lib/compass-logic/worker';

function GraphManager({ rulesetId }) {
  const { build, clear, isBuilding, success } = useDependencyGraph();

  return (
    <div>
      <button onClick={() => build(rulesetId)} disabled={isBuilding}>
        {isBuilding ? 'Building...' : 'Build Graph'}
      </button>
      <button onClick={() => clear(rulesetId)}>
        Clear Graph
      </button>
      {success && <p>✓ Graph built successfully</p>}
    </div>
  );
}
```

### Direct Client Access

```tsx
import { useQBScriptClient } from '@/lib/compass-logic/worker';

function AdvancedComponent() {
  const client = useQBScriptClient();

  const customExecution = async () => {
    const result = await client.executeScript({
      sourceCode: 'myCustomScript()',
      characterId: 'char-123',
      rulesetId: 'ruleset-456',
      timeout: 30000, // 30 second timeout
    });
    
    console.log('Execution time:', result.executionTime, 'ms');
  };

  return <button onClick={customExecution}>Execute</button>;
}
```

## Tips

1. **Always handle errors** - Script execution can fail
2. **Use timeouts** - Prevent scripts from hanging
3. **Listen for announcements** - Add `useScriptAnnouncements()` to your app
4. **Disable during execution** - Prevent double-clicks
5. **Show loading states** - Use `isExecuting` to show feedback

## Next Steps

- Read full documentation: `phase-6-implementation-complete.md`
- See examples: `../examples/worker-examples.tsx`
- Explore the API: `worker/index.ts`
