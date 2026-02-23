I want to make a new model called CustomProperty.

```ts
type CustomProperty = {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  category?: string;
  defaultValue?: string | number | boolean; // optional in UI; when absent, use '', 0, or false by type
};

type ArchetypeCustomProperty = {
  id: string;
  archetypeId: string;
  customPropertyId: string;
};

type ItemCustomProperty = {
  id: string;
  itemId: string;
  customPropertyId: string;
};
```

Archetype properties will be managed through a UI on the archetypes page. Item properties will be managed through a UI on the items page.

Note: this will replace the customProperties field on Item, but not the one on the InventoryItem. When an inventory item is created, its customProperties object is instantiated from its items' ItemCustomProperties.

We need to make sure the item-instance-proxy's customProperty getters and setters remain intact.

For characters, when a character is created, it should get a customProperties object instantiated from its first archetype's ArchetypeCustomProperties.

We'll need a way through the character accessor to read and write the customer properties for a character.

Ask me any questions you have so far.

---

## Questions

**CustomProperty model**

- Should `CustomProperty` be ruleset-scoped (each ruleset has its own set of custom properties)?
- Can the same `CustomProperty` be used by multiple archetypes or items, or is it always one-to-one?

It should be ruleset scoped and reusable.

**ArchetypeCustomProperty**

- For "first archetype," is that the archetype chosen at character creation, or is there a specific ordering/priority?
- Can a character have multiple archetypes? If so, how do we merge or prioritize their custom properties?

First archetype is chosen at character creation using the archetype.loadOrder property (ignoring the default archetype for customProperty creation)
A character can have multiple, but the customProperties object should only be created at character creation from the first archetype.

**ItemCustomProperty**

- Can an item have multiple custom properties?
- For items with multiple ItemCustomProperties, should the inventory item's `customProperties` be a union of all of them?

An inventoryItem will only have a single customProperties object containing all of the ItemCustomProperty values. For example:

shirt: Item
size: ItemCustomProperty
color: ItemCustomProperty

myShirt: InventoryItem
myShirt.customProperties => {size: 10, color: 'red'}

**Values and storage**

- Where are the actual values stored? For example, for a character with `CustomProperty` "Level" (number), where does the value live?
- Is the intent that `customProperties` on `InventoryItem` and on the character are keyed by `customPropertyId` (or similar)?

A customProperties JSON object will live directoy on the `InventoryItem` and `Character` models. These are simple key:value stores using
the CustomProperty label as the key. We should enforce unqiueness on label+rulesetId.

**Migration**

- For existing items with `customProperties`, how should we migrate them into `ItemCustomProperty` + `CustomProperty`?
- For existing characters, how should we backfill their `customProperties` from archetypes?

There is no need to backfill. Existing items, inventoryItems and characters can remain.

**UI**

- For archetypes and items, do you want inline editing (e.g. in the archetype/item form) or a separate "manage custom properties" section?

I want a manage custom properties modal on both the archetype and items page. There is an existing modal called BulkCustomProperties we can refactor for this.

---

## Follow-up questions

**Character archetype changes**

- If a character's archetypes change after creation (e.g., they add a second archetype), do we ever update their `customProperties`? Or is it frozen at creation?

No. It is frozen at creation.

**Label as key**

- Using label as the key means if someone renames a CustomProperty, existing Character/InventoryItem values would be orphaned. Is that acceptable, or should we consider keying by `customPropertyId` for durability?

Ok, let's key by `customPropertyId`. That means we'll need to do a lookup in character-accessor and itemInstanceProxy because the script syntax is `item.getProperty(<property name>)`. It's ok to just return the first match in this lookup.

**Manage custom properties modal**

- Should the modal allow creating new CustomProperties from scratch, or only selecting from existing ruleset CustomProperties (or both)?
  Both. There should be a look up of existing custom properties from which to make archetype custom properties or item custom properties. Or, when creating a new of either, create a CustomProperty first under the hood.

**Default archetype**

- When you say "ignoring the default archetype for customProperty creation" — does that mean the default archetype is excluded when picking the "first" archetype by loadOrder? (e.g., if loadOrder is [default, fighter, mage], we'd use fighter?)

Yes. The default archetype (`isDefault == true`) is always loadOrder 0. Skip this one when creating customProperties.

---

## Follow-up questions (round 2)

**Default values**

- When we instantiate `customProperties` from ArchetypeCustomProperties or ItemCustomProperties at creation time, do we initialize with default values (e.g., `''` for string, `0` for number, `false` for boolean), or leave keys absent until the user sets them?

Let's add a `defaultValue` field on the CustomProperty model. In the UI, it will be optional. When creating a CustomProperty when no default is provided, use `''`, `0` and `false`.

---

## Implementation Plan

### Phase 1: Data model and schema

1. **Add types** (`src/types/data-model-types.ts`)
   - Add `CustomProperty`, `ArchetypeCustomProperty`, `ItemCustomProperty` types (as in spec)
   - Add `customProperties?: Record<string, string | number | boolean>` to `Character` (keyed by `customPropertyId`)
   - Update `InventoryItem.customProperties` type comment to note it's keyed by `customPropertyId`
   - Mark `customProperties` on `Item` as `@deprecated` (kept for backward compatibility until Phase 8)

2. **Add Dexie schema** (`src/stores/db/schema.ts`, `src/stores/db/db.ts`)
   - Add tables: `customProperties`, `archetypeCustomProperties`, `itemCustomProperties`
   - Indexes: `customProperties` by `rulesetId`; `archetypeCustomProperties` by `archetypeId`; `itemCustomProperties` by `itemId`
   - Add unique compound index `[rulesetId+label]` on `customProperties` for uniqueness enforcement
   - Bump schema version and add migration

3. **Create hooks** (`src/stores/db/hooks/`)
   - `use-custom-properties.ts` – CRUD for CustomProperty by rulesetId
   - `use-archetype-custom-properties.ts` – CRUD for ArchetypeCustomProperty by archetypeId
   - `use-item-custom-properties.ts` – CRUD for ItemCustomProperty by itemId
   - Wire into `db-hooks.ts` if needed

### Phase 2: Character creation – instantiate customProperties

4. **Update character creation** (`src/lib/compass-api/hooks/characters/use-character.ts`)
   - After creating character and before/after `duplicateCharacterFromTemplate`:
     - Find first non-default archetype: filter `archetypeRecords` where `!a.isDefault`, take first by loadOrder
     - If none, skip (character gets empty `customProperties`)
     - Fetch `ArchetypeCustomProperties` for that archetype
     - Fetch `CustomProperty` records for those IDs
     - Build `customProperties` object: `{ [customPropertyId]: cp.defaultValue ?? getTypeDefault(cp.type) }`
     - `db.characters.update(characterId, { customProperties })`

5. **Add `customProperties` to Character** – ensure it is persisted (Character type already updated in Phase 1; verify db schema includes it if stored as JSON)

### Phase 3: Inventory item creation – instantiate customProperties

6. **Update `addInventoryItem`** (`src/lib/compass-api/hooks/characters/use-inventory.ts` or wherever inventory items are added)
   - When adding an item (type `'item'`), before `db.inventoryItems.add`:
     - Fetch `ItemCustomProperties` for `entityId` (the item id)
     - Fetch `CustomProperty` records for those IDs
     - Build `customProperties`: `{ [customPropertyId]: cp.defaultValue ?? getTypeDefault(cp.type) }`
     - Include `customProperties` in the new InventoryItem

7. **Update `duplicateCharacterFromTemplate`** (`src/utils/duplicate-character-from-template.ts`)
   - No change needed – copies inventory items as-is; their `customProperties` were set when they were originally added to the template character

### Phase 4: Script runtime – item instance proxy

8. **Update ItemInstanceProxy** (`src/lib/compass-logic/runtime/proxies/item-instance-proxy.ts`)
   - `getCustomProperty(name: string)` currently reads from `inventoryItem.customProperties?.[name]` and `item.customProperties?.[name]`
   - New behavior: `customProperties` is keyed by `customPropertyId`
   - Proxy needs access to ruleset `CustomProperty` records (or a lookup fn) to resolve `name` (label) → `customPropertyId`
   - Lookup: find CustomProperty with `label === name` in ruleset → get `customPropertyId` → return `inventoryItem.customProperties?.[customPropertyId]`
   - Remove fallback to `item.customProperties` (Item no longer has it)
   - `toStructuredCloneSafe()`: merge instance `customProperties` with resolved labels for clone (or keep id-keyed for consistency)
   - `createItemInstanceProxy` and `onSetCustomProperty`: when setting, need to resolve label → id; store under `customProperties[customPropertyId]`

9. **Script runner / accessor wiring**
   - ScriptRunner must load `CustomProperty` records for the ruleset and pass a lookup (or the cache) into `createItemInstanceProxy` / CharacterAccessor
   - Add `customPropertiesCache: Map<string, CustomProperty>` (or similar) to ScriptRunner
   - Pass lookup helper into CharacterAccessor and into `createItemInstanceProxy` when building `Item()` / `Items()` proxies

### Phase 5: Script runtime – character accessor

10. **Add character custom property access** (`src/lib/compass-logic/runtime/accessors/character-accessor.ts`)
    - Add `getProperty(name: string)` and `setProperty(name: string, value)` (or equivalent)
    - CharacterAccessor needs: `characterCustomProperties`, `customPropertiesCache` (or lookup)
    - Lookup: find CustomProperty by label → get id → read/write `character.customProperties[customPropertyId]`
    - For `setProperty`: persist via `pendingUpdates` (e.g. `characterUpdate:${characterId}` with `{ customProperties }`)
    - ScriptRunner must load Character (or at least `customProperties`) and pass into CharacterAccessor constructor

11. **Flush character updates** (`src/lib/compass-logic/runtime/script-runner.ts`)
    - In `flushCache()`, handle `characterUpdate:${id}` to call `db.characters.update(id, { customProperties })`

### Phase 6: Ruleset accessor and Item definition

12. **Update RulesetAccessor / ItemDefinitionProxy** (`src/lib/compass-logic/runtime/accessors/ruleset-accessor.ts`)
    - `ItemDefinitionProxy.customProperties` currently returns `this.item.customProperties`
    - Remove or change: Item no longer has `customProperties`
    - If scripts need item-level “default” custom props, derive from ItemCustomProperties + CustomProperty defaults (or document that item definition customProperties are gone; instance-only)

### Phase 7: UI – manage custom properties modals

13. **Refactor BulkCustomProperties** (`src/pages/ruleset/items/bulk-custom-properties.tsx`)
    - Current: bulk-apply a set of key/type/value to multiple items (replaces item.customProperties)
    - New: “Manage custom properties” modal for items page
    - Allow: (a) create new CustomProperty (label, type, category, defaultValue), (b) select existing CustomProperty from ruleset
    - For each item (or selected items): add/remove ItemCustomProperty links
    - Remove bulk “apply same set to all” in favor of per-item or multi-select assignment
    - Consider keeping a “add to selected items” flow: select items, add CustomProperty links to all

14. **Create ArchetypeCustomPropertiesModal** (new component)
    - Similar to items modal: create/select CustomProperty, assign to archetype
    - Add trigger on archetypes page (e.g. per-archetype card or page-level “Manage custom properties”)
    - Reuse shared logic: CustomProperty picker/create, list of assigned properties

15. **Wire modals into pages**
    - Items page: replace or augment `BulkCustomProperties` with new modal; ensure items page has a way to open it (e.g. per-item or page-level button)
    - Archetypes page: add “Manage custom properties” entry point (e.g. on `ArchetypeCard` or in header)

### Phase 8: Import/export and cleanup ✅

16. **Import/export**
    - Update ruleset import/export to include `customProperties`, `archetypeCustomProperties`, `itemCustomProperties`
    - Ensure `use-import-ruleset.ts`, `use-export-ruleset.ts`, and related hooks handle new tables

17. **Remove Item.customProperties usage**
    - Audit codebase for `item.customProperties`; remove or replace with ItemCustomProperty + CustomProperty lookup
    - Update `use-inventory.ts` `inventoryItemsWithImages`: `customProperties` should come from `inventoryItem.customProperties` (and optionally resolve labels for display); no longer from `itemRef?.customProperties`

### Phase 9: Testing and edge cases

18. **Edge cases**
    - Character with no non-default archetype: `customProperties = {}`
    - Item with no ItemCustomProperties: `customProperties = {}` on InventoryItem
    - `getProperty('unknown')`: return undefined (or first match if multiple labels – spec says “first match”)
    - Ensure `characterUpdate` flush runs when scripts call `Owner.setProperty(...)`

### Helper

- **`getTypeDefault(type: 'string' | 'number' | 'boolean')`**: return `''`, `0`, or `false`
- **`resolveCustomPropertyId(customProperties: CustomProperty[], label: string): string | undefined`**: find by label, return id
