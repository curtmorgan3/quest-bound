# Phase 1: Data Model & Database

## Overview
Create the database schema and entities needed to store scripts and their metadata. This phase establishes the data foundation for the entire QBScript system.

## Goals
- Define Script entity with all required fields
- Add script associations to Attribute, Action, Item entities
- Create ScriptError entity for error logging
- Implement CRUD operations for scripts
- Support global scripts
- Enable script-entity relationships

## Database Schema Changes

### New Entity: Script
```typescript
type Script = BaseDetails & {
  rulesetId: string;           // Which ruleset this script belongs to
  name: string;                // Script name (e.g., "hit_points", "cast_fireball")
  sourceCode: string;          // Full QBScript source code
  entityType: 'attribute' | 'action' | 'item' | 'global';
  entityId: string | null;     // ID of associated entity (null for global scripts)
  isGlobal: boolean;           // Whether this is a global utility script
  enabled: boolean;            // Allow disabling scripts without deleting
};
```

### New Entity: ScriptError
```typescript
type ScriptError = BaseDetails & {
  rulesetId: string;
  scriptId: string;            // Which script caused the error
  characterId: string | null;  // Which character was executing (null for non-character scripts)
  errorMessage: string;        // Human-readable error message
  lineNumber: number | null;   // Where the error occurred
  stackTrace: string | null;   // Detailed stack trace
  context: string;             // What triggered the script (e.g., "on_load", "attribute_change")
  timestamp: number;           // When the error occurred
};
```

### Entity Updates
Add optional `scriptId` field to existing entities:
```typescript
// Attribute entity
type Attribute = BaseDetails & {
  // ... existing fields
  scriptId?: string | null;
};

// Action entity  
type Action = BaseDetails & {
  // ... existing fields
  scriptId?: string | null;
};

// Item entity
type Item = BaseDetails & {
  // ... existing fields
  scriptId?: string | null;
  // Also add custom properties support
  customProperties?: Record<string, string | number | boolean>;
};
```

### CharacterAttribute Updates
Add script override capability:
```typescript
type CharacterAttribute = Attribute & {
  // ... existing fields
  scriptDisabled: boolean;     // Player has overridden the computed value
};
```

## Database Schema Definition

Add to `src/stores/db/db.ts`:

```typescript
db.version(12).stores({
  // ... existing stores
  scripts: `${common}, rulesetId, name, entityType, entityId, isGlobal, enabled`,
  scriptErrors: `${common}, rulesetId, scriptId, characterId, timestamp`,
});
```

## CRUD Operations

### Create Operations
- `createScript(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>)`
- `createScriptError(error: Omit<ScriptError, 'id' | 'createdAt' | 'updatedAt'>)`

### Read Operations
- `getScript(id: string): Promise<Script | null>`
- `getScriptsByRuleset(rulesetId: string): Promise<Script[]>`
- `getGlobalScripts(rulesetId: string): Promise<Script[]>`
- `getScriptByEntity(entityType: string, entityId: string): Promise<Script | null>`
- `getScriptErrors(rulesetId: string, limit?: number): Promise<ScriptError[]>`

### Update Operations
- `updateScript(id: string, updates: Partial<Script>)`
- `updateScriptSourceCode(id: string, sourceCode: string)`
- `enableScript(id: string)`
- `disableScript(id: string)`

### Delete Operations
- `deleteScript(id: string)`
- `deleteScriptsByRuleset(rulesetId: string)`
- `clearScriptErrors(rulesetId: string)`

## Hooks and Middleware

### Script Hooks
- `useScript(id: string)` - React hook for single script
- `useScripts(rulesetId: string)` - React hook for all scripts in ruleset
- `useGlobalScripts(rulesetId: string)` - React hook for global scripts
- `useScriptErrors(rulesetId: string)` - React hook for error log

### Cascade Deletion
When deleting an entity (Attribute, Action, Item):
- Automatically delete associated script
- OR set script.entityId to null and warn user

## Validation

### Script Validation
- Name must be unique within ruleset
- EntityType must match entityId's actual type
- Global scripts must have entityType='global' and entityId=null
- Non-global scripts must have valid entityId

### Error Handling
- Graceful handling of missing scripts
- Validation before save
- Migration path for existing rulesets

## Testing

### Unit Tests
- [ ] Script CRUD operations
- [ ] Script-entity associations
- [ ] Global script filtering
- [ ] ScriptError logging
- [ ] Cascade deletion
- [ ] Validation rules

### Integration Tests
- [ ] Create ruleset with scripts
- [ ] Export/import scripts (prepare for Phase 2)
- [ ] Script enable/disable
- [ ] Error log queries

## Dependencies
- Dexie database already in use
- Existing entity types (Attribute, Action, Item)
- BaseDetails type pattern

## Deliverables
- [ ] Database schema migration (version 12)
- [ ] Script entity type definition
- [ ] ScriptError entity type definition
- [ ] CRUD functions in database layer
- [ ] React hooks for script access
- [ ] Unit tests for all operations
- [ ] Migration guide for existing rulesets

## Notes
- This phase is purely data layer - no execution logic
- Scripts are stored as plain text (source code)
- No validation of QBScript syntax yet (comes in Phase 3)
- Keep backward compatibility with existing rulesets
