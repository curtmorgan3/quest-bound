# QBScript Interpreter Integration Guide

This guide shows how to integrate the QBScript interpreter into React components and the Quest Bound application.

## Basic Integration

### Simple Script Execution

The most basic integration - execute a script and display the result:

```tsx
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';

function ScriptRunner() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runScript = (source: string) => {
    try {
      // Three-stage pipeline
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      const result = evaluator.eval(ast);
      
      setResult(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div>
      <button onClick={() => runScript('2 + 3 * 4')}>
        Run Script
      </button>
      {result !== null && <div>Result: {result}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Practical Use Cases

### 1. Attribute Script Evaluation

Reactive attributes that recalculate when dependencies change:

```tsx
import { useEffect, useState } from 'react';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';

interface AttributeScriptProps {
  script: string;
  dependencies: Record<string, any>; // e.g., { Constitution: 14, Level: 5 }
}

function AttributeScript({ script, dependencies }: AttributeScriptProps) {
  const [value, setValue] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const lexer = new Lexer(script);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      
      // Inject dependencies into the environment
      Object.entries(dependencies).forEach(([key, val]) => {
        evaluator['globalEnv'].define(key, val);
      });
      
      const result = evaluator.eval(ast);
      setValue(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setValue(null);
    }
  }, [script, dependencies]); // Re-run when script or dependencies change

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return <div className="font-bold">{value}</div>;
}

// Usage:
function CharacterSheet() {
  const [constitution, setConstitution] = useState(14);
  const [level, setLevel] = useState(5);

  const maxHpScript = `
    base = 10
    con_bonus = Constitution * 2
    level_bonus = Level * 5
    return base + con_bonus + level_bonus
  `;

  return (
    <div>
      <h2>Max HP</h2>
      <AttributeScript 
        script={maxHpScript}
        dependencies={{ Constitution: constitution, Level: level }}
      />
      
      <input 
        type="number" 
        value={constitution}
        onChange={(e) => setConstitution(Number(e.target.value))}
      />
    </div>
  );
}
```

### 2. Action Script with Announcements

Execute action scripts and display announcements to the player:

```tsx
import { useState } from 'react';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';

interface ActionButtonProps {
  actionName: string;
  script: string;
  onExecute?: (messages: string[]) => void;
}

function ActionButton({ actionName, script, onExecute }: ActionButtonProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const executeAction = async () => {
    setIsExecuting(true);
    
    try {
      const lexer = new Lexer(script);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      
      // Execute the script
      evaluator.eval(ast);
      
      // Get announcements to show to player
      const messages = evaluator.getAnnounceMessages();
      
      // Display messages or pass to parent
      if (onExecute) {
        onExecute(messages);
      }
    } catch (err: any) {
      console.error('Action execution failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <button 
      onClick={executeAction}
      disabled={isExecuting}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      {isExecuting ? 'Executing...' : actionName}
    </button>
  );
}

// Usage with message display:
function ActionPanel() {
  const [messages, setMessages] = useState<string[]>([]);

  const attackScript = `
    attack_roll = roll("1d20")
    damage = roll("1d8+3")
    
    if attack_roll >= 15:
        announce("Critical hit!")
        announce("Dealt {{damage * 2}} damage!")
    else:
        announce("Hit for {{damage}} damage")
    
    return damage
  `;

  return (
    <div>
      <ActionButton 
        actionName="Attack"
        script={attackScript}
        onExecute={(msgs) => setMessages(msgs)}
      />
      
      <div className="mt-4">
        {messages.map((msg, i) => (
          <div key={i} className="p-2 bg-gray-100 rounded mb-2">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Reusable Script Executor Hook

Create a custom hook for easy script execution:

```tsx
import { useState, useCallback } from 'react';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';

interface ScriptResult {
  value: any;
  announcements: string[];
  logs: any[][];
  error: string | null;
  duration: number;
}

export function useScriptExecutor() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ScriptResult | null>(null);

  const execute = useCallback((
    source: string, 
    context?: Record<string, any>
  ): ScriptResult => {
    setIsExecuting(true);
    const startTime = performance.now();
    
    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      
      // Inject context variables
      if (context) {
        Object.entries(context).forEach(([key, val]) => {
          evaluator['globalEnv'].define(key, val);
        });
      }
      
      const value = evaluator.eval(ast);
      const duration = performance.now() - startTime;
      
      const result: ScriptResult = {
        value,
        announcements: evaluator.getAnnounceMessages(),
        logs: evaluator.getLogMessages(),
        error: null,
        duration,
      };
      
      setLastResult(result);
      return result;
    } catch (err: any) {
      const duration = performance.now() - startTime;
      const result: ScriptResult = {
        value: null,
        announcements: [],
        logs: [],
        error: err.message,
        duration,
      };
      
      setLastResult(result);
      return result;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return { execute, isExecuting, lastResult };
}

// Usage:
function ScriptPlayground() {
  const { execute, isExecuting, lastResult } = useScriptExecutor();
  const [source, setSource] = useState('roll("2d6+4")');

  const handleRun = () => {
    execute(source, {
      // Provide game context
      PlayerHP: 50,
      PlayerLevel: 5,
    });
  };

  return (
    <div className="p-4">
      <textarea 
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="w-full h-32 p-2 border rounded"
        disabled={isExecuting}
      />
      
      <button 
        onClick={handleRun}
        disabled={isExecuting}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isExecuting ? 'Running...' : 'Run Script'}
      </button>
      
      {lastResult && (
        <div className="mt-4">
          {lastResult.error ? (
            <div className="text-red-500">Error: {lastResult.error}</div>
          ) : (
            <>
              {lastResult.value !== null && (
                <div className="mb-2">
                  <strong>Result:</strong> {JSON.stringify(lastResult.value)}
                </div>
              )}
              
              {lastResult.announcements.length > 0 && (
                <div className="mb-2">
                  <strong>Announcements:</strong>
                  {lastResult.announcements.map((msg, i) => (
                    <div key={i} className="ml-4">{msg}</div>
                  ))}
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                Executed in {lastResult.duration.toFixed(2)}ms
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

### 4. Script Editor with Live Preview

A full-featured script editor component:

```tsx
import { useState, useEffect } from 'react';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';

interface ScriptEditorProps {
  initialScript?: string;
  context?: Record<string, any>;
  onSave?: (script: string) => void;
}

function ScriptEditor({ initialScript = '', context = {}, onSave }: ScriptEditorProps) {
  const [source, setSource] = useState(initialScript);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [autoRun, setAutoRun] = useState(true);

  useEffect(() => {
    if (!autoRun) return;

    const timer = setTimeout(() => {
      runScript();
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [source, context, autoRun]);

  const runScript = () => {
    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      
      // Inject context
      Object.entries(context).forEach(([key, val]) => {
        evaluator['globalEnv'].define(key, val);
      });
      
      const value = evaluator.eval(ast);
      
      setResult(value);
      setAnnouncements(evaluator.getAnnounceMessages());
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setResult(null);
      setAnnouncements([]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      {/* Editor Panel */}
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Script Editor</h3>
          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
              />
              Auto-run
            </label>
            {!autoRun && (
              <button 
                onClick={runScript}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Run
              </button>
            )}
            {onSave && (
              <button 
                onClick={() => onSave(source)}
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                Save
              </button>
            )}
          </div>
        </div>
        
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="flex-1 p-4 font-mono text-sm border rounded"
          placeholder="Enter QBScript code..."
          spellCheck={false}
        />
      </div>

      {/* Output Panel */}
      <div className="flex flex-col">
        <h3 className="font-bold mb-2">Output</h3>
        
        <div className="flex-1 p-4 bg-gray-50 rounded overflow-auto">
          {error ? (
            <div className="text-red-500 font-mono text-sm whitespace-pre-wrap">
              {error}
            </div>
          ) : (
            <>
              {announcements.length > 0 && (
                <div className="mb-4">
                  <div className="font-semibold mb-2">Announcements:</div>
                  {announcements.map((msg, i) => (
                    <div key={i} className="p-2 bg-blue-100 rounded mb-2">
                      📢 {msg}
                    </div>
                  ))}
                </div>
              )}
              
              {result !== null && result !== undefined && (
                <div>
                  <div className="font-semibold mb-2">Result:</div>
                  <div className="p-2 bg-green-100 rounded font-mono">
                    {JSON.stringify(result, null, 2)}
                  </div>
                </div>
              )}
              
              {!error && announcements.length === 0 && result === null && (
                <div className="text-gray-400 italic">
                  No output yet. Start typing to see results.
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Context Display */}
        {Object.keys(context).length > 0 && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <div className="font-semibold mb-2">Available Variables:</div>
            <div className="text-sm font-mono">
              {Object.entries(context).map(([key, val]) => (
                <div key={key}>
                  {key}: {JSON.stringify(val)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Usage in attribute editor:
function AttributeEditor() {
  const [attributeScript, setAttributeScript] = useState(`
subscribe("Constitution", "Level")

base = 10
con_bonus = Constitution * 2
level_bonus = Level * 5

return base + con_bonus + level_bonus
  `.trim());

  return (
    <ScriptEditor
      initialScript={attributeScript}
      context={{
        Constitution: 14,
        Level: 5,
      }}
      onSave={(script) => {
        // Save to database
        console.log('Saving script:', script);
      }}
    />
  );
}
```

### 5. Integration with Quest Bound Data Model

Connect the interpreter to actual game data:

```tsx
import { useCharacter } from '@/hooks/useCharacter';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';

function CharacterAttributeDisplay({ characterId, attributeName }: Props) {
  const character = useCharacter(characterId);
  const attribute = character.attributes.find(a => a.name === attributeName);
  const [computedValue, setComputedValue] = useState<any>(null);

  useEffect(() => {
    if (!attribute?.script) {
      setComputedValue(attribute?.value);
      return;
    }

    try {
      const lexer = new Lexer(attribute.script);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      
      // Build context from character data
      const context: Record<string, any> = {};
      character.attributes.forEach(attr => {
        context[attr.name] = attr.value;
      });
      
      // Inject context
      Object.entries(context).forEach(([key, val]) => {
        evaluator['globalEnv'].define(key, val);
      });
      
      const result = evaluator.eval(ast);
      setComputedValue(result);
    } catch (err) {
      console.error('Script evaluation failed:', err);
      setComputedValue(null);
    }
  }, [attribute?.script, character.attributes]);

  return (
    <div className="flex justify-between items-center">
      <span>{attributeName}</span>
      <span className="font-bold">{computedValue ?? '—'}</span>
    </div>
  );
}
```

## Best Practices

### 1. Error Handling

Always wrap script execution in try-catch:

```tsx
try {
  const result = executeScript(source);
  // Handle success
} catch (err) {
  if (err instanceof RuntimeError) {
    // Show user-friendly error with line/column
    showError(`Error at line ${err.line}: ${err.message}`);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', err);
  }
}
```

### 2. Performance

For frequently executed scripts (like reactive attributes), consider:

```tsx
// Cache parsed AST
const astCache = new Map<string, Program>();

function getCachedAST(source: string): Program {
  if (!astCache.has(source)) {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    astCache.set(source, ast);
  }
  return astCache.get(source)!;
}

// Use cached AST
const ast = getCachedAST(script);
const evaluator = new Evaluator();
const result = evaluator.eval(ast);
```

### 3. Context Isolation

Create clean contexts for each script execution:

```tsx
function createGameContext(character: Character): Record<string, any> {
  return {
    // Character attributes
    ...character.attributes.reduce((acc, attr) => {
      acc[attr.name] = attr.value;
      return acc;
    }, {} as Record<string, any>),
    
    // Character level
    Level: character.level,
    
    // Helper functions
    hasItem: (name: string) => character.inventory.some(i => i.name === name),
  };
}
```

### 4. Async Execution (Future: Phase 6)

When moving to Service Worker (Phase 6):

```tsx
// Future implementation
async function executeScriptAsync(source: string, context: any) {
  const worker = new Worker('./script-worker.js');
  
  return new Promise((resolve, reject) => {
    worker.postMessage({ source, context });
    
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
  });
}
```

## Summary

The interpreter integrates seamlessly into React components through:

1. **Direct execution** - Import and use the three-stage pipeline
2. **Custom hooks** - Encapsulate execution logic for reuse
3. **Context injection** - Pass game data into scripts
4. **Message handling** - Capture and display announcements/logs
5. **Error handling** - Graceful degradation with helpful messages

All examples work with the current Phase 3 implementation and are ready for Phase 4 (game APIs) and Phase 6 (Service Worker) enhancements.
