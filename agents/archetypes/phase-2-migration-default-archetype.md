# Phase 2: Migration & Default Archetype

## Overview

Ensure every ruleset has exactly one default archetype with a test character. Auto-create on ruleset creation; migrate existing rulesets when opened.

## Prerequisites

- Phase 1 complete (Archetype, CharacterArchetype types and DB tables exist)

## Implementation Details

### 1. Ruleset creation hook

**File:** `src/stores/db/hooks/ruleset-hooks.ts` (or equivalent)

When a ruleset is created, after the test character is created (existing flow):

1. Create Archetype record:
   - `name: "Default"`
   - `isDefault: true`
   - `loadOrder: 0`
   - `rulesetId`: new ruleset id
   - `testCharacterId`: the test character just created
   - `description: ""` (or sensible default)

2. Link: The existing ruleset creation already creates a test character. The default archetype should reference that test character.

**Note:** The current flow in ruleset-hooks creates a test character when a ruleset is created. Modify so that:
- Create ruleset
- Create test character (existing logic)
- Create default Archetype pointing to that test character

### 2. Migration on ruleset open

**When:** User opens/activates a ruleset that has no archetypes (legacy rulesets).

**Where:** Could be in `useActiveRuleset`, `useRulesets`, or a dedicated migration hook that runs when ruleset is loaded.

**Logic:**
1. Query `db.archetypes.where('rulesetId').equals(rulesetId).count()`
2. If count === 0:
   - Find existing test character: `db.characters.where('rulesetId').equals(rulesetId).filter(c => c.isTestCharacter).first()`
   - If test character exists:
     - Create Archetype: name "Default", isDefault: true, loadOrder: 0, rulesetId, testCharacterId
   - If no test character exists, create one (per current bootstrap) then create archetype

**Consider:** Run migration in a DB hook on ruleset read, or in a useEffect when activeRuleset changes. Avoid blocking the UI.

### 3. Idempotency

Ensure migration only runs once per ruleset. Check `archetypes.where('rulesetId').equals(rulesetId).count() === 0` before creating.

---

## Execution Prompt

```
Implement Phase 2 of the archetypes feature: Migration & Default Archetype.

Read agents/archetypes/phase-2-migration-default-archetype.md for full details.

Prerequisites: Phase 1 must be complete.

Tasks:
1. In the ruleset creation flow (src/stores/db/hooks/ruleset-hooks.ts), after the test character is created, create a default Archetype record (name "Default", isDefault: true, loadOrder: 0) pointing to that test character.
2. Add migration logic: when a ruleset is opened/activated and has no archetypes, create a default archetype linked to the existing test character. Determine the best place (useActiveRuleset, useRulesets, or a migration hook) and implement.
3. Ensure migration is idempotent and does not block UI.

Reference the existing ruleset creation and test character creation flow to integrate correctly.
```
