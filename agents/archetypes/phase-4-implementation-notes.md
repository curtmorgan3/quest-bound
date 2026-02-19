# Phase 4 Implementation Notes

## Summary

Added archetype script system: Owner.hasArchetype(name), on_add/on_remove handlers, script template, and DB hooks for archetype/script lifecycle.

## Changes

### 1. Owner.hasArchetype(name) (`src/lib/compass-logic/runtime/accessors/owner-accessor.ts`)

- Added `archetypeNamesCache: Set<string>` to OwnerAccessor constructor.
- Added `hasArchetype(name: string): boolean` that checks the cache.
- ScriptRunner loads archetype names in loadCache (CharacterArchetype join Archetype) for owner and target.
- Works in worker context since cache is loaded before script execution.

### 2. Archetype script executor (`src/lib/compass-logic/reactive/event-handler-executor.ts`)

- Extended EventHandlerType with 'on_add' | 'on_remove'.
- Added `executeArchetypeEvent(archetypeId, characterId, eventType, roll?)` to EventHandlerExecutor.
- Added convenience `executeArchetypeEvent(db, archetypeId, characterId, eventType, roll?)`.
- Extended ScriptExecutionContext.triggerType with 'archetype_event'.

### 3. Script template (`src/pages/ruleset/scripts/templates.ts`)

- Updated archetype template with on_add() and on_remove() examples.

### 4. Archetype hooks (`src/stores/db/hooks/archetype-hooks.ts`)

- New file: `registerArchetypeDbHooks`.
- On archetype delete: delete CharacterArchetype rows, clear Script.entityId for scripts pointing to this archetype, cascade delete test character.
- Registered in db-hooks.ts.

### 5. Script hooks (`src/stores/db/hooks/script-hooks.ts`)

- On script delete: clear archetype.scriptId for archetypes that had this script.

### 6. Character creation integration (`src/lib/compass-api/hooks/characters/use-character.ts`)

- After runInitialAttributeSync, if archetype has scriptId, call executeArchetypeEvent(db, archetype.id, characterId, 'on_add').
- Runs in main thread (db available); no worker round-trip for on_add during character creation.

## Notes

- on_remove is wired in the executor but not yet invoked (Phase 6 archetypes panel will add/remove archetypes from characters).
- ArchetypeLookup for script editor (to link archetype scripts to archetypes) may be added in Phase 6 with the archetypes panel.
