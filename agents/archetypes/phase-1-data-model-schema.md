# Phase 1: Data Model & Schema

## Overview

Add the Archetype and CharacterArchetype types, DB tables, and extend the Script entityType to support archetype scripts.

## Implementation Details

### 1. Add Archetype type

**File:** `src/types/data-model-types.ts`

Add new type extending BaseDetails:

```typescript
export type Archetype = BaseDetails & {
  rulesetId: string;
  name: string;
  description: string;
  assetId?: string | null;
  image?: string | null;
  scriptId?: string | null;
  testCharacterId: string;
  isDefault: boolean;
  loadOrder: number;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};
```

### 2. Add CharacterArchetype type

**File:** `src/types/data-model-types.ts`

```typescript
export type CharacterArchetype = BaseDetails & {
  characterId: string;
  archetypeId: string;
  loadOrder: number;
};
```

### 3. DB schema

**File:** `src/stores/db/schema.ts`

- Add `archetypes` table: `${common}, rulesetId, name, description, assetId, image, scriptId, testCharacterId, isDefault, loadOrder, moduleId`
- Add `characterArchetypes` table: `${common}, characterId, archetypeId, loadOrder, &[characterId+archetypeId]` (compound unique index)
- Increment `dbSchemaVersion`

**File:** `src/stores/db/db.ts`

- Add `archetypes` and `characterArchetypes` to EntityTable typings
- Add tables to db instance

**File:** `src/stores/db/hooks/types.ts`

- Add `archetypes` and `characterArchetypes` to DB type

### 4. Script entityType

**File:** `src/types/data-model-types.ts`

Extend Script's `entityType` union:

```typescript
entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'global';
```

Update any type guards or switch statements that exhaust over entityType.

### 5. Export types

**File:** `src/types/index.ts` (or wherever types are re-exported)

- Export `Archetype` and `CharacterArchetype`

---

## Execution Prompt

```
Implement Phase 1 of the archetypes feature: Data Model & Schema.

Read agents/archetypes/phase-1-data-model-schema.md for full details.

Tasks:
1. Add Archetype and CharacterArchetype types to src/types/data-model-types.ts (extending BaseDetails)
2. Add archetypes and characterArchetypes tables to src/stores/db/schema.ts with appropriate indexes; increment dbSchemaVersion
3. Register the new tables in src/stores/db/db.ts and src/stores/db/hooks/types.ts
4. Extend Script.entityType to include 'archetype' in src/types/data-model-types.ts
5. Export the new types from the types barrel

Follow existing patterns (e.g. charts, characterAttributes) for schema and type structure. Ensure the compound index [characterId+archetypeId] on characterArchetypes enforces uniqueness.
```
