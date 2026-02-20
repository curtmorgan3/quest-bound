# Phase 3: World list and creation

**Goal:** Users can open a Worlds list page, see existing worlds, create a new world (pick ruleset + label, optional asset), and navigate to the world editor. World editor can be a placeholder for now.

**Depends on:** Phase 1 (data model), Phase 2 (hooks).

**Reference:** [worlds-plan.md](./worlds-plan.md). Mirror UX from `src/pages/home/characters.tsx` and `src/pages/home/rulesets.tsx` (list, create dialog, ruleset selector).

---

## Tasks

### 3.1 Routes

| Task | File(s) | Notes |
|------|--------|--------|
| Add route `/worlds` → Worlds list page. | `src/App.tsx` | Inside the same Layout Route as rulesets/characters. |
| Add route `/worlds/:worldId` → World editor (placeholder ok: e.g. "World editor" heading and back link). | `src/App.tsx` | |

### 3.2 Sidebar

| Task | File(s) | Notes |
|------|--------|--------|
| Add "Worlds" to the sidebar alongside Rulesets and Characters (e.g. in homepageItems or equivalent). Use an appropriate icon (e.g. Globe from lucide-react). | `src/components/composites/app-sidebar.tsx` | Reuse the same pattern as Rulesets/Characters. |

### 3.3 Worlds list page

| Task | File(s) | Notes |
|------|--------|--------|
| Create the Worlds page component. Use `useWorlds()` to list worlds. Display as cards or list; each world links to `/worlds/:worldId`. Include delete (with confirmation) and a "Create world" entry. | `src/pages/home/worlds.tsx` or `src/pages/worlds/worlds.tsx` | Match the structure and style of Characters/Rulesets pages. |
| Decide whether to show all worlds or filter by current user/ruleset; document or implement consistently with characters (e.g. all worlds for current user if worlds get a userId later, or all for now). | Same | For now listing all worlds is fine. |

### 3.4 Create world flow

| Task | File(s) | Notes |
|------|--------|--------|
| Create world dialog or inline flow: select ruleset (reuse ruleset selector pattern from character creation), enter label, optional asset (image). Call createWorld({ rulesetId, label, assetId? }). | Same page or e.g. `src/pages/home/create-world-dialog.tsx` | |
| On success: navigate to `/worlds/:worldId` or stay on list and show the new world. | Same | |

### 3.5 Exports

| Task | File(s) | Notes |
|------|--------|--------|
| Export the Worlds page from the pages index. Use it in the App route for `/worlds`. | `src/pages/index.ts`, `src/App.tsx` | |

---

## Exit criteria

- [ ] Route `/worlds` shows the Worlds list page; sidebar has a Worlds entry.
- [ ] User can create a world (ruleset + label, optional asset) and it appears in the list.
- [ ] User can open a world (navigate to `/worlds/:worldId`); world editor can be a simple placeholder (e.g. title + back link).
- [ ] User can delete a world from the list (with confirmation).
- [ ] Styling and patterns are consistent with Characters and Rulesets pages.

---

## Implementation prompt

Use this prompt when implementing Phase 3:

```
Implement Phase 3 of the Worlds & Locations feature: world list and creation UI.

Context:
- Phases 1 and 2 are done: types, Dexie tables, and hooks for worlds exist (useWorlds, useWorld, createWorld, updateWorld, deleteWorld).
- Read agents/locations/phase-3.md for the exact tasks.
- Mirror the UX of src/pages/home/characters.tsx and src/pages/home/rulesets.tsx: list/cards, create dialog with ruleset selector, delete with confirmation.

Do the following:

1. **Routes (src/App.tsx)**
   - Add route path `/worlds` for the Worlds list page.
   - Add route path `/worlds/:worldId` for the World editor (can render a simple placeholder: page title "World editor" and a link back to /worlds).

2. **Sidebar (src/components/composites/app-sidebar.tsx)**
   - Add "Worlds" to the homepage items (alongside Rulesets and Characters). Use the Globe icon (or similar) from lucide-react. Link to /worlds.

3. **Worlds list page**
   - Create src/pages/home/worlds.tsx (or src/pages/worlds/worlds.tsx). Use useWorlds() to load worlds. Display them as cards or a list. Each world should link to /worlds/:worldId. Include a delete button with confirmation (e.g. AlertDialog). Include a "Create world" button or card that opens the create flow.

4. **Create world flow**
   - In the same page or a separate component: dialog or inline form to create a world. Fields: ruleset (select from useRulesets), label (required), optional asset/image. On submit call createWorld({ rulesetId, label, assetId? }). On success, navigate to /worlds/:worldId or refresh list.

5. **Exports**
   - Export the Worlds page from src/pages/index.ts and use it in App.tsx for the /worlds route.

Match the existing design system (Tailwind, existing components from @/components). Do not implement the full world editor canvas yet; a placeholder for /worlds/:worldId is enough.
```
