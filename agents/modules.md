# Modules feature

Modules are rulesets that have been added to another ruleset. A module is not its own model—it’s a ruleset marked with `isModule`. Adding a module means duplicating that ruleset’s content into the consuming ruleset.

## Content duplicated when a module is added

- attributes
- actions
- items
- charts
- documents
- components (within pages/windows)
- windows
- rulesetPages
- characterPages
- rulesetWindow
- characterWindow
- pages
- scripts
- assets
- characters (isTestCharacter === true only)
- characterAttribute (for included characters)
- inventory (for included characters)
- inventoryItems (for included inventories)
- diceRolls
- fonts

**Module tracking on entities:** Entities get new IDs in the consuming ruleset and keep a reference to their origin. Add `moduleId`, `moduleEntityId`, and `moduleName` on: attribute, action, item, chart, document, window, page, script. **Not** on component (components are not user-facing in the same way).

**Ruleset-level tracking:** Add a `modules` property to the ruleset table: list of added modules with ID, name, and image. Used to power “remove module content” and to handle deleted source rulesets.

## Adding a module

- **From app:** User picks an existing ruleset (with `isModule`) and adds it to the current ruleset.
- **From file:** User uploads a ruleset zip (same format as `use-export-ruleset.ts`). The zip must have `rulesetId` in its metadata; if not, block the add. Content is added to the ruleset; the file’s ruleset is not added to the DB unless the user chooses to.

## Removal and re-import

- **Remove module:** Delete all entities that came from that module. Warn about dangling references (see list below). Do not fix references—warn only.
- **Re-import same module:** Treated as “refresh from module”—overwrite that module’s content with a fresh copy from the source.

No nested modules. Content is attributed only to the module it was directly added from.

## Conflicts

- **ID conflict:** If the module has an entity with the same ID as one in the consuming ruleset, skip importing that entity. Keep track of skipped instances so they can be surfaced to the user.
- **Name conflict:** Overwrite the local name and append `(<module name>)`.

After import, module content is full ruleset content: fully editable, local only, no upstream/downstream effects.

## UI

- **Location:** New “modules” area in ruleset settings (page does not exist yet).
- **Origin visibility:** Titles of content from modules are shown in **blue** in: attribute/action/item charts, charts index, document index, script index.
- **Deleted source:** Use the ruleset’s `modules` list to show when a source no longer exists and to still offer “remove module content.”

## Dangling references (warn on module removal only)

We do **not** validate refs on import—assume the module’s content is self-consistent. Dangling refs are only checked when **removing** a module, because native ruleset content may reference the module’s entities.

- **Components:** `attributeId`, `actionId`, `windowId`, `childWindowId`; and in **component.data**: `conditionalRenderAttributeId`, `pageId`, and any other refs in data.
- Scripts: `entityId`
- Charts: `assetId`
- Documents: `pdfAssetId`, `assetId`
- Window: `pageId`, `assetId`
- Attributes: `scriptId`, `assetId`
- Actions: `scriptId`, `assetId`
- Items: `scriptId`, `assetId`
- (Any other cross-entity refs that would point at removed module entities.)

---

## Follow-up: data model cross-check (from `data-model-types.ts`)

Compared the duplicate list and dangling-ref list to the codebase. Findings and questions:

### Duplicate list — alignment

- **ScriptError, ScriptLog, DependencyGraphNode:** We do **not** duplicate these (runtime/derived). On module removal, ScriptErrors/Logs for removed scripts can be deleted; DependencyGraphNodes can be regenerated.
- **Page** has no `rulesetId` in the type; linkage is via **RulesetPage** (rulesetId + pageId). Duplication is: duplicate **Page** (new id), then **RulesetPage** (new rulesetId, new pageId). List already has pages, rulesetPages, characterPages — good.
- **Inventory** (type has `items: Item[]`) — DB schema has inventories without embedded items; contents are in **inventoryItems**. Duplicate inventory rows and inventoryItems, remapping entityId, inventoryId, characterId to new IDs.

### Dangling refs — corrections (applied in spec above)

- **Component:** Use **attributeId** (singular); in **component.data** use **conditionalRenderAttributeId**; include **pageId** and any other refs in component data in the dangling-ref check when a module is removed.

### Duplication order

- We assume modules have no dangling refs on import; we only check for dangling refs when **removing** a module (native content may reference the removed module). So we do **not** need a spec-level duplication order for validation. Implementation can handle ID remapping either by duplicating in dependency order (so maps exist when remapping) or by a second remap pass—either is fine.

---

## Clarifying questions (to be answered before implementation)

### Data model & relationships

- **Reference vs copy:** Is a module a live reference to another ruleset (by ID), or a one-time copy/snapshot of that ruleset’s content at add-time?
- **Removal behavior:** When a module is removed from a ruleset, what happens to the content that was added? Delete it entirely, or keep the data but clear/unlink the `moduleId` (e.g. “promote” to local)?
- **Duplicate modules:** Can the same ruleset be added as a module more than once to a single consuming ruleset, or is it one-to-one?
- **Nested modules:** If Ruleset A has Module B, and B has Module C, does A get only B’s content, or B’s content plus C’s (transitive)?

_answer_
A module isn't its own model, rather it's just another ruleset marked with a `isModule` property. Adding a module is really just about duplicating the content of the module into the ruleset. It will need a new ID while also keeping a reference to its original ID so it can respond to future module imports.

An attribute might have new properties like this: moduleId (the ruleset from which it was duplicated), moduleEntityId (the id of the entity within that module from which it was duplicated), moduleName (string for easy reference)

So the user can either A) Upload a module file that adds its content to a ruleset but does not add the ruleset. B) Create a module and add it to another ruleset in the same application DB.

When a module is removed, all the entities from that module are removed from the ruleset. The user should be warned about dangling references.

If the same module is added to a ruleset again, all the module content will be overwritten

There can be no nested modules. Once content is in the ruleset is added from the module, that content is considered to have come from that module, regardless of downstream modules.

### Content merging & conflicts

- **Name/ID conflicts:** If the consuming ruleset already has an attribute (or action, item, etc.) with the same name or ID as something in the module, what should happen? Options: merge, rename with suffix, replace, or show a conflict resolution UI?
- **Editability:** Is content that came from a module read-only in the consuming ruleset, or can users edit it? If editable, does editing affect only the consumer’s copy or also the source module ruleset?
- **Updates:** If the source ruleset (the module) is later updated by its author, should the consuming ruleset ever receive those updates (e.g. “check for updates”), or is the relationship fixed at add-time?

_answer_
For ID conflicts, the consuming ruleset's content should take priority. For naming conflicts, overwrite the name and append (<module name>) to it.

After the addition, module content is considered ruleset content for all intent and purposes. It is fully editable. Content is local to the ruleset, there are not downstream or upstream effects on edit.

### UI & discovery

- **Ruleset modules page:** Does this page already exist, or is it new? Where should it live (e.g. ruleset settings, a new tab in the ruleset editor)?
- **Adding a module:** How does the user add a module—choose from their existing rulesets, import from file, or something else (e.g. marketplace)?
- **Origin visibility:** When viewing or editing content that came from a module, should the UI show a module badge or label so users know its origin?

_answer_
The modules page does not exist. It can be in the ruleset settings page for now.

Modules can be added from their existing rulesets, or by uploading a ruleset zip file (same format as is exported in use-export-ruleset.ts)

The titles of content from modules should be blue in color when shown in the attribute, action or item charts, the charts and document index pages and the script index page.

### Scope & definitions

- **Scripts:** Do module scripts run in the same context as the consuming ruleset (e.g. same character data)? Any isolation or sandboxing?
- **Pages / Windows:** In this codebase, what are “pages” and “windows” (e.g. character sheet pages, reference docs, modal windows)? Need to align with existing types.

_answer_
Module scripts run in the same context. They should be treated the same as ruleset scripts.

Pages have many windows, windows have many components. A page is a character sheet template made of windows. These will be included in modules that encapsulate those designs. The components will also need to be duplicated into the ruleset.

### Edge cases

- **Circular dependencies:** If Ruleset A adds B as a module and B adds A, how should we handle it? Block, allow with cycle detection, or something else?
- **Deleted source:** If the user deletes a ruleset that is currently used as a module by another ruleset, what happens to the consuming ruleset’s content that came from that module?

_answer_
Since module content is flattened when loaded into a ruleset, we don't need to keep a dependency tree. There is no live tracking or association, just content duplication and management.

---

## Follow-up questions

### ID conflicts

- **“Consuming ruleset’s content should take priority”** — When the module has an entity with the same ID as one already in the ruleset, do we: (a) skip importing that entity, (b) import it with a new ID so both exist, or (c) replace the existing entity with the module’s version?

A) skip importing it. Keep track of those instances so they can be surfaced to the user.

### Re-import / overwrite

- **“If the same module is added again, all the module content will be overwritten”** — Do we overwrite with a fresh copy from the module (i.e. re-adding the same module acts as “refresh from module”), or does “overwrite” mean something else?

Reimporting should act as a refresh

### Uploaded module file (no ruleset in DB)

- When the user **uploads a zip** and we don’t add the ruleset to the DB, the duplicated content still needs `moduleId` (and `moduleEntityId`, `moduleName`). What do we use for `moduleId`? Options: a generated ID from the zip, or create a minimal/transient ruleset record so we have a stable ID for “content from this upload”? This affects how we know which content came from that upload and whether we can “re-import” from the same file.

The zipped module should have a rulesetId in its metadata. Use that. If it doesn't, prevent the module addition.

### Dangling references

- When removing a module, you mentioned **warning about dangling references**. What counts as a reference? (e.g. actions referencing attributes, items referencing attributes, scripts referencing entity IDs, sheet components referencing attributes?) Do we only warn, or also offer to remove or fix those references?

Only warn for now. Components with attributeIds, conditionalRenderId, actionId or windowId, scripts with entityId, window with pageId, etc.

### Charts and documents

- The original list included **attributes, actions, items, windows, pages, scripts**. You mentioned “attribute, action or item **charts**” and “**charts** and document index pages.” Are “charts” and “documents” separate entity types that get duplicated and get `moduleId` + blue title, or are they just the UI (e.g. chart view of attributes)? If they’re entities, they should be in the duplicate list.

Charts and documents are db models that will also be duplicated. So the full list is: attribute, action, item, chart, document, component, window, page, script.

### Components and module tracking

- For **pages → windows → components**: when we duplicate, do we add `moduleId` / `moduleEntityId` / `moduleName` on **components** (and windows) as well, or only at the page level?

Add them to page and window, but not component. Components are not user facing in the same way.

### Deleted source ruleset

- With no live tracking, if the **source ruleset is deleted**, the duplicated content stays and `moduleId` may point to a missing ruleset. Should the UI show something like “Source module no longer available” for that content, or do we not surface that?

Good point. Add a `modules` property to the ruleset table that just keeps track of the ID, name and image of the added module. That way, we can power some UI to remove the module content from the ruleset, even if it no longer exists.

---

## Notes

The **Spec summary** at the top of this document is the single source of truth for implementation. The sections above preserve the original Q&A for context.

---

## What’s needed for a phased implementation plan

No further decisions are required to draft the plan. The following are assumed:

- **Schema:** Dexie schema bump (`dbSchemaVersion`) and type updates in `data-model-types.ts`; add optional `moduleId`, `moduleEntityId`, `moduleName` where specified, and `modules` (+ optional `isModule`) on Ruleset; add indexes only where we query (e.g. `moduleId` for removal).
- **Reuse:** `duplicate-ruleset.ts` and import/export zip format (`use-export-ruleset.ts` / `use-import-ruleset.ts`) are the reference; module add is “duplicate into existing ruleset” with ID remapping, conflict handling, and module tracking. Zip metadata already has `metadata.ruleset.id` for moduleId when adding from file.
- **UI:** Ruleset settings live in `src/pages/settings/ruleset-settings.tsx`; the new “Modules” area will be added there (section or tab).
- **Skipped conflicts:** “Surface to the user” can be a simple post-add summary (e.g. toast or inline message: “Added module X; N items skipped (ID conflict).”) rather than a dedicated screen in the first phase.

---

## Phased implementation plan

### Phase 1: Schema, types, and add module from existing ruleset

**Goal:** User can add a module from an existing ruleset (with `isModule`) to the active ruleset and see it listed; no remove, no zip, no blue titles yet.

1. **Schema and types**
   - Add to Ruleset type: `isModule?: boolean`, `modules?: Array<{ id: string; name: string; image: string | null }>`.
   - Add to rulesets schema: `modules` (and `isModule` if we want to index “list rulesets that are modules”).
   - Add to attribute, action, item, chart, document, window, page, script types and schema: `moduleId?: string`, `moduleEntityId?: string`, `moduleName?: string`; add `moduleId` to schema for each table that has it (for “delete by moduleId” on remove).
   - Bump `dbSchemaVersion`.

2. **Core module-add logic**
   - Add `addModuleToRuleset(sourceRulesetId: string, targetRulesetId: string)` (or similar). Reuse/refactor logic from `duplicate-ruleset.ts`: same entity list and ID remapping, but (a) target ruleset already exists, (b) write `moduleId`, `moduleEntityId`, `moduleName` on duplicated entities (source = sourceRulesetId, moduleName = source ruleset title), (c) on ID conflict skip and record skipped entities, (d) on name conflict append `(<module name>)`, (e) append to `target.modules` the module’s id, name, image.
   - Ensure only rulesets with `isModule === true` can be added as modules (validation in UI and in API).

3. **Ruleset settings – Modules section**
   - In `RulesetSettings`, add a “Modules” section: list current `activeRuleset.modules` (by id/name/image); “Add module” that opens a picker of rulesets where `isModule === true` (exclude current ruleset and already-added); on confirm call `addModuleToRuleset`.
   - After add: show simple summary if any entities were skipped (ID conflict).

4. **Marking a ruleset as module**
   - Add a way to set `isModule` on a ruleset (e.g. checkbox in ruleset settings or in ruleset list). Required so users can “create a module” and then add it elsewhere.

**Out of scope for Phase 1:** Remove module, add from zip, re-import/refresh, blue titles, dangling-ref warning, deleted-source UI.

---

### Phase 2: Remove module and dangling-ref warning

**Goal:** User can remove a module from the ruleset; we delete all entities with that `moduleId` and warn if native content has dangling references.

1. **Dangling-ref detection**
   - Implement a function that, given a set of entity IDs about to be removed (by moduleId), checks the spec’s list (components: attributeId, data.conditionalRenderAttributeId, data.pageId, actionId, windowId, childWindowId; scripts: entityId; charts: assetId; documents: pdfAssetId, assetId; windows: pageId, assetId; attributes/actions/items: scriptId, assetId). Only consider references from entities that are **not** in the to-be-removed set (i.e. native ruleset content pointing at module content).
   - Return a structure suitable for display (e.g. “N attributes, M scripts reference removed content”).

2. **Remove module**
   - “Remove” action in the Modules section (per module in `activeRuleset.modules`). If module still in DB, can resolve by moduleId; if not (deleted source), use the stored id in `modules` to delete by `moduleId` on all tables.
   - Before delete: run dangling-ref check; show warning modal with summary; user confirms then delete all entities with that moduleId, remove entry from `ruleset.modules`, and optionally clean up ScriptErrors/Logs for removed scripts.

**Out of scope for Phase 2:** Add from zip, re-import, blue titles, skipped-conflict UI beyond Phase 1.

---

### Phase 3: Add module from zip

**Goal:** User can upload a ruleset zip (same format as export); we add its content as a module without creating a new ruleset. Require `metadata.ruleset.id` in zip.

1. **Import path for “add as module”**
   - Reuse zip parsing and validation from `use-import-ruleset.ts`. Validate `metadata.ruleset` and require `metadata.ruleset.id`; if missing, show error and abort.
   - Instead of creating a new ruleset and importing into it, run the same “add module content” logic as Phase 1 but with entity source from the zip (in-memory or temporary). Use `metadata.ruleset.id` as `moduleId`, `metadata.ruleset.title` as `moduleName`, and optionally `metadata.ruleset.image` for the `modules` entry. All duplicated entities get new IDs in the target ruleset; remap refs using the same ID maps as “add from existing ruleset.”

2. **UI**
   - In Modules section: “Add from file” (upload zip). On success, add to `ruleset.modules` and show same post-add summary as Phase 1 (including any skipped IDs).

**Out of scope for Phase 3:** Re-import/refresh from same module, blue titles.

---

### Phase 4: Re-import (refresh) and conflict reporting ✅ Implemented

**Goal:** Re-adding the same module overwrites its content (refresh). Clear reporting of skipped entities (ID conflicts).

1. **Re-import**
   - When adding a module: if `ruleset.modules` already contains this module id, treat as refresh: delete all entities with this `moduleId` (same as remove), then run add again. Optionally reuse remove logic (without removing from `ruleset.modules`). **Done:** `deleteModuleContentFromRuleset` in `remove-module-from-ruleset.ts`; `addModuleToRuleset` uses it when module already in list, then re-adds; module picker allows already-added modules (refresh).

2. **Conflict reporting**
   - Improve “skipped entities” UX: e.g. modal or expandable section listing “Skipped due to ID conflict: 2 attributes, 1 action” (and optionally which names/ids). Use the “keep track of skipped instances” from the spec. **Done:** `AddModuleResult.skippedDetails`; Dialog after add when skips exist lists entity types and id/title per skipped item.

**Out of scope for Phase 4:** Blue titles, deleted-source UI.

---

### Phase 5: Origin visibility and deleted-source UX

**Goal:** Module-origin content is visually distinct; deleted source is handled in the UI.

1. **Blue titles**
   - In attribute, action, item charts; charts index; document index; script index: when rendering a row/title for an entity that has `moduleId` (and optionally `moduleName`), apply blue color to the title. Use existing styling (e.g. Tailwind class).

2. **Deleted source**
   - In Modules section: for each entry in `ruleset.modules`, if the ruleset id no longer exists in DB, show “Source no longer available” (or similar) but still show “Remove module content” so user can clean up. Optional: same blue-title treatment can remain for orphaned module content until removed.

---

### Phase summary

| Phase | Deliverable |
|-------|-------------|
| 1 | Schema + types; add module from existing ruleset; Modules section in ruleset settings; mark ruleset as module |
| 2 | Remove module; dangling-ref warning |
| 3 | Add module from zip |
| 4 | Re-import = refresh; better conflict reporting |
| 5 | Blue titles for module content; deleted-source UI |
