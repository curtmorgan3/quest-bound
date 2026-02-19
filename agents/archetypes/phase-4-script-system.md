# Phase 4: Script System

## Overview

Add `Owner.hasArchetype(name)`, archetype script support (on_add/on_remove), script templates, and script hooks for archetype deletion.

## Prerequisites

- Phase 1 complete (Archetype, CharacterArchetype, Script entityType includes 'archetype')
- Phase 2 complete (default archetypes exist)
- Phase 3 complete (character creation uses archetypes)

## Implementation Details

### 1. Owner.hasArchetype(name)

**File:** `src/lib/compass-logic/runtime/accessors/owner-accessor.ts`

Add method:

```typescript
hasArchetype(name: string): boolean
```

Logic:
- Query CharacterArchetype for this characterId
- Join with Archetype to get archetype names
- Return true if any archetype matches the given name (by Archetype.name)

The OwnerAccessor receives characterId. It needs access to the DB or a cache of CharacterArchetype + Archetype. The constructor may need to accept archetype data or a way to query it. Check how other Owner methods access data (they use caches passed in). Add archetype-related caches or pass a query function.

**Worker context:** Owner is used in the script worker. Ensure hasArchetype can run in worker context—may need to pass archetype names (or a resolved list) in the execution payload rather than querying DB directly.

### 2. Archetype scripts: on_add and on_remove

**Files:** 
- `src/lib/compass-logic/worker/qbscript-worker.ts` (or equivalent)
- `src/lib/compass-logic/reactive/event-handler-executor.ts`

Add handler for archetype events:
- `on_add()`: Invoked when archetype is added to a character
- `on_remove()`: Invoked when archetype is removed from a character

Create an executor (similar to executeActionEvent, executeItemEvent) that:
1. Loads the archetype's script by scriptId
2. Parses/runs the appropriate handler (on_add or on_remove)
3. Provides Owner context (the character)

**Invocation points:**
- Character creation (Phase 3): After duplication and runInitialAttributeSync, call on_add for the archetype.
- Archetypes panel add (Phase 6): Call on_add when user adds archetype.
- Archetypes panel remove (Phase 6): Call on_remove when user removes archetype.

### 3. Script templates

**File:** `src/pages/ruleset/scripts/templates.ts`

Add archetype entry to SCRIPT_TEMPLATES:

```typescript
archetype: `
// Archetype scripts run when the archetype is added to or removed from a character

on_add():
    Owner.Attribute('Health').set(10)

on_remove():
    Owner.Attribute('Health').subtract(5)
`,
```

### 4. Script hooks for archetype deletion

**File:** `src/stores/db/hooks/script-hooks.ts` (or create archetype-hooks.ts)

When an archetype is deleted:
- If the archetype has a scriptId, clear the script's association (set archetype.scriptId = null or update script's entityId to null). Do NOT delete the script.
- Scripts are standalone; they can exist without an archetype. When archetype is deleted, the script remains but is disassociated.

**File:** Create `src/stores/db/hooks/archetype-hooks.ts` (or add to existing hooks)

- `archetypes.hook('deleting')`: Cascade delete test character, delete all CharacterArchetype rows for this archetypeId. Clear script association if scriptId was set (update the Script's entityId to null, or the Archetype is already being deleted so no need to update Archetype—but the Script entity still has entityId pointing to deleted archetype; consider clearing Script.entityId when entityType is archetype and entityId matches).

Actually: Script has entityType and entityId. When archetype is deleted, we should update any Script where entityType='archetype' and entityId=archetypeId to set entityId=null (or similar). Add this to the archetype deleting hook.

### 5. Script entity table for archetype

**File:** `src/stores/db/hooks/script-hooks.ts`

When scripts are deleted, clean up archetype.scriptId if the script was attached to an archetype. (Similar to attributes, actions, items.)

When archetypes are deleted, clean up scripts' entityId if they pointed to this archetype.

---

## Execution Prompt

```
Implement Phase 4 of the archetypes feature: Script System.

Read agents/archetypes/phase-4-script-system.md for full details.

Prerequisites: Phases 1, 2, 3 complete.

Tasks:
1. Add Owner.hasArchetype(name: string): boolean to OwnerAccessor. Resolve archetype membership via CharacterArchetype join + Archetype. Ensure it works in worker context (pass archetype data in payload if needed).
2. Implement archetype script execution: on_add() and on_remove() handlers. Create executor similar to executeActionEvent/executeItemEvent. Wire it to be callable when archetype is added/removed.
3. Add archetype script template to src/pages/ruleset/scripts/templates.ts.
4. Create archetype-hooks.ts (or add to existing): On archetype delete, cascade delete test character and CharacterArchetype rows. Clear Script.entityId for scripts where entityType='archetype' and entityId matches.
5. Update script-hooks: When a script is deleted, clear archetype.scriptId if the script was attached to an archetype.

Integrate on_add() into Phase 3's character creation flow (run after runInitialAttributeSync).
```
