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

## Quick Reference

**What:** Add database tables and React hooks for storing and managing scripts.

**Where:**
- Types: `src/types/data-model-types.ts` (add 2 new types, modify 4 existing)
- Database: `src/stores/db/db.ts` (upgrade to v12, add 2 tables)
- Hooks (DB): `src/stores/db/hooks/script-hooks.ts` (new file)
- Hooks (React): `src/lib/compass-api/hooks/scripts/` (new directory with 2 hooks)

**Pattern:** Follow existing patterns from `use-attributes.ts` and `use-actions.ts`

**Key APIs:**
- `useScripts()` - Get all scripts, CRUD operations
- `useScriptErrors()` - Error logging and viewing
- Cascade deletion via database hooks

## File Structure

```
src/
├── types/
│   └── data-model-types.ts          # Add Script, ScriptError types + modify 4 existing
├── stores/
│   └── db/
│       ├── db.ts                     # Update schema to version 12
│       └── hooks/
│           ├── script-hooks.ts       # New: Cascade deletion logic
│           └── db-hooks.ts           # Update: Register script hooks
└── lib/
    └── compass-api/
        └── hooks/
            ├── scripts/              # New directory
            │   ├── use-scripts.ts         # Main script CRUD hook
            │   ├── use-script-errors.ts   # Error logging hook
            │   └── index.ts               # Exports
            └── index.ts              # Update: Export scripts hooks
```

## Database Schema Changes

### New Entity: Script

**Location:** `src/types/data-model-types.ts`

Add after the `Window` type definition:

```typescript
export type Script = BaseDetails & {
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

**Location:** `src/types/data-model-types.ts`

Add after the `Script` type definition:

```typescript
export type ScriptError = BaseDetails & {
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

**Location:** `src/types/data-model-types.ts`

Modify existing entity types:

#### Attribute
```typescript
export type Attribute = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  type: AttributeType;
  options?: string[];
  defaultValue: string | number | boolean;
  optionsChartRef?: number;
  optionsChartColumnHeader?: string;
  allowMultiSelect?: boolean;
  min?: number;
  max?: number;
  assetId?: string | null;
  image?: string | null;
  inventoryWidth?: number;
  inventoryHeight?: number;
  scriptId?: string | null;          // NEW: Associated script
};
```

#### Action
```typescript
export type Action = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  assetId?: string | null;
  image?: string | null;
  inventoryWidth?: number;
  inventoryHeight?: number;
  scriptId?: string | null;          // NEW: Associated script
};
```

#### Item
```typescript
export type Item = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  weight: number;
  defaultQuantity: number;
  stackSize: number;
  isContainer: boolean;
  isStorable: boolean;
  isEquippable: boolean;
  isConsumable: boolean;
  inventoryWidth: number;
  inventoryHeight: number;
  assetId?: string | null;
  image?: string | null;
  scriptId?: string | null;          // NEW: Associated script
  customProperties?: Record<string, string | number | boolean>; // NEW: Custom properties for scripts
};
```

#### CharacterAttribute
```typescript
export type CharacterAttribute = Attribute & {
  characterId: string;
  attributeId: string;
  value: string | number | boolean;
  scriptDisabled?: boolean;          // NEW: Player has overridden the computed value
};
```

## Database Schema Definition

**Location:** `src/stores/db/db.ts`

### Step 1: Import new types

Add to the imports at the top of the file:

```typescript
import type {
  Action,
  Asset,
  Attribute,
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  Component,
  DiceRoll,
  Document,
  Font,
  Inventory,
  InventoryItem,
  Item,
  Ruleset,
  User,
  Window,
  Script,           // NEW
  ScriptError,      // NEW
} from '@/types';
```

### Step 2: Add to database type definition

Update the `db` type declaration:

```typescript
const db = new Dexie('qbdb') as Dexie & {
  users: EntityTable<User, 'id'>;
  rulesets: EntityTable<Ruleset, 'id'>;
  attributes: EntityTable<Attribute, 'id'>;
  actions: EntityTable<Action, 'id'>;
  items: EntityTable<Item, 'id'>;
  charts: EntityTable<Chart, 'id'>;
  documents: EntityTable<Document, 'id'>;
  assets: EntityTable<Asset, 'id'>;
  fonts: EntityTable<Font, 'id'>;
  windows: EntityTable<Window, 'id'>;
  components: EntityTable<Component, 'id'>;
  characters: EntityTable<Character, 'id'>;
  characterAttributes: EntityTable<CharacterAttribute, 'id'>;
  characterPages: EntityTable<CharacterPage, 'id'>;
  characterWindows: EntityTable<CharacterWindow, 'id'>;
  inventories: EntityTable<Inventory, 'id'>;
  inventoryItems: EntityTable<InventoryItem, 'id'>;
  diceRolls: EntityTable<DiceRoll, 'id'>;
  scripts: EntityTable<Script, 'id'>;              // NEW
  scriptErrors: EntityTable<ScriptError, 'id'>;   // NEW
};
```

### Step 3: Update schema version

Change `db.version(11)` to `db.version(12)` and add new tables:

```typescript
db.version(12).stores({
  users: `${common}, username, assetId, image, preferences`,
  assets: `${common}, rulesetId, [directory+filename], data, type`,
  rulesets: `${common}, version, createdBy, title, description, details, assetId, image`,
  fonts: `${common}, rulesetId, label, data`,
  attributes: `${common}, rulesetId, title, description, category, type, options, defaultValue, optionsChartRef, optionsChartColumnHeader, min, max, scriptId`,
  actions: `${common}, rulesetId, title, description, category, scriptId`,
  items: `${common}, rulesetId, title, description, category, weight, defaultQuantity, stackSize, isContainer, isStorable, isEquippable, isConsumable, inventoryWidth, inventoryHeight, scriptId`,
  charts: `${common}, rulesetId, title, description, category, data, assetId, image`,
  documents: `${common}, rulesetId, title, description, category, assetId, image, pdfAssetId, pdfData`,
  windows: `${common}, rulesetId, title, category`,
  components: `${common}, rulesetId, windowId, type, x, y, z, height, width, rotation, selected, assetId, assetUrl, groupId, attributeId, actionId, data, style`,
  characters: `${common}, rulesetId, userId, assetId, image`,
  inventories: `${common}, rulesetId, characterId, title, category, type`,
  inventoryItems: `${common}, characterId, inventoryId, entityId, quantity`,
  characterPages: `${common}, characterId, label`,
  characterWindows: `${common}, characterId, characterPageId, windowId, title, x, y, isCollapsed`,
  characterAttributes: `${common}, characterId, attributeId, [characterId+attributeId], scriptDisabled`,
  diceRolls: `${common}, rulesetId, userId, value, label`,
  scripts: `${common}, rulesetId, name, entityType, entityId, isGlobal, enabled`,           // NEW
  scriptErrors: `${common}, rulesetId, scriptId, characterId, timestamp`,                   // NEW
});
```

**Note:** Added `scriptId` index to `attributes`, `actions`, and `items` for efficient lookups. Added `scriptDisabled` to `characterAttributes`.

## CRUD Operations

### Database Hooks (Low-level)

**Location:** `src/stores/db/hooks/script-hooks.ts` (new file)

Follow the pattern from `attribute-hooks.ts`:

```typescript
import type { Dexie } from 'dexie';

export const registerScriptHooks = (db: Dexie) => {
  // Hook for when scripts are deleted
  db.scripts.hook('deleting', async (primKey) => {
    const scriptId = primKey as string;
    
    // Clean up script associations when script is deleted
    await db.attributes.where({ scriptId }).modify({ scriptId: null });
    await db.actions.where({ scriptId }).modify({ scriptId: null });
    await db.items.where({ scriptId }).modify({ scriptId: null });
    
    // Delete associated errors
    await db.scriptErrors.where({ scriptId }).delete();
  });
  
  // Hook for when entities are deleted - clean up their scripts
  db.attributes.hook('deleting', async (primKey) => {
    const attributeId = primKey as string;
    const attribute = await db.attributes.get(attributeId);
    if (attribute?.scriptId) {
      await db.scripts.delete(attribute.scriptId);
    }
  });
  
  db.actions.hook('deleting', async (primKey) => {
    const actionId = primKey as string;
    const action = await db.actions.get(actionId);
    if (action?.scriptId) {
      await db.scripts.delete(action.scriptId);
    }
  });
  
  db.items.hook('deleting', async (primKey) => {
    const itemId = primKey as string;
    const item = await db.items.get(itemId);
    if (item?.scriptId) {
      await db.scripts.delete(item.scriptId);
    }
  });
  
  // Hook for when rulesets are deleted - clean up all scripts
  db.rulesets.hook('deleting', async (primKey) => {
    const rulesetId = primKey as string;
    await db.scripts.where({ rulesetId }).delete();
    await db.scriptErrors.where({ rulesetId }).delete();
  });
};
```

**Update:** `src/stores/db/hooks/db-hooks.ts`

Add to the imports and register function:

```typescript
import { registerScriptHooks } from './script-hooks';

export const registerDbHooks = (db: Dexie) => {
  // ... existing hooks
  registerScriptHooks(db);
};
```

## React Hooks (High-level API)

### Main Scripts Hook

**Location:** `src/lib/compass-api/hooks/scripts/use-scripts.ts` (new file)

Follow the pattern from `use-attributes.ts` and `use-actions.ts`:

```typescript
import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Script } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

export const useScripts = () => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const scripts = useLiveQuery(
    () =>
      db.scripts
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createScript = async (data: Partial<Script>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      const scriptId = crypto.randomUUID();
      await db.scripts.add({
        ...data,
        id: scriptId,
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Script);
      
      // If associated with an entity, update the entity's scriptId
      if (data.entityId && data.entityType && data.entityType !== 'global') {
        const table = data.entityType === 'attribute' ? db.attributes
          : data.entityType === 'action' ? db.actions
          : db.items;
        
        await table.update(data.entityId, { scriptId });
      }
      
      return scriptId;
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/createScript',
        severity: 'medium',
      });
    }
  };

  const updateScript = async (id: string, data: Partial<Script>) => {
    const now = new Date().toISOString();
    try {
      await db.scripts.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/updateScript',
        severity: 'medium',
      });
    }
  };

  const deleteScript = async (id: string) => {
    try {
      await db.scripts.delete(id);
      // Note: entity scriptId is set to null automatically via db hooks
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/deleteScript',
        severity: 'medium',
      });
    }
  };

  const getScriptByEntity = async (entityType: string, entityId: string) => {
    try {
      return await db.scripts
        .where({ entityType, entityId })
        .first();
    } catch (e) {
      handleError(e as Error, {
        component: 'useScripts/getScriptByEntity',
        severity: 'low',
      });
      return null;
    }
  };

  const globalScripts = scripts?.filter(s => s.isGlobal) ?? [];

  return { 
    scripts: scripts ?? [], 
    globalScripts,
    createScript, 
    updateScript, 
    deleteScript,
    getScriptByEntity,
  };
};
```

### Script Errors Hook

**Location:** `src/lib/compass-api/hooks/scripts/use-script-errors.ts` (new file)

```typescript
import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { ScriptError } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from '../rulesets/use-active-ruleset';

export const useScriptErrors = (limit = 100) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const errors = useLiveQuery(
    () =>
      db.scriptErrors
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .reverse()
        .limit(limit)
        .toArray(),
    [activeRuleset, limit],
  );

  const logScriptError = async (data: Omit<ScriptError, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.scriptErrors.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
        timestamp: Date.now(),
      } as ScriptError);
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptErrors/logScriptError',
        severity: 'low',
      });
    }
  };

  const clearErrors = async () => {
    if (!activeRuleset) return;
    try {
      await db.scriptErrors
        .where('rulesetId')
        .equals(activeRuleset.id)
        .delete();
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptErrors/clearErrors',
        severity: 'low',
      });
    }
  };

  const dismissError = async (id: string) => {
    try {
      await db.scriptErrors.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useScriptErrors/dismissError',
        severity: 'low',
      });
    }
  };

  return {
    errors: errors ?? [],
    logScriptError,
    clearErrors,
    dismissError,
  };
};
```

### Index File

**Location:** `src/lib/compass-api/hooks/scripts/index.ts` (new file)

```typescript
export * from './use-scripts';
export * from './use-script-errors';
```

**Update:** `src/lib/compass-api/hooks/index.ts`

Add to exports:

```typescript
export * from './scripts';
```

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

## Implementation Checklist

### Type Definitions
- [ ] Add `Script` type to `src/types/data-model-types.ts`
- [ ] Add `ScriptError` type to `src/types/data-model-types.ts`
- [ ] Add `scriptId?: string | null` to `Attribute` type
- [ ] Add `scriptId?: string | null` to `Action` type
- [ ] Add `scriptId?: string | null` to `Item` type
- [ ] Add `customProperties?: Record<string, string | number | boolean>` to `Item` type
- [ ] Add `scriptDisabled?: boolean` to `CharacterAttribute` type
- [ ] Export new types from `src/types/index.ts` (if needed)

### Database Schema
- [ ] Import `Script` and `ScriptError` types in `src/stores/db/db.ts`
- [ ] Add `scripts: EntityTable<Script, 'id'>` to db type definition
- [ ] Add `scriptErrors: EntityTable<ScriptError, 'id'>` to db type definition
- [ ] Update `db.version(11)` to `db.version(12)`
- [ ] Add `scripts` table to schema with indexes
- [ ] Add `scriptErrors` table to schema with indexes
- [ ] Add `scriptId` index to `attributes` table
- [ ] Add `scriptId` index to `actions` table
- [ ] Add `scriptId` index to `items` table
- [ ] Add `scriptDisabled` to `characterAttributes` table

### Database Hooks
- [ ] Create `src/stores/db/hooks/script-hooks.ts`
- [ ] Implement `registerScriptHooks()` function
- [ ] Add cascade delete for scripts when entities deleted
- [ ] Add cascade delete for entities' scriptId when scripts deleted
- [ ] Add cascade delete for script errors when scripts deleted
- [ ] Add cascade delete for all scripts when ruleset deleted
- [ ] Update `src/stores/db/hooks/db-hooks.ts` to call `registerScriptHooks()`

### React Hooks
- [ ] Create `src/lib/compass-api/hooks/scripts/` directory
- [ ] Create `src/lib/compass-api/hooks/scripts/use-scripts.ts`
- [ ] Implement `useScripts()` hook with CRUD operations
- [ ] Implement `createScript()` function
- [ ] Implement `updateScript()` function
- [ ] Implement `deleteScript()` function
- [ ] Implement `getScriptByEntity()` function
- [ ] Create `src/lib/compass-api/hooks/scripts/use-script-errors.ts`
- [ ] Implement `useScriptErrors()` hook
- [ ] Implement `logScriptError()` function
- [ ] Implement `clearErrors()` function
- [ ] Implement `dismissError()` function
- [ ] Create `src/lib/compass-api/hooks/scripts/index.ts` to export hooks
- [ ] Update `src/lib/compass-api/hooks/index.ts` to export scripts hooks

### Testing
- [ ] Unit tests for Script and ScriptError types
- [ ] Database schema migration test (v11 → v12)
- [ ] Test script CRUD operations
- [ ] Test cascade deletion (entity → script)
- [ ] Test cascade deletion (script → entity scriptId)
- [ ] Test cascade deletion (ruleset → scripts)
- [ ] Test script-entity associations
- [ ] Test global script filtering
- [ ] Test script error logging
- [ ] Integration test: create attribute with script
- [ ] Integration test: delete attribute with script
- [ ] Integration test: create global script

### Documentation
- [ ] Update migration guide for existing rulesets
- [ ] Document new database schema
- [ ] Document hook usage with examples
- [ ] Add JSDoc comments to all functions

## Notes
- This phase is purely data layer - no execution logic
- Scripts are stored as plain text (source code)
- No validation of QBScript syntax yet (comes in Phase 3)
- Keep backward compatibility with existing rulesets
- Follow existing patterns in `use-attributes.ts` and `use-actions.ts`
- Use `crypto.randomUUID()` for generating IDs
- Use `new Date().toISOString()` for timestamps
- Use `useLiveQuery` from `dexie-react-hooks` for reactive queries
- Use `useErrorHandler` for consistent error handling
- Database hooks run automatically on CRUD operations
- Cascade deletion prevents orphaned records

---

## Implementation Prompt

**Use this prompt when ready to implement Phase 1:**

```
I need you to implement Phase 1 of the QBScript system as specified in 
@src/lib/compass-logic/implementation-phases/phase-1-data-model.md

This phase adds database tables and React hooks for storing and managing QBScript scripts.

CRITICAL REQUIREMENTS:
1. Follow the EXACT file structure and locations specified in the document
2. Use the EXACT patterns from existing files (use-attributes.ts, use-actions.ts)
3. Work through the Implementation Checklist in order
4. Test each section before moving to the next

WORKFLOW:
Step 1: Type Definitions
- Read @src/types/data-model-types.ts to understand the existing pattern
- Add Script and ScriptError types exactly as specified
- Modify Attribute, Action, Item, and CharacterAttribute types
- Verify types compile with no errors

Step 2: Database Schema
- Read @src/stores/db/db.ts to understand the current schema (v11)
- Import the new types
- Add scripts and scriptErrors to the db type definition
- Update db.version(11) to db.version(12)
- Add the two new tables with proper indexes
- Update existing tables (attributes, actions, items, characterAttributes) with new fields
- Verify the database schema compiles

Step 3: Database Hooks
- Create new file @src/stores/db/hooks/script-hooks.ts
- Implement registerScriptHooks() following the pattern in the document
- Add all cascade deletion logic (entity→script, script→entity, ruleset→scripts)
- Update @src/stores/db/hooks/db-hooks.ts to register the new hooks
- Verify hooks are called by checking db.ts

Step 4: React Hooks
- Create new directory @src/lib/compass-api/hooks/scripts/
- Create use-scripts.ts following the EXACT pattern from use-attributes.ts
  - Use useLiveQuery for reactive queries
  - Use useErrorHandler for error handling
  - Use crypto.randomUUID() for IDs
  - Use new Date().toISOString() for timestamps
  - Implement createScript, updateScript, deleteScript, getScriptByEntity
  - Handle entity scriptId updates when creating scripts
- Create use-script-errors.ts for error logging
  - Implement logScriptError, clearErrors, dismissError
  - Use limit parameter (default 100)
  - Use reverse() for most recent first
- Create index.ts to export both hooks
- Update @src/lib/compass-api/hooks/index.ts to export scripts hooks

Step 5: Verification
- Read all the files you created/modified
- Check for TypeScript errors
- Verify all imports are correct
- Verify the pattern matches existing files
- Run through the checklist to ensure nothing was missed

IMPORTANT PATTERNS TO FOLLOW:
- Look at use-attributes.ts for the exact structure of CRUD operations
- Look at use-actions.ts for error handling patterns
- Match the coding style (spacing, naming, comments)
- Use the same error handling approach
- Use the same query patterns

DO NOT:
- Skip any items in the checklist
- Deviate from the specified file locations
- Use different patterns than existing code
- Add features not in the spec
- Write tests yet (that comes after verification)

After implementation, show me:
1. A summary of files created/modified
2. Any TypeScript errors encountered
3. The next steps (testing)

Begin with Step 1 (Type Definitions). Read the existing data-model-types.ts file first, 
then make the changes exactly as specified in the phase document.
```
