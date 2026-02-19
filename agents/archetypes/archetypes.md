# Archetypes

Archetypes are templates to be added and removed from characters dynamically, altering them in some way. Characters can
have more than one archetype.

Archetypes can be associated with scripts that have `on_add()` and `on_remove()` events.

Archetype scripts can

- alter character attributes

Scripts can also check if a character has an archetype using `Owner.hasArchetype('Archetype name')`

Creating an archetype creates a testCharacter associated to that archetype in the ruleset. Creators can set which archetype character
is in context so they can build characterPages and alter characterAttributes. The test character is exported with the ruleset and becomes
the template for character creation of that ruleset. For example, when creating a character, I am prompted to choose an archetype. The new
character's characterAttributes, characterPages and inventoryItems are duplicated from that test character. There should also be a default
archetype test character.

---

## Implementation Planning Notes

### Current Codebase Context (discovered)

- **Character model**: `Character` has `rulesetId`, `isTestCharacter`, etc. No archetype linkage yet.
- **Test character**: One per ruleset (`isTestCharacter: true`). Used for script editor, sheet editor, page editor. Exported with ruleset as `characters.json`.
- **Character creation**: User selects name + ruleset. `bootstrapCharacterAttributes` copies all ruleset attributes with defaults. `bootstrapCharacterPagesAndWindows` copies ruleset pages/windows. Inventory items copied from test character (character-hooks).
- **Script system**: `Script` has `entityType: 'attribute' | 'action' | 'item' | 'global'`. No `archetype` type yet. `Owner` accessor has `Attribute`, `Action`, `Item`, `Items`, `hasItem`, etc. No `hasArchetype` yet.
- **Export/import**: Ruleset export includes one test character. Import handles characters array.

### Open Questions (for implementation plan)

1. **Default archetype**: Is there always exactly one "default" archetype per ruleset (e.g. "Base" or "Blank")? When a ruleset is created, does it auto-create a default archetype with its test character? What happens for rulesets that predate archetypes (migration)?

_answer_
There should be exactly one default archetype that should be auto created alongside a ruleset and given an `isDefault: true` property.

2. **Character creation when no archetypes**: If a ruleset has zero archetypes (e.g. during migration), does character creation fall back to current behavior (bootstrap from ruleset defaults + single test character)?

_answer_
If a ruleset has no default archetype, on opening a ruleset, create one using the current test character's characterAttributes, inventoryItems and characterWindows for duplication.

3. **Archetype selection in character creation**: When a ruleset has multiple archetypes, is archetype selection required? Or optional (default to first/default archetype)?

_answer_
Archetype selection is optional. If no archetype is selected, the character should get the default.

4. **Adding archetypes to existing characters**: Can a player add/remove archetypes from an existing character at runtime (during play)? Or only at creation? If at runtime, where in the UI—character sheet? A dedicated "Archetypes" panel?

_answer_
Players can add/remove archetypes to characters at runtime. It should be in a dedicatd archetypes panel.

5. **Test character ↔ archetype**: One test character per archetype? So `Character` gets `archetypeId: string | null` (null = legacy/test character not tied to archetype)? Or a new `Archetype` entity with `testCharacterId`?

_answer_
Characters can have multiple archetypes (test characters will only have one). Since it's a many to many relationship, we'll probably need a join table, CharacterArchetype.

6. **Context switching for creators**: "Set which archetype character is in context"—is this a dropdown in the ruleset editor header/sidebar (e.g. "Editing: [Warrior ▼]")? Does it affect script editor, page editor, window editor, and attribute defaults?

_answer_
The archetype switcher should be scope to when character context matters. That's when previewing a window or when editing a script (for viewing the associated attributes). For now, let's put a dropdown in the app sidebar that controls which character is loaded into character context based on the archetype selected.

7. **Script execution order**: If a character has multiple archetypes and each has `on_add()` that alters attributes, what order do they run? Creation order? Archetype definition order? Does order matter for conflicts?

_answer_
Users will need to be able to dictate the run order. From the archetype panel and when adding archetypes during character creation, they should be able to drag to reorder, which then determines the order of script firing.

8. **Export format**: Currently `characters.json` has one test character. With archetypes, multiple test characters (one per archetype). Is that the only change, or do we need `archetypes.json` / new TSV for archetype metadata?

_answer_
We'll need an `archetypes.json` file similar to charts. Archetypes do not need to be captured as a TSV.

9. **Character–archetype storage**: Join table `CharacterArchetype` (characterId, archetypeId)? Or `characterArchetypeIds: string[]` on Character? Consider query patterns (which characters have archetype X, which archetypes does character Y have).

_answer_
Use a join table

10. **Archetype metadata**: What does an Archetype entity contain? Name, description, scriptId, testCharacterId? Anything else (image, sort order)?

_answer_

```
type Archetype = {
  name: string;
  description: string (markdonw);
  assetId?: string;
  image?: string (hook into assetInjection middleware)
  scriptId?: string;
}

type CharacterArchetype = {
  characterId: string;
  archetypeId: string;
  loadOrder: number;
}
```

### Follow-up Questions

1. **Archetype schema**: The Archetype type doesn't include `rulesetId` or `testCharacterId`. Should we add these? (Archetypes belong to rulesets; each archetype has one test character.)

_answer_
Yes, it should have `rulesetId` and `testCharacterId`.

2. **CharacterWindows in creation**: The spec lists characterAttributes, characterPages, inventoryItems. What about characterWindows? When creating a character from an archetype template, do we also duplicate the archetype's test character's windows?

_answer_
Yes. All entities associated to a character should be able to be captured in an archetype's testCharacter.

3. **New ruleset flow**: When creating a brand new ruleset, we auto-create the default archetype. Does that archetype get a test character created immediately (bootstrapped from ruleset defaults), or is there a different flow?

_answer_
Yes, it gets a test character immediately with a characterAttribute for each ruleset attribute, similar to the current test character flow.

4. **BaseDetails**: Should Archetype and CharacterArchetype extend BaseDetails (id, createdAt, updatedAt)?

_answer_
Yes

5. **Archetype display order**: Is there a sort order for archetypes themselves (e.g. display order in the archetype picker/panel)? Or is order implicit (e.g. default first, then by name)?

_answer_
Yes, let's make sort order explicit on the Archetype model and overridable with the CharacterArchetype sort order. So the UI for managing archetypes in a ruleset should also feature a sortable list that dictates default load order.

6. **Archetype deletion**: If an archetype is deleted, what happens to (a) its test character, and (b) CharacterArchetype rows (characters that had that archetype)? Cascade delete? Orphan handling?

_answer_
An archetype's test character should be deleted with its archetype. Delete CharacterArchetype rows when either the character or the archetype are deleted. Characters and scripts should not be deleted when archetypes are deleted.

7. **Modules**: When a ruleset is imported as a module, do archetypes (and their test characters) come with it?

_answer_
Yes. Archetypes should be included in module imports.

### Final Follow-ups

1. **Archetype.loadOrder**: Add `loadOrder: number` to the Archetype type? (Implied yes from Q5.)
   _answer_
   Yes

2. **Default archetype name**: What should the default archetype be named? (e.g. "Base", "Default", "Blank")
   _answer_
   "Default"

3. **Archetypes panel location**: Where does the "dedicated archetypes panel" live? Within the character sheet view (e.g. sidebar tab, collapsible panel)? Or a separate route?
   _answer_
   That should be in a sidebar option that opens a panel only when on `/character` routes. Same patter as the CharacterInventoryPanel.

4. **Attribute scripts after creation**: After duplicating from an archetype's test character and running on_add(), do we still need to run the initial attribute script sync (runInitialAttributeSync) so attribute scripts compute derived values correctly?
   _answer_
   Yes. `runInitialAttributeSync` should occur first, then each archetype on_add script should fire in loadOrder.

---

## Implementation Plan

### Phase 1: Data Model & Schema

1. **Add Archetype type** (in `src/types/data-model-types.ts`):
   - `id`, `createdAt`, `updatedAt` (BaseDetails)
   - `rulesetId`, `name`, `description`, `assetId?`, `image?`, `scriptId?`, `testCharacterId`, `isDefault`, `loadOrder`

2. **Add CharacterArchetype type** (join table):
   - `id`, `createdAt`, `updatedAt`
   - `characterId`, `archetypeId`, `loadOrder`

3. **DB schema** (`src/stores/db/schema.ts`):
   - `archetypes` table (indexed by rulesetId)
   - `characterArchetypes` table (indexed by characterId, archetypeId; compound for uniqueness)

4. **Script entityType**: Extend to `'attribute' | 'action' | 'item' | 'archetype' | 'global'`

### Phase 2: Migration & Default Archetype

5. **Ruleset creation hook**: When a ruleset is created, auto-create default archetype ("Default", isDefault: true, loadOrder: 0) and its test character (bootstrap characterAttributes from ruleset, create inventory, pages/windows per current flow).

6. **Migration on ruleset open**: If ruleset has no archetypes, create default archetype linked to existing test character (use current test character's data; no duplication needed—just create Archetype record with testCharacterId pointing to it).

### Phase 3: Character Creation Refactor

7. **Character creation flow**:
   - Add optional `archetypeId` to createCharacter payload; if omitted, use default archetype
   - Replace bootstrap with duplication from archetype's test character: characterAttributes, characterPages, characterWindows, inventoryItems
   - Add CharacterArchetype row (characterId, archetypeId, loadOrder: 0)
   - Create inventory (hook or explicit); populate from test character's inventory
   - Run `runInitialAttributeSync`, then archetype's `on_add()` script in loadOrder
   - Refactor/remove inventory copy from character-hooks (duplication happens in createCharacter)

8. **Create character dialog**: Add optional archetype selector (dropdown; default archetype pre-selected or shown as default).

### Phase 4: Script System

9. **Owner.hasArchetype(name)**: Add to OwnerAccessor; query CharacterArchetype join + Archetype by name.

10. **Archetype scripts**: Add `entityType: 'archetype'`; scripts have `on_add()` and `on_remove()` handlers. Wire EventHandlerExecutor or equivalent to invoke these when archetype added/removed.

11. **Script templates**: Add archetype template with on_add/on_remove stubs.

12. **Script hooks**: When archetype deleted, clear scriptId from Script if script was attached; do not delete script.

### Phase 5: Creator Experience

13. **Archetype switcher**: Dropdown in app sidebar; controls which archetype's test character is in "character context". Visible when character context matters (ruleset editor: script editor, window preview). Store selected archetypeId in state (e.g. Zustand or context).

14. **Ruleset hooks / useRulesets**: Change `testCharacter` to resolve from selected archetype (or default). `useActiveRuleset` / `useRulesets` returns test character for current archetype selection.

15. **Archetype management UI** (ruleset editor): CRUD for archetypes; sortable list (drag to reorder loadOrder); create archetype → create test character, link. Delete archetype → cascade delete test character, CharacterArchetype rows.

16. **Character pages/windows/attributes**: When building in ruleset editor, use the archetype's test character (from context switcher).

### Phase 6: Player Experience

17. **Archetypes panel**: Sidebar option (like CharacterInventoryPanel) visible only on `/characters/:id` routes. List character's archetypes; add/remove; drag to reorder (updates loadOrder). On add: run `on_add()`. On remove: run `on_remove()`.

18. **Add archetype flow**: Modal or inline picker to choose archetype; add CharacterArchetype with loadOrder = max+1; run on_add().

### Phase 7: Export/Import

19. **Export**: Add `archetypes.json` (archetype metadata); `characters.json` includes all test characters (one per archetype). Preserve archetype ↔ test character linkage.

20. **Import**: Parse archetypes.json; create Archetype records; import characters; link archetypes to test characters. Handle migration (no archetypes → create default from first test character).

21. **Module import**: Include archetypes and their test characters when adding module to ruleset.

### Phase 8: Cleanup & Edge Cases

22. **Character deletion**: Cascade delete CharacterArchetype rows (DB hook).

23. **Archetype deletion**: Cascade delete test character, CharacterArchetype rows. Do not delete characters or scripts.

24. **Dependency graph**: Add archetype scripts to dependency graph if needed for analysis.

25. **Tests**: E2E for character creation with archetype, add/remove archetype at runtime, export/import with archetypes.
