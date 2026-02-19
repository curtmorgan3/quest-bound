# Phase 6: Player Experience

## Overview

Add the Archetypes panel for players to view, add, remove, and reorder archetypes on their character. Follow the CharacterInventoryPanel pattern.

## Prerequisites

- Phases 1–5 complete

## Implementation Details

### 1. Archetypes panel context

**Pattern:** Same as CharacterInventoryPanelContext.

**Files:**
- Create `src/stores/context/character-archetypes-panel-context.tsx`:
  - `{ open: boolean; setOpen: (open: boolean) => void }`
  - `createContext` and provider

- `src/components/layout.tsx`: Add `CharacterArchetypesPanelContext.Provider` with open/setOpen state (similar to CharacterInventoryPanelContext).

### 2. Archetypes panel component

**Location:** Rendered only when on character route (`/characters/:characterId`), same as CharacterInventoryPanel.

**Files:**
- Create `src/pages/characters/character-archetypes-panel/character-archetypes-panel.tsx`
- Create `src/pages/characters/character-archetypes-panel/index.ts` (barrel)

**Props:** `{ open: boolean; onOpenChange: (open: boolean) => void }`

**Content:**
- Requires `characterId` from route params.
- List character's archetypes: query CharacterArchetype for characterId, join with Archetype. Sort by loadOrder.
- Display: archetype name, optional image/description. Drag handle for reorder.
- "Add archetype" button: opens modal or inline picker to select from ruleset's archetypes (exclude already-added).
- Remove button per archetype.
- Drag-to-reorder: update loadOrder for all CharacterArchetype rows when order changes.

### 3. Add archetype flow

When user clicks "Add archetype":
1. Show picker (modal/dropdown) with archetypes from character's ruleset that are not already on the character.
2. On select: add CharacterArchetype row with loadOrder = max(loadOrder) + 1.
3. Run archetype's `on_add()` script (use executor from Phase 4).

### 4. Remove archetype flow

When user clicks remove:
1. Run archetype's `on_remove()` script first.
2. Delete CharacterArchetype row.

### 5. Reorder flow

When user drags to reorder:
1. Compute new loadOrder values (0, 1, 2, ...) based on new order.
2. Bulk update CharacterArchetype rows.

### 6. Sidebar button

**File:** `src/components/composites/app-sidebar.tsx`

Add "Archetypes" button next to "Inventory" in the footer, when `character` is set. Same pattern as character inventory:

```tsx
{character && characterArchetypesPanel && (
  <SidebarMenuItem>
    <SidebarMenuButton
      onClick={() => characterArchetypesPanel.setOpen(true)}
      data-testid='nav-character-archetypes'>
      <Layers className='w-4 h-4' />  // or appropriate icon
      <span>Archetypes</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

### 7. Render panel in character page

**File:** `src/pages/characters/character.tsx`

Add CharacterArchetypesPanel alongside CharacterInventoryPanel:

```tsx
{characterArchetypesPanel && (
  <CharacterArchetypesPanel
    open={characterArchetypesPanel.open}
    onOpenChange={characterArchetypesPanel.setOpen}
  />
)}
```

Use a Drawer or Sheet for the panel (same as CharacterInventoryPanel).

---

## Execution Prompt

```
Implement Phase 6 of the archetypes feature: Player Experience.

Read agents/archetypes/phase-6-player-experience.md for full details.

Prerequisites: Phases 1–5 complete.

Tasks:
1. Create CharacterArchetypesPanelContext (open, setOpen). Add provider in layout.tsx.
2. Create CharacterArchetypesPanel component. List character's archetypes (from CharacterArchetype join); drag-to-reorder (update loadOrder); add/remove buttons.
3. Add archetype: Picker for ruleset archetypes not yet on character. On select, add CharacterArchetype (loadOrder = max+1), run on_add().
4. Remove archetype: Run on_remove(), then delete CharacterArchetype row.
5. Add "Archetypes" sidebar button (next to Inventory) when on character route. Render CharacterArchetypesPanel in character page when context exists.

Follow CharacterInventoryPanel pattern for context, sidebar button, and panel rendering. Use Drawer or Sheet for panel UI.
```
