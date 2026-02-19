# Phase 3 Implementation Notes

## Summary

Refactored character creation to duplicate from an archetype's test character instead of bootstrapping from ruleset defaults. Added archetype selection to the create character dialog.

## Changes

### 1. `duplicateCharacterFromTemplate` utility (`src/utils/duplicate-character-from-template.ts`)

- New helper that copies character data from source to target character.
- Copies: characterAttributes, characterPages (sharing same pageIds), characterWindows (with characterPageId mapping), inventoryItems.
- Takes sourceCharacterId, targetCharacterId, targetInventoryId.

### 2. `createCharacter` refactor (`src/lib/compass-api/hooks/characters/use-character.ts`)

- Accepts optional `archetypeId` in payload. If omitted, resolves default archetype (isDefault) or first archetype for the ruleset.
- Flow: resolve archetype → get test character → create inventory → add character with inventoryId (hook skips) → duplicateCharacterFromTemplate → add CharacterArchetype row → runInitialAttributeSync.
- Removed bootstrapCharacterAttributes and bootstrapCharacterPagesAndWindows (replaced by duplication).
- Extracted runInitialAttributeSync into runInitialAttributeSyncSafe for reuse.
- Archetype on_add() script execution deferred to Phase 4.

### 3. Character-hooks refactor (`src/stores/db/hooks/character-hooks.ts`)

- Removed inventory copy from test character to new character. Duplication now happens in createCharacter.
- Added characterArchetypes deletion when a character is deleted.

### 4. Create character dialog (`src/pages/home/characters.tsx`)

- Added archetype selector (Select) shown when ruleset is selected.
- Fetches archetypes via useLiveQuery for selected ruleset.
- Defaults to default archetype (isDefault) or first archetype.
- Passes archetypeId to createCharacter (or default when omitted).
- Resets archetypeId when ruleset changes.

## Timing

- createCharacter creates inventory first, then adds character with inventoryId. The character-hooks sees existing inventory and returns early (no duplicate creation, no inventory copy).
