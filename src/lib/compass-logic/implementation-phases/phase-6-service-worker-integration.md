# Phase 6: Service Worker Integration

## Overview
Move the interpreter from the main thread to a Service Worker to ensure script execution never blocks UI rendering. Implement a signal-based communication protocol between the main thread and Service Worker.

## Goals
- Create Service Worker for script execution
- Implement bidirectional message passing (signals)
- Move interpreter, accessors, and reactive system to Service Worker
- Handle async database access from Service Worker
- Ensure non-blocking execution
- Maintain same API surface for main thread
- Support console.log() and announce() from Service Worker

## Architecture

### Overall Structure
```
Main Thread (UI)                    Service Worker (Execution)
│                                   │
├─ UI Components                    ├─ Interpreter
├─ React Hooks                      ├─ Accessors (Owner/Target/Ruleset)
├─ Database (Dexie)                 ├─ Reactive System
│                                   ├─ Dependency Graph
│                                   │
└─── Signal Channel ←──────────→   └─── Signal Handlers
     (MessagePort)
```

### Why Service Worker?
- Non-blocking execution (UI stays responsive)
- Isolated context (scripts can't access DOM)
- Persistent across page reloads
- Better performance for long-running scripts
- Security isolation

## Service Worker Setup

### Registration
```typescript
// In main.tsx or app initialization
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/qbscript-worker.js', {
    scope: '/',
  }).then(registration => {
    console.log('QBScript Service Worker registered');
  });
}
```

### Service Worker File
```typescript
// public/qbscript-worker.js
import { Interpreter } from './lib/compass-logic/interpreter';
import { ReactiveExecutor } from './lib/compass-logic/reactive-executor';

self.addEventListener('install', (event) => {
  console.log('QBScript Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('QBScript Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  handleSignal(event.data);
});
```

## Signal Protocol

### Signal Types
```typescript
// Main Thread → Service Worker
type MainToWorkerSignal =
  | { type: 'EXECUTE_SCRIPT'; payload: ExecuteScriptPayload }
  | { type: 'BUILD_DEPENDENCY_GRAPH'; payload: { rulesetId: string } }
  | { type: 'VALIDATE_SCRIPT'; payload: { scriptId: string } }
  | { type: 'ATTRIBUTE_CHANGED'; payload: { attributeId: string; characterId: string } }
  | { type: 'EXECUTE_ACTION'; payload: { actionId: string; characterId: string; targetId?: string } }
  | { type: 'EXECUTE_ITEM_EVENT'; payload: { itemId: string; characterId: string; eventType: string } };

// Service Worker → Main Thread
type WorkerToMainSignal =
  | { type: 'SCRIPT_RESULT'; payload: ScriptResultPayload }
  | { type: 'SCRIPT_ERROR'; payload: ScriptErrorPayload }
  | { type: 'CONSOLE_LOG'; payload: { args: any[] } }
  | { type: 'ANNOUNCE'; payload: { message: string } }
  | { type: 'DATABASE_READ'; payload: DatabaseReadRequest }
  | { type: 'DATABASE_WRITE'; payload: DatabaseWriteRequest }
  | { type: 'DEPENDENCY_GRAPH_BUILT'; payload: { rulesetId: string; graph: any } };
```

### Signal Payloads
```typescript
interface ExecuteScriptPayload {
  scriptId: string;
  characterId: string;
  targetId?: string;
  triggerType: 'load' | 'attribute_change' | 'action_click' | 'item_event';
  requestId: string; // For matching request/response
}

interface ScriptResultPayload {
  requestId: string;
  result: any;
  executionTime: number;
}

interface ScriptErrorPayload {
  requestId: string;
  error: {
    message: string;
    line?: number;
    column?: number;
    stackTrace?: string;
  };
}
```

## Message Channel Setup

### Main Thread Side
```typescript
class QBScriptClient {
  private worker: ServiceWorker;
  private messageChannel: MessageChannel;
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>;
  
  constructor() {
    this.messageChannel = new MessageChannel();
    this.pendingRequests = new Map();
    
    // Listen for responses
    this.messageChannel.port1.onmessage = (event) => {
      this.handleWorkerSignal(event.data);
    };
    
    // Get Service Worker
    navigator.serviceWorker.ready.then(registration => {
      this.worker = registration.active;
      this.worker.postMessage(
        { type: 'INIT', port: this.messageChannel.port2 },
        [this.messageChannel.port2]
      );
    });
  }
  
  async executeScript(payload: ExecuteScriptPayload): Promise<any> {
    const requestId = generateRequestId();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.worker.postMessage({
        type: 'EXECUTE_SCRIPT',
        payload: { ...payload, requestId },
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Script execution timeout'));
        }
      }, 10000);
    });
  }
  
  private handleWorkerSignal(signal: WorkerToMainSignal): void {
    switch (signal.type) {
      case 'SCRIPT_RESULT': {
        const { requestId, result } = signal.payload;
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          pending.resolve(result);
          this.pendingRequests.delete(requestId);
        }
        break;
      }
      
      case 'SCRIPT_ERROR': {
        const { requestId, error } = signal.payload;
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          pending.reject(error);
          this.pendingRequests.delete(requestId);
        }
        break;
      }
      
      case 'CONSOLE_LOG': {
        // Forward to UI console component
        consoleLogger.log(...signal.payload.args);
        break;
      }
      
      case 'ANNOUNCE': {
        // Show announcement notification
        showNotification({
          type: 'info',
          message: signal.payload.message,
        });
        break;
      }
      
      case 'DATABASE_READ': {
        // Handle database read request from worker
        this.handleDatabaseRead(signal.payload);
        break;
      }
      
      case 'DATABASE_WRITE': {
        // Handle database write request from worker
        this.handleDatabaseWrite(signal.payload);
        break;
      }
    }
  }
}
```

### Service Worker Side
```typescript
// In Service Worker
let mainPort: MessagePort;

self.addEventListener('message', (event) => {
  if (event.data.type === 'INIT') {
    mainPort = event.data.port;
    mainPort.onmessage = (e) => handleMainSignal(e.data);
    return;
  }
});

function handleMainSignal(signal: MainToWorkerSignal): void {
  switch (signal.type) {
    case 'EXECUTE_SCRIPT':
      executeScript(signal.payload);
      break;
    
    case 'ATTRIBUTE_CHANGED':
      handleAttributeChange(signal.payload);
      break;
    
    // ... other handlers
  }
}

async function executeScript(payload: ExecuteScriptPayload): Promise<void> {
  try {
    const result = await scriptExecutor.execute(payload);
    
    mainPort.postMessage({
      type: 'SCRIPT_RESULT',
      payload: {
        requestId: payload.requestId,
        result,
        executionTime: performance.now() - startTime,
      },
    });
  } catch (error) {
    mainPort.postMessage({
      type: 'SCRIPT_ERROR',
      payload: {
        requestId: payload.requestId,
        error: {
          message: error.message,
          line: error.line,
          column: error.column,
        },
      },
    });
  }
}
```

## Database Access from Service Worker

### Problem
- Dexie (IndexedDB) works in Service Worker
- But we want centralized database access in main thread
- Avoid database schema duplication

### Solution: Database Proxy
```typescript
// In Service Worker
class DatabaseProxy {
  private mainPort: MessagePort;
  
  async read(table: string, query: any): Promise<any> {
    const requestId = generateRequestId();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.mainPort.postMessage({
        type: 'DATABASE_READ',
        payload: { requestId, table, query },
      });
    });
  }
  
  async write(table: string, operation: string, data: any): Promise<void> {
    const requestId = generateRequestId();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      this.mainPort.postMessage({
        type: 'DATABASE_WRITE',
        payload: { requestId, table, operation, data },
      });
    });
  }
}

// In Main Thread
class DatabaseBridge {
  async handleDatabaseRead(payload: DatabaseReadRequest): Promise<void> {
    const { requestId, table, query } = payload;
    
    try {
      const result = await db[table].where(query).toArray();
      
      this.messageChannel.port1.postMessage({
        type: 'DATABASE_READ_RESULT',
        payload: { requestId, result },
      });
    } catch (error) {
      this.messageChannel.port1.postMessage({
        type: 'DATABASE_READ_ERROR',
        payload: { requestId, error: error.message },
      });
    }
  }
}
```

### Alternative: IndexedDB in Both
```typescript
// Simpler approach: Use Dexie in both main thread and Service Worker
// Share same database schema
// Service Worker accesses database directly
// No proxy needed

// In Service Worker
import Dexie from 'dexie';
import { db } from './stores/db';

// Use db directly in Service Worker
const attributes = await db.characterAttributes.where({ characterId }).toArray();
```

## Built-in Function Implementation

### console.log()
```typescript
// In Service Worker
function builtinConsoleLog(...args: any[]): void {
  mainPort.postMessage({
    type: 'CONSOLE_LOG',
    payload: { args },
  });
}
```

### announce()
```typescript
// In Service Worker
function builtinAnnounce(message: string): void {
  mainPort.postMessage({
    type: 'ANNOUNCE',
    payload: { message },
  });
}
```

## React Hooks Integration

### useExecuteScript Hook
```typescript
function useExecuteScript() {
  const client = useQBScriptClient();
  
  const executeScript = useCallback(async (
    scriptId: string,
    characterId: string,
    targetId?: string
  ) => {
    try {
      const result = await client.executeScript({
        scriptId,
        characterId,
        targetId,
        triggerType: 'action_click',
      });
      
      return result;
    } catch (error) {
      console.error('Script execution failed:', error);
      throw error;
    }
  }, [client]);
  
  return executeScript;
}
```

### Reactive Attribute Updates
```typescript
function useCharacterAttribute(characterId: string, attributeId: string) {
  const client = useQBScriptClient();
  const [attribute, setAttribute] = useState(null);
  
  const updateValue = useCallback(async (newValue: any) => {
    // Update database
    await db.characterAttributes.update(attributeId, { value: newValue });
    
    // Trigger reactive scripts
    await client.notifyAttributeChange({
      attributeId,
      characterId,
    });
  }, [attributeId, characterId, client]);
  
  return { attribute, updateValue };
}
```

## Error Handling

### Worker Errors
```typescript
// Catch unhandled errors in Service Worker
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
  
  mainPort.postMessage({
    type: 'WORKER_ERROR',
    payload: {
      message: event.error.message,
      stackTrace: event.error.stack,
    },
  });
});
```

### Communication Failures
```typescript
class QBScriptClient {
  private async executeWithRetry(
    payload: ExecuteScriptPayload,
    maxRetries = 3
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.executeScript(payload);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await sleep(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
}
```

## Performance Monitoring

### Execution Time Tracking
```typescript
// In Service Worker
async function executeScript(payload: ExecuteScriptPayload): Promise<void> {
  const startTime = performance.now();
  
  try {
    const result = await scriptExecutor.execute(payload);
    const executionTime = performance.now() - startTime;
    
    // Log slow scripts
    if (executionTime > 100) {
      console.warn(`Slow script: ${payload.scriptId} took ${executionTime}ms`);
    }
    
    mainPort.postMessage({
      type: 'SCRIPT_RESULT',
      payload: { requestId: payload.requestId, result, executionTime },
    });
  } catch (error) {
    // ...
  }
}
```

## Testing

### Unit Tests
- [ ] Signal serialization/deserialization
- [ ] Message channel setup
- [ ] Request/response matching
- [ ] Timeout handling
- [ ] Database proxy operations

### Integration Tests
- [ ] Execute script from main thread via Service Worker
- [ ] console.log() messages reach UI
- [ ] announce() shows notifications
- [ ] Database reads from Service Worker
- [ ] Database writes from Service Worker
- [ ] Reactive updates trigger correctly

### Performance Tests
- [ ] Execution time overhead (Service Worker vs main thread)
- [ ] Message passing latency
- [ ] Concurrent script executions
- [ ] Large data transfers

## Migration Strategy

### Phase 6a: Dual Mode
- Keep main thread execution working
- Add Service Worker as optional
- Feature flag to toggle

### Phase 6b: Service Worker Primary
- Make Service Worker default
- Fallback to main thread if unavailable

### Phase 6c: Service Worker Only
- Remove main thread execution
- Service Worker required

## Dependencies
- Phase 3 (Interpreter Core)
- Phase 4 (Game Entity Integration)
- Phase 5 (Reactive System)
- Service Worker API
- MessageChannel API

## Deliverables
- [ ] Service Worker file
- [ ] QBScriptClient (main thread)
- [ ] Signal protocol implementation
- [ ] Database proxy or direct access
- [ ] React hooks for script execution
- [ ] Built-in function forwarding
- [ ] Error handling
- [ ] Performance monitoring
- [ ] Integration tests
- [ ] Migration guide

## Notes
- Service Workers persist across page reloads
- Need to handle Service Worker updates
- Consider using Workbox for Service Worker tooling
- IndexedDB access from Service Worker is straightforward
- Message passing is fast but not instant (~1-5ms overhead)
- Non-blocking is critical for UX
