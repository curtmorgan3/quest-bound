# Phase 8: Player experience (later)

**Goal:** Players can enter a world with a character, view their current location (grid with characters, items, and tile actions), move between locations, and interact with tiles (run actions, view items/characters). Easy navigation between character sheet and location view. This phase is documented for later implementation; not part of the initial creator-focused v1.

**Depends on:** All previous phases. Character and location data are in place; world and location editors exist for creators.

**Reference:** [locations.md](./locations.md), [worlds-plan.md](./worlds-plan.md). Player experience is described in locations.md under "Player Experience."

---

## Overview (for future implementation)

### 8.1 Enter world and set character location

- Entry point: from character sheet or home, "Enter world" (or similar) with a character. Set character's worldId, locationId, tileId to a default or chosen location/tile (e.g. first location in world, or a "spawn" location).
- Persist so the character "remembers" position across sessions.

### 8.2 Location viewer (player)

- Route or view: show current location grid in a read-only or movement-enabled mode. Render characters (including other players in the future) and items on tiles; show tile actions (e.g. clickable).
- Click tile: if it has an actionId → run the action (e.g. trigger ruleset action). If it has an item (LocationItem) → show item details or interaction. If it has a character → show character or interaction option.
- Design for single-player first; data model should not prevent future sync of other players' positions.

### 8.3 Navigation between locations

- Allow moving the character to another location (e.g. list of child locations, or "exits" defined on tiles/locations). Update character's locationId and tileId.
- May require defining "exits" or links from one location to another (could be a tile action or a location-level property; to be designed).

### 8.4 Link to character sheet

- Easy link from location view to `/characters/:characterId` and back (e.g. "Open character sheet" / "Back to location").

---

## Tasks (when implementing)

| Area | Tasks |
|------|--------|
| **Enter world** | Entry UI (e.g. from character card or sheet). Select world and starting location/tile; set character.worldId, locationId, tileId. Persist. |
| **Location viewer** | New route or view (e.g. `/characters/:characterId/location` or `/worlds/:worldId/play`). Load character's current location and world; render grid, tiles, characters, items. Resolve actions from actionId. |
| **Tile interaction** | On tile click: resolve action (actionId → ruleset action, run or show); resolve item (LocationItem → item details); resolve character (show or interact). Use existing action execution and item/character APIs. |
| **Move between locations** | UI to choose another location (e.g. child locations of current, or list). Update character.locationId and character.tileId (and optionally worldId if crossing worlds). |
| **Navigation** | Link "Character sheet" ↔ "Current location" in header or sidebar when in player context. |
| **Permissions** | (Optional) Who can move which character; who can "enter" a world. Defer or keep simple for v1 (e.g. only character owner). |

---

## Exit criteria (when implemented)

- [ ] Player can enter a world with a character and see the character's current location.
- [ ] Location viewer shows grid, tiles, characters, and items; tile actions are clickable and run the ruleset action.
- [ ] Player can move the character to another location and see the update.
- [ ] Player can switch between character sheet and location view easily.
- [ ] No regression in creator flows (world/location/tilemap editing, placing characters and items).

---

## Implementation prompt

Use this prompt when implementing Phase 8 (player experience):

```
Implement Phase 8 of the Worlds & Locations feature: the player experience.

Context:
- All previous phases (1–7) are done: data model, hooks, world list, world editor, location editor, tilemap editor, and placing characters/items in locations. Characters have worldId, locationId, tileId; LocationItem and tile actions exist.
- Read agents/locations/phase-8.md and agents/locations/locations.md (Player Experience section).

Do the following:

1. **Enter world**
   - Add an entry point (e.g. from character sheet or /characters) to "Enter world" with a character. Let the user pick a world (and optionally starting location/tile) or use a default. Set character.worldId, locationId, tileId and persist via updateCharacter.

2. **Location viewer (player)**
   - Add a route or view for the player's current location (e.g. /characters/:characterId/location or /worlds/:worldId/play). Load the character and their location; render the location grid (read-only). Show tiles (with tile art), characters at their tiles (by tileId), and items (LocationItems) at their tiles. For tiles with actionId, make them clickable; on click run the ruleset action (use existing action execution). For tiles with LocationItem, show item on click. For tiles with a character, show character or interaction.

3. **Move between locations**
   - In the location viewer, add a way to move to another location (e.g. list of child locations of current location, or a list of locations in the world). On select, update character.locationId and character.tileId (e.g. to first tile of that location or a designated tile). Re-render the location viewer.

4. **Navigation**
   - Add a clear link from the location viewer to the character sheet (/characters/:characterId) and from the character sheet to "View location" when the character is in a world.

5. **Edge cases**
   - Handle character not in a world (prompt to enter world). Handle missing location or world (redirect or error). Do not break creator flows (world/location/tilemap editing, placing characters and items).

Follow existing patterns and the project's tech stack (React, Zustand, Dexie, Tailwind, etc.). Design so that future sync of other players' positions can be added without changing the data model.
```
