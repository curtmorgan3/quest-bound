# Phase 7: Export/Import

## Overview

Add archetypes to ruleset export and import. Include archetypes in module imports.

## Prerequisites

- Phases 1–6 complete

## Implementation Details

### 1. Export: archetypes.json

**File:** `src/lib/compass-api/hooks/export/use-export-ruleset.ts`

**Current:** Exports `characters.json` with one test character.

**New:**
- Add `archetypes.json`: Export all Archetype records for the ruleset. Include: id, rulesetId, name, description, assetId, image, scriptId, testCharacterId, isDefault, loadOrder, createdAt, updatedAt. Resolve asset filenames if needed (similar to other entities).
- Update `characters.json`: Export all test characters (one per archetype). The characters array should include every character where `archetype.testCharacterId` references it. Ensure archetype ↔ test character linkage is preserved (archetypes reference character ids; characters are in the same export).

**Structure:**
```
appData/
  archetypes.json   // Array of archetype objects
  characters.json   // Array of character objects (all test characters)
  ...
```

**Consider:** When exporting, archetype.testCharacterId points to a character id. The characters.json will have those characters. On import, we need to preserve ids or remap. Check how current export handles character ids (likely preserved for round-trip).

### 2. Export: update metadata/counts

**File:** `src/lib/compass-api/hooks/export/use-export-ruleset.ts` or export types

- Add `archetypes` to export metadata counts if applicable.
- Ensure export result includes archetype count.

### 3. Import: parse archetypes.json

**File:** `src/lib/compass-api/hooks/export/use-import-ruleset.ts`

**Logic:**
1. Parse `archetypes.json` from zip (if present).
2. For each archetype: create Archetype record. Preserve or remap ids as per existing import strategy.
3. Link to characters: archetype.testCharacterId must reference a character in the imported characters array. Characters are imported first (existing flow); then archetypes are imported with testCharacterId pointing to those characters.
4. Handle migration: If no archetypes.json (legacy export), create default archetype from first test character (same as Phase 2 migration).

**Order of import:** Ruleset → attributes, actions, items, etc. → characters → archetypes (so testCharacterId can reference imported characters).

### 4. Import: migration for legacy exports

When `archetypes.json` is missing:
- Find first test character for the ruleset (from characters.json).
- Create default Archetype (name "Default", isDefault: true, loadOrder: 0, testCharacterId = that character's id).

### 5. Module import

**File:** `src/lib/compass-api/hooks/export/add-module-to-ruleset.ts` (or equivalent)

When adding a module to a ruleset:
- Import archetypes from the module.
- Import their test characters.
- Create Archetype records in the target ruleset.
- Remap rulesetId, testCharacterId, and other ids as needed for the target ruleset.

**Reference:** Check how modules currently import characters, attributes, etc. Follow the same pattern for archetypes.

### 6. Duplicate ruleset

**File:** `src/lib/compass-api/hooks/export/duplicate-ruleset.ts`

When duplicating a ruleset:
- Copy archetypes (with new ids, new rulesetId).
- Copy test characters (with new ids).
- Update archetype.testCharacterId to point to the new test character ids.
- Copy CharacterArchetype rows for any characters that are duplicated (if applicable).

---

## Execution Prompt

```
Implement Phase 7 of the archetypes feature: Export/Import.

Read agents/archetypes/phase-7-export-import.md for full details.

Prerequisites: Phases 1–6 complete.

Tasks:
1. Export: Add archetypes.json to ruleset export. Export all Archetype records for the ruleset. Update characters.json to include all test characters (one per archetype). Preserve archetype ↔ test character linkage.
2. Import: Parse archetypes.json. Create Archetype records. Ensure import order allows testCharacterId to reference imported characters. Handle legacy exports (no archetypes.json): create default archetype from first test character.
3. Module import: Include archetypes and their test characters when adding a module to a ruleset. Follow existing module import patterns.
4. Duplicate ruleset: Copy archetypes and test characters; remap ids and testCharacterId references.

Reference use-export-ruleset.ts, use-import-ruleset.ts, add-module-to-ruleset.ts, and duplicate-ruleset.ts for existing patterns.
```
