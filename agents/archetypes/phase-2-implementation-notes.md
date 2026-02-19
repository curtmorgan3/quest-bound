# Phase 2 Implementation Notes

## Summary

Implemented migration and default archetype for the archetypes feature.

## Changes

### 1. Ruleset creation hook (`src/stores/db/hooks/ruleset-hooks.ts`)

- Extended the `creating` hook to create a default Archetype after the test character is created.
- Flow: create/find test character → check archetype count → if 0, create default archetype (name "Default", isDefault: true, loadOrder: 0).
- Idempotent: only creates archetype when `archetypes.where('rulesetId').count() === 0`.

### 2. Ruleset deletion hook (`src/stores/db/hooks/ruleset-hooks.ts`)

- Added deletion of archetypes and characterArchetypes when a ruleset is deleted.
- Order: delete characterArchetypes for each archetype, then delete archetypes.

### 3. Migration on ruleset open (`src/lib/compass-api/hooks/rulesets/use-rulesets.ts`)

- Added `useEffect` that runs when `activeRuleset?.id` changes.
- If archetype count === 0: find or create test character, then create default archetype.
- Non-blocking: runs async, no UI blocking.
- Idempotent: exits early if count > 0.
- When creating test character in migration: creates inventory first, then character with inventoryId (matches character-hooks flow; character-hooks returns early when inventoryId exists).

## Dependencies

- Phase 1 complete (Archetype, CharacterArchetype types and DB tables).
