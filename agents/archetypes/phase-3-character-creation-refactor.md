# Phase 3: Character Creation Refactor

## Overview

Replace the current character bootstrap flow with duplication from an archetype's test character. Add archetype selection to the create character dialog.

## Prerequisites

- Phase 1 complete (Archetype, CharacterArchetype types and DB tables)
- Phase 2 complete (default archetype exists for all rulesets)

## Implementation Details

### 1. Character creation flow refactor

**File:** `src/lib/compass-api/hooks/characters/use-character.ts`

**Current flow:** `createCharacter` calls `bootstrapCharacterAttributes` and `bootstrapCharacterPagesAndWindows`; character-hooks copies inventory from test character.

**New flow:**

1. Accept optional `archetypeId` in createCharacter payload. If omitted, resolve default archetype for the ruleset.
2. Get archetype and its test character.
3. Create character record (existing).
4. Create inventory (existing hook creates empty inventory; we will populate it).
5. Duplicate from test character:
   - **characterAttributes**: Copy each CharacterAttribute from test character, replace characterId with new character's id, generate new ids.
   - **characterPages**: Copy CharacterPage joins; create new Page records if needed (or share pages—check current bootstrapCharacterPagesAndWindows logic).
   - **characterWindows**: Copy CharacterWindow records for the new character.
   - **inventoryItems**: Copy from test character's inventory into new character's inventory.
6. Add CharacterArchetype row: characterId, archetypeId, loadOrder: 0.
7. Run `runInitialAttributeSync` (existing) for the new character.
8. Run archetype's `on_add()` script (requires Phase 4 script wiring; can stub or add in Phase 4).

### 2. Character-hooks refactor

**File:** `src/stores/db/hooks/character-hooks.ts`

- Remove or modify the logic that copies inventory items from test character to new character. With archetypes, duplication happens in createCharacter, so the hook should either:
  - Not copy inventory (createCharacter handles it), or
  - Only run when ruleset has no archetypes (fallback for edge cases).

Given Phase 2 ensures all rulesets have a default archetype, the hook's inventory copy can be removed. The createCharacter flow will duplicate inventory from the archetype's test character.

**Note:** The character-hooks `creating` hook runs asynchronously. The inventory is created in the hook. We need createCharacter to run after the character (and inventory) exist. So: createCharacter adds character → hook creates inventory → createCharacter (in its async flow) then duplicates attributes, pages, windows, inventory. The duplication step in createCharacter must run after the hook completes. This may require awaiting the character add and then doing duplication in a follow-up step.

### 3. Create character dialog

**File:** `src/pages/home/characters.tsx`

- Add archetype selector (Select/dropdown) when ruleset is selected.
- Fetch archetypes for the selected ruleset.
- Default to the default archetype (isDefault: true) or first archetype.
- Pass `archetypeId` to createCharacter when user selects one (or omit to use default).

### 4. Duplication helper

Consider extracting duplication logic into a utility (e.g. `duplicateCharacterFromTemplate` or similar) that takes source character id and target character id, and copies characterAttributes, characterPages, characterWindows, inventoryItems. Reuse for character creation and potentially for other flows.

---

## Execution Prompt

```
Implement Phase 3 of the archetypes feature: Character Creation Refactor.

Read agents/archetypes/phase-3-character-creation-refactor.md for full details.

Prerequisites: Phases 1 and 2 must be complete.

Tasks:
1. Refactor createCharacter in src/lib/compass-api/hooks/characters/use-character.ts to accept optional archetypeId and duplicate from the archetype's test character (characterAttributes, characterPages, characterWindows, inventoryItems) instead of bootstrapping from ruleset defaults.
2. Add CharacterArchetype row when creating a character.
3. Run runInitialAttributeSync after duplication. (Stub or defer archetype on_add() execution until Phase 4 if needed.)
4. Refactor character-hooks to remove the inventory copy from test character (duplication now happens in createCharacter).
5. Add archetype selector to the create character dialog in src/pages/home/characters.tsx. Fetch archetypes for selected ruleset; default to default archetype; pass archetypeId to createCharacter.

Handle the async timing: character-hooks creates inventory; createCharacter must duplicate after character exists. Consider extracting duplication into a reusable helper.
```
