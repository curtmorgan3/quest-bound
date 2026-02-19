# Phase 8: Cleanup & Edge Cases

## Overview

Add cascade deletes, dependency graph support for archetype scripts, and E2E tests.

## Prerequisites

- Phases 1–7 complete

## Implementation Details

### 1. Character deletion: cascade CharacterArchetype

**File:** `src/stores/db/hooks/character-hooks.ts`

In the `characters.hook('deleting')` handler, add:
- Delete all CharacterArchetype rows where characterId equals the deleted character's id.

**Current deleting hook** already cleans characterAttributes, characterPages, characterWindows, inventories. Add characterArchetypes.

### 2. Archetype deletion: cascade (verify)

**File:** `src/stores/db/hooks/archetype-hooks.ts` (created in Phase 4)

Verify the archetype deleting hook:
- Deletes test character (and its characterAttributes, characterPages, characterWindows, inventory, inventoryItems).
- Deletes all CharacterArchetype rows for this archetypeId.
- Clears Script.entityId for scripts where entityType='archetype' and entityId=archetypeId.
- Does NOT delete characters or scripts.

### 3. Ruleset deletion: cascade archetypes

**File:** `src/stores/db/hooks/ruleset-hooks.ts`

In the `rulesets.hook('deleting')` handler, add:
- Delete all Archetype records for the ruleset. This will trigger archetype-hooks (cascade test characters, CharacterArchetype rows). Or delete archetypes explicitly before other entities if ordering matters.

**Note:** Archetype deletion cascades to test character. The current ruleset deletion finds "the" test character and deletes it. With multiple test characters (one per archetype), we must delete all test characters. Deleting archetypes first (which cascades to their test characters) may handle this. Verify no double-delete or orphan.

### 4. Dependency graph: archetype scripts

**File:** `src/lib/compass-logic/reactive/` (dependency graph builder)

If the dependency graph is used for script analysis or execution order:
- Include scripts where entityType='archetype' when building the graph.
- Ensure archetype scripts are considered when analyzing dependencies (e.g. if an attribute script references Owner.hasArchetype, that may not create a traditional dependency, but document for completeness).

**Check:** `buildDependencyGraph` and related code. Add archetype to entity type handling if needed.

### 5. Script hooks: archetype cleanup on script delete

**File:** `src/stores/db/hooks/script-hooks.ts`

When a script is deleted:
- If the script was attached to an archetype (entityType='archetype', entityId=archetypeId), update the archetype to set scriptId=null.

**Check:** Script hooks currently clean attributes, actions, items. Add archetypes to the cleanup.

### 6. E2E tests

**File:** `cypress/e2e/` (create new or extend existing)

**Test cases:**
1. **Character creation with archetype:** Create ruleset with default archetype → create character (with default) → verify character has archetype, attributes/pages/inventory duplicated.
2. **Character creation with explicit archetype:** Create ruleset with multiple archetypes → create character, select non-default archetype → verify correct template applied.
3. **Add/remove archetype at runtime:** Open character → open Archetypes panel → add archetype → verify on_add ran (e.g. attribute changed) → remove archetype → verify on_remove ran.
4. **Export/import with archetypes:** Create ruleset with archetypes → export → import into new ruleset → verify archetypes and test characters present.
5. **Archetype management (creator):** Create archetype → verify test character created → delete archetype → verify test character deleted.

**Files:**
- `cypress/e2e/archetypes.cy.ts` or extend `character-management.cy.ts`, `attribute-management.cy.ts` as appropriate.

### 7. Data testid attributes

Add `data-testid` attributes for:
- Archetype selector in create character dialog
- Archetype switcher in sidebar, archetype management list items
- Archetypes panel: add button, remove button, list items

**Reference:** `cypress/DATA-TESTID-REFERENCE.md` if it exists.

---

## Execution Prompt

```
Implement Phase 8 of the archetypes feature: Cleanup & Edge Cases.

Read agents/archetypes/phase-8-cleanup-edge-cases.md for full details.

Prerequisites: Phases 1–7 complete.

Tasks:
1. Character deletion: Add cascade delete of CharacterArchetype rows in character-hooks.ts deleting handler.
2. Verify archetype deletion hook: Cascade test character, CharacterArchetype rows; clear script association. No character or script deletion.
3. Ruleset deletion: Ensure archetypes are deleted (and their test characters). Avoid double-delete; verify cascade order.
4. Dependency graph: Add archetype scripts to dependency graph if the graph builder handles entity types.
5. Script deletion: When script deleted, clear archetype.scriptId if script was attached to an archetype.
6. E2E tests: Character creation with archetype; add/remove archetype at runtime; export/import with archetypes; archetype management CRUD.
7. Add data-testid attributes for new UI elements (archetype selector, switcher, panel).
```