# Phase 7: UI Components

## Overview
Build the user interface for creating, editing, and debugging scripts. Provide game designers with all the tools they need to write and test QBScript code.

## Goals
- Script editor with syntax highlighting
- Script association UI (link scripts to entities)
- Console panel for debug output
- Error display and notifications
- Target selector for actions
- Script override toggle for players
- Script library/browser
- Script validation feedback

## Components

### 1. Script Editor

#### Code Editor Component
```typescript
interface ScriptEditorProps {
  scriptId?: string;  // Existing script or null for new
  entityType: 'attribute' | 'action' | 'item' | 'global';
  entityId?: string;  // Associated entity
  onSave: (script: Script) => void;
  onCancel: () => void;
}

function ScriptEditor({ scriptId, entityType, entityId, onSave, onCancel }: ScriptEditorProps) {
  const [sourceCode, setSourceCode] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  
  // Auto-save draft to localStorage
  useAutosave(sourceCode, `script-draft-${scriptId || 'new'}`);
  
  // Validate on change (debounced)
  const validate = useDebouncedCallback(async (code: string) => {
    const result = await validateScript(code);
    setErrors(result.errors);
    setWarnings(result.warnings);
  }, 500);
  
  return (
    <div className="script-editor">
      <ScriptEditorHeader
        name={name}
        onNameChange={setName}
        entityType={entityType}
      />
      
      <CodeMirrorEditor
        value={sourceCode}
        onChange={(value) => {
          setSourceCode(value);
          validate(value);
        }}
        language="qbscript"
        theme="vs-dark"
        height="600px"
      />
      
      <ValidationPanel errors={errors} warnings={warnings} />
      
      <ScriptEditorFooter
        onSave={() => onSave({ name, sourceCode, entityType, entityId })}
        onCancel={onCancel}
        hasErrors={errors.length > 0}
      />
    </div>
  );
}
```

#### Syntax Highlighting
```typescript
// CodeMirror language definition for QBScript
import { StreamLanguage } from '@codemirror/language';

const qbscriptLanguage = StreamLanguage.define({
  token(stream, state) {
    // Keywords
    if (stream.match(/\b(if|else|for|in|return|subscribe)\b/)) {
      return 'keyword';
    }
    
    // Built-in functions
    if (stream.match(/\b(roll|floor|ceil|round|announce|console\.log)\b/)) {
      return 'builtin';
    }
    
    // Accessors
    if (stream.match(/\b(Owner|Target|Ruleset)\b/)) {
      return 'variable-2';
    }
    
    // Numbers
    if (stream.match(/\d+(\.\d+)?/)) {
      return 'number';
    }
    
    // Strings
    if (stream.match(/'([^'\\]|\\.)*'/)) {
      return 'string';
    }
    
    // Comments
    if (stream.match(/\/\/.*/)) {
      return 'comment';
    }
    
    // Operators
    if (stream.match(/[+\-*\/%<>=!&|]/)) {
      return 'operator';
    }
    
    stream.next();
    return null;
  },
});
```

#### Auto-complete
```typescript
// Auto-complete suggestions
const autocompleteExtension = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\w*/);
      if (!word || word.from === word.to) return null;
      
      return {
        from: word.from,
        options: [
          { label: 'Owner.Attribute', type: 'function' },
          { label: 'Owner.Item', type: 'function' },
          { label: 'Target.Attribute', type: 'function' },
          { label: 'Ruleset.Chart', type: 'function' },
          { label: 'subscribe', type: 'keyword' },
          { label: 'roll', type: 'function' },
          { label: 'announce', type: 'function' },
          { label: 'console.log', type: 'function' },
          // ... more suggestions
        ],
      };
    },
  ],
});
```

### 2. Script Association UI

#### Entity Script Panel
```typescript
// In Attribute/Action/Item edit screen
function EntityScriptPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { script } = useScript(entityId);
  const [showEditor, setShowEditor] = useState(false);
  
  if (showEditor) {
    return (
      <ScriptEditor
        scriptId={script?.id}
        entityType={entityType}
        entityId={entityId}
        onSave={handleSave}
        onCancel={() => setShowEditor(false)}
      />
    );
  }
  
  return (
    <div className="entity-script-panel">
      <h3>Script</h3>
      
      {script ? (
        <div>
          <ScriptPreview script={script} />
          <Button onClick={() => setShowEditor(true)}>Edit Script</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete Script</Button>
        </div>
      ) : (
        <Button onClick={() => setShowEditor(true)}>Add Script</Button>
      )}
    </div>
  );
}
```

### 3. Console Panel

#### Debug Console Component
```typescript
interface ConsoleLog {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  args: any[];
  scriptId: string;
  characterId: string;
}

function ConsolePanel() {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [filter, setFilter] = useState<{
    scriptId?: string;
    characterId?: string;
    level?: string;
  }>({});
  
  // Subscribe to console logs from Service Worker
  useEffect(() => {
    const handler = (signal: WorkerToMainSignal) => {
      if (signal.type === 'CONSOLE_LOG') {
        setLogs(prev => [...prev, {
          id: generateId(),
          timestamp: Date.now(),
          level: 'log',
          args: signal.payload.args,
          scriptId: signal.payload.scriptId,
          characterId: signal.payload.characterId,
        }]);
      }
    };
    
    qbscriptClient.onSignal(handler);
    return () => qbscriptClient.offSignal(handler);
  }, []);
  
  const filteredLogs = logs.filter(log => {
    if (filter.scriptId && log.scriptId !== filter.scriptId) return false;
    if (filter.characterId && log.characterId !== filter.characterId) return false;
    if (filter.level && log.level !== filter.level) return false;
    return true;
  });
  
  return (
    <div className="console-panel">
      <ConsoleToolbar
        filter={filter}
        onFilterChange={setFilter}
        onClear={() => setLogs([])}
      />
      
      <div className="console-logs">
        {filteredLogs.map(log => (
          <ConsoleLogItem key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

function ConsoleLogItem({ log }: { log: ConsoleLog }) {
  return (
    <div className={`console-log-item level-${log.level}`}>
      <span className="timestamp">{formatTime(log.timestamp)}</span>
      <span className="level">{log.level}</span>
      <span className="message">
        {log.args.map((arg, i) => (
          <span key={i}>{formatValue(arg)} </span>
        ))}
      </span>
    </div>
  );
}
```

### 4. Error Display

#### Error Notification
```typescript
function ScriptErrorNotification({ error }: { error: ScriptError }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Script Error</AlertTitle>
      <AlertDescription>
        <p>{error.errorMessage}</p>
        {error.lineNumber && (
          <p className="text-sm mt-2">
            Line {error.lineNumber}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToScript(error.scriptId)}
        >
          View Script
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

#### Error Log Viewer
```typescript
function ScriptErrorLog() {
  const { errors } = useScriptErrors();
  
  return (
    <div className="error-log">
      <h2>Script Errors</h2>
      
      {errors.map(error => (
        <div key={error.id} className="error-item">
          <div className="error-header">
            <span className="error-time">{formatTimestamp(error.timestamp)}</span>
            <span className="error-character">{error.characterId}</span>
          </div>
          
          <div className="error-message">{error.errorMessage}</div>
          
          {error.stackTrace && (
            <details>
              <summary>Stack Trace</summary>
              <pre>{error.stackTrace}</pre>
            </details>
          )}
          
          <Button onClick={() => dismissError(error.id)}>Dismiss</Button>
        </div>
      ))}
    </div>
  );
}
```

### 5. Target Selector

#### Character Selector for Actions
```typescript
function ActionButton({ actionId }: { actionId: string }) {
  const { action, script } = useAction(actionId);
  const [showTargetSelector, setShowTargetSelector] = useState(false);
  const executeAction = useExecuteAction();
  
  // Check if action requires target
  const requiresTarget = script?.sourceCode.includes('on_activate(Target)');
  
  const handleClick = () => {
    if (requiresTarget) {
      setShowTargetSelector(true);
    } else {
      executeAction(actionId);
    }
  };
  
  return (
    <>
      <Button onClick={handleClick}>
        {action.title}
      </Button>
      
      {showTargetSelector && (
        <TargetSelectorDialog
          onSelect={(targetId) => {
            executeAction(actionId, targetId);
            setShowTargetSelector(false);
          }}
          onCancel={() => setShowTargetSelector(false)}
        />
      )}
    </>
  );
}

function TargetSelectorDialog({ onSelect, onCancel }: TargetSelectorDialogProps) {
  const { characters } = useCharacters();
  
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Target</DialogTitle>
        </DialogHeader>
        
        <div className="character-list">
          {characters.map(character => (
            <CharacterCard
              key={character.id}
              character={character}
              onClick={() => onSelect(character.id)}
            />
          ))}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Script Override Toggle

#### Player Script Control
```typescript
function CharacterAttributePanel({ characterId, attributeId }: CharacterAttributePanelProps) {
  const { attribute } = useCharacterAttribute(characterId, attributeId);
  const { script } = useAttributeScript(attributeId);
  
  const [scriptDisabled, setScriptDisabled] = useState(attribute.scriptDisabled);
  
  const toggleScript = async () => {
    await updateCharacterAttribute(characterId, attributeId, {
      scriptDisabled: !scriptDisabled,
    });
    setScriptDisabled(!scriptDisabled);
  };
  
  return (
    <div className="attribute-panel">
      <div className="attribute-header">
        <h3>{attribute.title}</h3>
        
        {script && (
          <div className="script-control">
            <Switch
              checked={!scriptDisabled}
              onCheckedChange={() => toggleScript()}
            />
            <Label>Auto-calculate</Label>
          </div>
        )}
      </div>
      
      <Input
        type="number"
        value={attribute.value}
        onChange={(e) => updateValue(e.target.value)}
        disabled={!scriptDisabled && !!script}
      />
      
      {script && !scriptDisabled && (
        <p className="text-sm text-muted-foreground">
          This value is automatically calculated by a script
        </p>
      )}
    </div>
  );
}
```

### 7. Script Library

#### Script Browser
```typescript
function ScriptLibrary() {
  const { scripts } = useScripts();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const filteredScripts = selectedType
    ? scripts.filter(s => s.entityType === selectedType)
    : scripts;
  
  return (
    <div className="script-library">
      <ScriptLibraryHeader>
        <h2>Scripts</h2>
        <Button onClick={() => navigateToNewScript()}>New Script</Button>
      </ScriptLibraryHeader>
      
      <ScriptFilter
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />
      
      <ScriptList>
        {filteredScripts.map(script => (
          <ScriptListItem
            key={script.id}
            script={script}
            onClick={() => navigateToScript(script.id)}
          />
        ))}
      </ScriptList>
    </div>
  );
}

function ScriptListItem({ script, onClick }: ScriptListItemProps) {
  const { entity } = useEntity(script.entityType, script.entityId);
  
  return (
    <div className="script-list-item" onClick={onClick}>
      <div className="script-info">
        <h4>{script.name}</h4>
        <Badge>{script.entityType}</Badge>
        {entity && <span className="entity-name">{entity.title}</span>}
      </div>
      
      <div className="script-meta">
        <span className="updated">{formatRelativeTime(script.updatedAt)}</span>
        {!script.enabled && <Badge variant="destructive">Disabled</Badge>}
      </div>
    </div>
  );
}
```

### 8. Validation Feedback

#### Real-time Validation
```typescript
async function validateScript(sourceCode: string): Promise<ValidationResult> {
  try {
    // Tokenize and parse
    const tokens = new Lexer(sourceCode).tokenize();
    const ast = new Parser(tokens).parse();
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for syntax errors
    // (Already thrown by parser if invalid)
    
    // Check for undefined variables
    const undefinedVars = findUndefinedVariables(ast);
    for (const varName of undefinedVars) {
      warnings.push({
        line: varName.line,
        column: varName.column,
        message: `Variable '${varName.name}' used before definition`,
      });
    }
    
    // Check for circular dependencies (if attribute script)
    const subscriptions = extractSubscriptions(sourceCode);
    const circularDeps = await checkCircularDependencies(subscriptions);
    if (circularDeps.hasCycle) {
      errors.push({
        line: 1,
        column: 1,
        message: `Circular dependency detected: ${circularDeps.cycle.join(' → ')}`,
      });
    }
    
    return { errors, warnings, valid: errors.length === 0 };
  } catch (error) {
    return {
      errors: [{
        line: error.line || 1,
        column: error.column || 1,
        message: error.message,
      }],
      warnings: [],
      valid: false,
    };
  }
}
```

## Integration Points

### Ruleset Settings
- Add "Scripts" tab
- Show script library
- Link to create new scripts

### Entity Editors
- Add script panel to Attribute edit screen
- Add script panel to Action edit screen
- Add script panel to Item edit screen

### Character Sheet
- Show computed attribute indicators
- Script override toggles
- Error indicators

### Dev Tools Panel
- Console logs
- Error log
- Performance metrics
- Execution history

## Keyboard Shortcuts

```typescript
const editorKeymap = keymap.of([
  { key: 'Ctrl-S', run: () => saveScript() },
  { key: 'Ctrl-/', run: toggleComment },
  { key: 'F5', run: () => executeScript() },
  { key: 'Ctrl-Space', run: startCompletion },
]);
```

## Testing

### Unit Tests
- [ ] CodeMirror editor initialization
- [ ] Syntax highlighting
- [ ] Auto-complete suggestions
- [ ] Validation logic
- [ ] Console log filtering
- [ ] Target selector

### Integration Tests
- [ ] Create new script via UI
- [ ] Edit existing script
- [ ] Delete script
- [ ] Associate script with entity
- [ ] View console logs
- [ ] View error logs
- [ ] Toggle script override
- [ ] Execute action with target selection

### E2E Tests
- [ ] Complete script authoring workflow
- [ ] Test character workflow
- [ ] Error recovery workflow
- [ ] Debug workflow with console

## Accessibility
- Keyboard navigation for all components
- Screen reader support
- Focus management
- ARIA labels

## Dependencies
- CodeMirror 6 (code editor)
- Phase 6 (Service Worker) for console.log() forwarding
- Existing UI component library (shadcn/ui)

## Deliverables
- [ ] Script editor with syntax highlighting
- [ ] Script association panels
- [ ] Console component
- [ ] Error display components
- [ ] Target selector dialog
- [ ] Script override toggle
- [ ] Script library browser
- [ ] Validation feedback
- [ ] Integration with existing UI
- [ ] Comprehensive tests
- [ ] User documentation

## Notes
- Use CodeMirror 6 for best editing experience
- Syntax highlighting enhances readability
- Real-time validation prevents errors
- Console is critical for debugging
- Target selector makes actions intuitive
- Script library helps navigate large rulesets
