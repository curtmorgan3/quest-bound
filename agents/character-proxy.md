# Character Proxy and Tile.character / Tile.characters

## Goal

- **Tile.character**: The character on this tile (campaign character whose `currentTileId` equals this tile’s id). Single Character proxy or undefined when none.
- **Tile.characters**: All characters in this tile’s location (campaign characters where `currentLocationId === tile.locationId`). Array of Character proxies. Owner and Target are included when they are in the same location.
- Each Character proxy has the same API as Owner: `.Attribute(name)`, `.Item(name)`, `.Items(name)`, `.name`, `.location`, `.Tile`, `.Action(name)`, `.hasArchetype`, `.archetypes`, `.addArchetype`, `.removeArchetype`, inventory methods, etc.
- Owner (and Target) should be modeled as a specific Character, i.e. Owner inherits from a shared Character/accessor base so there is one implementation of the character API.

## Scope (current iteration)

- Only add **Tile.character** and **Tile.characters**.
- Defer **Tile.charactersWithin(radius)** and any other Tile methods.
- Apply **Tile.character** / **Tile.characters** whenever the script runner has **campaign context and a tile tied to a location**: (1) **Self.Tile** in campaign event scripts (event’s locationId/tileId), (2) **Owner.Tile** when in campaign context and the owner has currentLocationId/currentTileId (same as today’s Owner.Tile x,y). So both Self.Tile and Owner.Tile get character/characters when we have the relevant location loaded.

---

## Plan

### 1. Introduce a base Character accessor

- **New class** (e.g. `CharacterAccessor` or `BaseCharacterAccessor`) in `src/lib/compass-logic/runtime/accessors/`.
- It holds everything the current `OwnerAccessor` uses per character:
  - `characterId`, `characterName`, `inventoryId`, `inventoryItems`, `archetypeNames`, `locationName`, `currentTile` (coordinates or null).
  - Shared refs: `db`, `pendingUpdates`, `characterAttributesCache`, `attributesCache`, `actionsCache`, `itemsCache`.
- All current Owner behavior (Attribute, Item, Items, name, location, Tile, Action, hasArchetype, archetypes, add/removeArchetype, inventory add/remove/set) lives on this base and operates using `this.characterId` and the per-character data above.
- **Optional** constructor args: `targetId`, `executeActionEvent`. Owner passes them; Character instances from Tile pass `executeActionEvent` (so they can run actions as that character) and `targetId: null` for now. So `.Action('Y').activate()` is supported on any Character; Target in that action’s context is left undefined for now.
- **OwnerAccessor** becomes a subclass of this base: passes owner’s id and caches, plus `targetId` and `executeActionEvent`; overrides or adds `toStructuredCloneSafe()` for Owner.
- **TargetAccessor** remains a subclass of OwnerAccessor (or of the base, with same constructor shape as today) so Target is “another character” with the same API.

### 2. Loading: all characters in the location when Self is campaign event location

- In **ScriptRunner.loadCache()**, we need location characters in two cases (so we can attach character/characters to Tile):
  - **When we have campaign event location context**: `campaignEventLocationCache` has `locationId`, `tileId`. Load all campaign characters in that location (see below).
  - **When we have campaign context and owner has a location**: `context.campaignId` and owner’s campaign character has `currentLocationId` (and optionally `currentTileId`). Load all campaign characters in that location so Owner.Tile can expose character/characters.
- For **each** location we need (event location and/or owner’s current location), query **campaign characters**:  
  `campaignCharacters.where([campaignId, currentLocationId]).equals([context.campaignId, locationId])` (DB order).
  - For **each** such campaign character (no limit for now):
    - Load **Character** (name, inventoryId).
    - Load **characterAttributes** for that characterId and merge into the shared `characterAttributesCache` (keyed by characterAttribute id).
    - Load **inventoryItems** for that character’s inventoryId; store in a per-character structure (e.g. `Map<characterId, InventoryItem[]>`).
    - Load **archetype names** (CharacterArchetypes + Archetype) into a per-character Set (e.g. `Map<characterId, Set<string>>`).
    - Keep a **location characters index**: list of `{ characterId, campaignCharacter (currentTileId, etc.) }` for the location.
- **Unified list**: Build a **single** list of Character accessors per location (one list per location we load). Owner and Target are **not** loaded separately first; when building “location characters” for a location, include owner and target when their `currentLocationId` matches. So we have one `locationCharacterData` (or equivalent) per location, and when we need the **Owner** accessor we use the Character accessor from that list for `ownerId` (same instance as in Tile.characters). Same for Target. So one place builds the Character accessor per characterId; Owner and Target are just the entries for ownerId and targetId from the relevant location’s list (or standalone if they’re not in any loaded location).
- Order of **Tile.characters**: use **order returned by DB**.

### 3. Per-character data structures in ScriptRunner

- Today: `ownerInventoryItems`, `targetInventoryItems`, `ownerArchetypeNames`, `targetArchetypeNames`, and a single `characterAttributesCache` that already supports multiple characterIds (owner + target).
- Add:
  - **locationCharacterData**: `Map<string, LocationCharacterData>` keyed by characterId, where `LocationCharacterData` = `{ characterName, inventoryId, inventoryItems, archetypeNames, currentTileId?, ... }` for each character in the event’s location. Populated when loading campaign event location + all campaign characters in that location.
  - When building Owner/Target, we can either keep the existing dedicated fields for owner/target or derive them from this map when characterId is ownerId/targetId; plan can choose “merge into same structure” or “owner/target stay separate, location chars in map.”
- Shared **characterAttributesCache** continues to hold character attributes for owner, target, and all location characters (all keyed by characterAttribute id); each Character accessor filters by `characterId` when resolving `.Attribute(name)`.

### 4. Tile proxy: context for character and characters

- **TileProxy** today: only `(x, y)` and getters `x`, `y`.
- For **Self.Tile** (campaign event location), Tile needs:
  - `locationId` (from campaign event location).
  - `tileId` (from campaign event location).
  - A way to resolve:
    - **character on this tile**: campaign character(s) where `currentLocationId === locationId` and `currentTileId === tileId`.
    - **all characters in location**: campaign characters where `currentLocationId === locationId`.
- Options:
  - **A)** TileProxy holds `(x, y, locationId, tileId)` and a **reference to a “location character list”** (e.g. array of Character accessors) that ScriptRunner builds once; Tile.character / Tile.characters are getters that filter that list (by tileId for character, or return full list for characters).
  - **B)** TileProxy holds pre-resolved `character: CharacterAccessor | undefined` and `characters: CharacterAccessor[]` (ScriptRunner builds these when building Self).
- Recommendation: **B** — ScriptRunner builds the array of Character accessors for the location and the single “character on this tile” (if any), and passes them into TileProxy so Tile has no dependency on campaign/location queries at access time. TileProxy stays a simple value object: `(x, y, character?, characters)`.

### 5. TileProxy API (this iteration)

- **Tile.character**: `CharacterAccessor | undefined`. Undefined when no character has `currentTileId === this.tileId`. When multiple characters are on the same tile: **return the first in array order** (same order as Tile.characters).
- **Tile.characters**: `CharacterAccessor[]`. All characters in the location (including Owner and Target when in that location). **Order: as returned by DB.**

### 6. Where Tile gets character context

- **Self.Tile** (campaign event location): after loading the event’s location and all its characters, build the unified Character accessors for that location, then build TileProxy with `character` (first character on this tile, if any) and `characters` (all, DB order). Pass this TileProxy into `Self.Tile`.
- **Owner.Tile** (campaign context, owner has currentLocationId/currentTileId): when we load the owner’s current location and all characters in that location (for Owner.Tile), build the unified Character accessors; Owner is the accessor for ownerId from that list. Build TileProxy for the owner’s tile with `character` and `characters` and use it for Owner.Tile. So Owner.Tile also gets character/characters when in campaign with a location.
- If we’re in campaign but owner has no currentLocationId (or we’re not in campaign), Owner.Tile stays (x, y) only; no character/characters.

### 7. toStructuredCloneSafe

- Character accessor (base): implement a serializable representation (e.g. `{ __type: 'Character', name, location }`) so script return/log can cross the worker boundary.
- TileProxy: extend so that when it has `character` / `characters`, those are serialized via their `toStructuredCloneSafe()` in the clone (or omit if not needed for log/return).

---

## Follow-up questions

1. **Tile.character when multiple characters on the same tile**  
   If two or more campaign characters have `currentTileId === Self.Tile.tileId`, should `Tile.character` return the first (e.g. by character id or array order), or should it be undefined and scripts must use `Tile.characters` and filter by tile?

   **Answer:** Return the first in array order.

2. **Order of Tile.characters**  
   How should the array be ordered? (e.g. by character name, by characterId, by order returned from DB, or “arbitrary but stable.”)

   **Answer:** Order returned by DB.

3. **pendingUpdates and Tile characters**  
   When a Character proxy from Tile.characters mutates (e.g. `.Attribute('HP').set(5)` or `addItem`), those updates go into the shared `pendingUpdates` map keyed by characterAttribute id / inventory keys. Flush already applies by id. Confirm: we’re okay with all location characters sharing the same `pendingUpdates` and flush applying all of them at the end of the script run.

   **Answer:** Yes.

4. **Action() on Tile characters**  
   Should `char.Attribute('X')` / `char.addItem(...)` be the only supported mutations, and `char.Action('Y').activate()` be disabled (or throw) for characters that aren’t Owner/Target, or do we want to support running actions as that character (and if so, who is “Target” in that action’s context)?

   **Answer:** We want to support running actions as that character. Leave the Target undefined for now.

5. **Owner/Target in locationCharacterData**  
   Should we explicitly merge Owner and Target into the same `locationCharacterData` (or equivalent list) when their `currentLocationId` matches the event’s location, so we build one consistent list of Character accessors and Owner is literally one of those instances (same reference as the global Owner), or is it acceptable that Owner and “Owner’s entry in Tile.characters” are two different Character accessor instances pointing at the same characterId?

   **Answer:** We should explicitly merge Owner and Target into the same locationCharacterData list so there is only one list. Unify: single place builds the Character accessor per characterId; Owner (and Target) are the same instance as the entry in Tile.characters when they’re in that location.

---

## Follow-ups from implementer (answered above)

(Answers inlined in the Follow-up questions section.)

---

## Your follow-up questions (answered)

**Q: If we defer the loading of the character data, doesn’t that mean the accessor must execute an async db query? If so, how does the script runner handle that such that the execution of the script is synchronous?**

**A:** Yes. If we deferred loading until first access (e.g. first time `Tile.characters` is read), the accessor would need to perform an async DB query. The script runner and evaluator today are **synchronous**: the script runs in one sync run. So we **do not** defer. We load all required character data **up front** in `loadCache()` (which is async and runs **before** the script executes). By the time the script runs, every Character accessor and Tile’s character/characters are backed by already-loaded data. Script execution stays synchronous; no async in the middle of the script. Lazy loading would require either async accessors (e.g. `Tile.characters` returning a Promise) or an async script execution model (e.g. top-level await), which would be a larger change.

**Q: Double check [Tile.character/characters] – today Owner.Tile works in action events given campaign context is loaded. This should be accessible any time the script runner has campaign context, not just in campaign event types.**

**A:** Correct. The plan is updated: **Tile.character** and **Tile.characters** are available whenever we have **campaign context and a tile that is tied to a location** — i.e. (1) **Self.Tile** when the script is running in campaign event location context (event’s location), and (2) **Owner.Tile** when the script has campaign context and the owner has `currentLocationId` / `currentTileId` (e.g. action events, attribute change, etc. in campaign). So we load location characters for both the event location (when applicable) and the owner’s current location (when in campaign and owner has a location), and attach character/characters to both Self.Tile and Owner.Tile as appropriate.

---

## Concerns with this strategy

1. **Memory and load time**  
   Loading every character in the location (with attributes, inventory, archetypes) up front can be heavy for locations with many characters. No limit today means a single script run could pull a lot of data. Consider adding a limit or lazy-loading in a future iteration if we see large locations.

   (Answered in “Your follow-up questions” above: we do not defer; we load up front in loadCache() so script execution stays synchronous.)

2. **Cache key collisions**  
   `characterAttributesCache` is keyed by characterAttribute id, so multiple characters’ attributes coexist. That’s already true for owner + target. With N location characters we must ensure we never overwrite or confuse which character an attribute belongs to when resolving `.Attribute(name)` (filter by `characterId`). Same for `pendingUpdates`: keys must remain unique and correctly tied to the right character when flushing.

3. **Owner vs Tile.characters[i]**  
   If we don’t unify (Owner being the same object as the “owner” entry in Tile.characters), then Owner and the Character proxy for the same character in Tile.characters are two instances. Mutations (e.g. attribute set) would both update the same underlying cache and pendingUpdates, so behavior is consistent, but identity (e.g. `Owner === Self.Tile.characters[i]`) would be false. If we unify (Owner is one of the Character accessors in the list), we need a single place that builds “the” Character accessor per characterId and reuses it for Owner, Target, and Tile.characters.

   We should unify and have a single place that builds the character accessor.

4. **When Tile has character context**  
   Plan updated: Tile.character / Tile.characters are available whenever the script runner has campaign context and a tile tied to a location — Self.Tile (event location) and Owner.Tile (owner’s current location when in campaign). Document so script authors know it works in action events, campaign events, etc., when in campaign.

5. **Structured clone and cycles**  
   If Tile has character and characters, and Character has Tile, cloning for postMessage could create cycles. Ensure toStructuredCloneSafe for Tile and Character produce plain DAGs (e.g. Tile serializes to `{ x, y, character: character?.toStructuredCloneSafe(), characters: array map }` without re-attaching parent references).

6. **Ruleset and campaign scope**  
   Location characters are campaign characters in the same campaign; they all use the same ruleset (campaign.rulesetId). We assume all of them have character data (Character, character attributes, inventory) compatible with that ruleset. Characters from other rulesets or without the right data could cause missing attributes/items; we may want defensive handling or validation when building Character accessors.
