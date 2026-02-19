# Phase 5: Creator Experience

## Overview

Add the archetype switcher in the sidebar (for ruleset editor context), update useRulesets/useActiveRuleset to resolve test character from selected archetype, add archetype management UI in the ruleset editor, and ensure character pages/windows/attributes use the archetype's test character.

## Prerequisites

- Phases 1–4 complete

## Implementation Details

### 1. Archetype switcher (sidebar dropdown)

**Purpose:** When editing a ruleset (script editor, window preview), creators need to choose which archetype's test character is in "character context."

**Location:** App sidebar. Visible when character context matters—i.e. when in ruleset editor (not on homepage) and on routes where character context is used: script editor, window preview, page editor.

**Implementation:**
- Add state for selected archetype: `selectedArchetypeId: string | null`. Store in Zustand store or React context (e.g. `ArchetypeContext` or extend existing ruleset context).
- Add dropdown in sidebar: lists archetypes for active ruleset, sorted by loadOrder. Default to archetype with `isDefault: true`.
- When route is `/rulesets/:rulesetId/scripts/*` or `/rulesets/:rulesetId/windows/*` or `/rulesets/:rulesetId/pages/*`, show the dropdown.
- Persist selection (e.g. localStorage key `qb.selectedArchetypeId`) per ruleset so it survives navigation.

**Files:**
- `src/components/composites/app-sidebar.tsx`: Add archetype dropdown (or a compact selector) in the sidebar when in ruleset editor.
- Create store/context: `src/stores/context/archetype-context.tsx` or add to `useActiveRuleset` / ruleset store.

### 2. useRulesets / useActiveRuleset: resolve test character from archetype

**Current:** `testCharacter` is the first test character for the ruleset (`testCharacters[0]`).

**New:** `testCharacter` should be the test character for the *selected archetype*. If no archetype selected, use default archetype.

**Logic:**
- Get `selectedArchetypeId` from state (or default archetype for ruleset).
- Find Archetype by id.
- Get test character: `archetype.testCharacterId` → `db.characters.get(testCharacterId)`.
- Return that character as `testCharacter`.

**Files:**
- `src/lib/compass-api/hooks/rulesets/use-rulesets.ts`: Change `testCharacter` resolution to use selected archetype.
- `src/lib/compass-api/hooks/rulesets/use-active-ruleset.ts`: Same if it has its own test character logic.

### 3. Archetype management UI (ruleset editor)

**Location:** New route or section in ruleset editor, e.g. `/rulesets/:rulesetId/archetypes`.

**Features:**
- List archetypes for the ruleset, sorted by loadOrder.
- Drag-to-reorder to update loadOrder.
- Create archetype: creates Archetype record + test character (bootstrap from ruleset: characterAttributes, pages, windows, inventory). Link via testCharacterId.
- Edit archetype: name, description, image, script association.
- Delete archetype: cascade delete test character and CharacterArchetype rows; clear script association.
- Add to sidebar ruleset items (between existing items, e.g. after Pages or before Scripts).

**Files:**
- Create `src/pages/ruleset/archetypes/` (or similar): list page, create/edit forms.
- Add "Archetypes" to `rulesetItems` in app-sidebar.tsx with url `/rulesets/${activeRuleset?.id}/archetypes`.

### 4. Character pages/windows/attributes in ruleset editor

**Current:** Script editor, window editor, page editor use `testCharacter` from useRulesets.

**Verification:** Ensure all consumers of `testCharacter` now receive the archetype's test character (from the switcher). No code changes if useRulesets already returns the correct test character; just verify script editor, window editor, page editor, attribute hooks all use it.

**Files to verify:**
- `src/pages/ruleset/scripts/script-editor-page.tsx`
- `src/pages/ruleset/scripts/script-editor/editor-top-bar.tsx`
- `src/pages/ruleset/scripts/script-editor/event-controls.tsx`
- `src/pages/ruleset/scripts/script-editor/attribute-controls.tsx`
- `src/pages/ruleset/windows/window-editor.tsx`
- `src/pages/ruleset/pages/ruleset-page-editor-page.tsx`
- `src/stores/db/hooks/attribute-hooks.ts` (uses test character for new attributes)

---

## Execution Prompt

```
Implement Phase 5 of the archetypes feature: Creator Experience.

Read agents/archetypes/phase-5-creator-experience.md for full details.

Prerequisites: Phases 1–4 complete.

Tasks:
1. Add archetype switcher: Create state/context for selectedArchetypeId. Add dropdown in app sidebar when in ruleset editor (scripts, windows, pages routes). List archetypes by loadOrder; default to isDefault archetype. Persist per ruleset (localStorage).
2. Update useRulesets and useActiveRuleset: Resolve testCharacter from selected archetype's testCharacterId (or default archetype). Replace testCharacters[0] logic.
3. Create archetype management UI: New route /rulesets/:rulesetId/archetypes. CRUD for archetypes; drag-to-reorder loadOrder; create archetype creates test character and links; delete cascades. Add "Archetypes" to sidebar ruleset items.
4. Verify script editor, window editor, page editor, and attribute hooks use the resolved test character (from useRulesets). Fix any that still assume a single test character.
```
