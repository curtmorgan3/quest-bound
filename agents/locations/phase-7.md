# Phase 7: Place characters and items in locations (creator)

**Goal:** In the location editor, the creator can place characters (from the world's ruleset) and items (LocationItem) on tiles. Characters and items are visible on the grid; creator can remove or move them.

**Depends on:** Phase 1, 2, 5 (and ideally 4, 6). Location editor with grid and tiles must exist; world editor provides context. Character hooks support worldId, locationId, tileId; LocationItem hooks exist.

**Reference:** [locations.md](./locations.md), [worlds-plan.md](./worlds-plan.md). Character has optional worldId, locationId, tileId. LocationItem has itemId, rulesetId, worldId, locationId, tileId (TileData.id). World has rulesetId; characters and items are chosen from that ruleset.

---

## Tasks

### 7.1 Characters in location

| Task | File(s) | Notes |
|------|--------|--------|
| In location editor: "Place character" mode or button. List characters for world.rulesetId (use useCharacter or filter characters by rulesetId). User selects a character, then clicks a tile (cell with TileData). Set character's worldId, locationId, tileId via updateCharacter. | Location editor | |
| Render characters on the grid: for each character with locationId === current location.id, find the tile (TileData.id === character.tileId) and render the character there (avatar or first sprite asset from character.sprites). | Same | |
| "Remove from location" or "Move": clear character's worldId, locationId, tileId; or set a new tileId to move. | Same | |

### 7.2 Location items

| Task | File(s) | Notes |
|------|--------|--------|
| "Place item" mode: list items from ruleset (world.rulesetId) via existing ruleset items hook. User picks item, then clicks a tile. Create LocationItem (itemId, rulesetId: world.rulesetId, worldId, locationId, tileId: TileData.id). | Location editor | |
| Render items on the grid: for each LocationItem with locationId === current location.id, render at the tile with matching tileId (icon or item label). | Same | |
| Remove: delete LocationItem. Move: update LocationItem.tileId. | Same | |

### 7.3 UI flow

| Task | File(s) | Notes |
|------|--------|--------|
| Clear mode switching: e.g. "Paint tile" vs "Place character" vs "Place item". Or a single "Place" menu with character/item options. Ensure selecting a placed character/item allows remove/move. | Location editor | |

---

## Exit criteria

- [ ] Creator can place a character on a tile (character gets worldId, locationId, tileId); character appears on the grid (e.g. avatar or sprite).
- [ ] Creator can remove a character from the location or move to another tile.
- [ ] Creator can place an item on a tile (LocationItem created); item appears on the grid.
- [ ] Creator can remove or move a placed item.
- [ ] Character and item lists are filtered by the world's rulesetId. No regression in tile painting or grid behavior.

---

## Implementation prompt

Use this prompt when implementing Phase 7:

```
Implement Phase 7 of the Worlds & Locations feature: placing characters and items in the location editor (creator experience).

Context:
- Phases 1–5 (and ideally 6) are done: types, hooks, world list, world editor, location editor with grid and tile painting. Character has optional worldId, locationId, tileId. LocationItem hooks and types exist. World has rulesetId; we use it to filter characters and items.
- Read agents/locations/phase-7.md and agents/locations/locations.md.

Do the following:

1. **Place character**
   - In the location editor, add "Place character" (mode or button). Load characters (useCharacter or equivalent) and filter by rulesetId === world.rulesetId. When user selects a character and clicks a grid cell that has TileData, call updateCharacter(characterId, { worldId, locationId, tileId: tileData.id }). Render characters on the grid: for each character where character.locationId === location.id, find the TileData with id === character.tileId and draw the character there (use character.assetId or character.sprites[0] for avatar/image).
   - Add "Remove from location" (clear worldId, locationId, tileId) and optionally "Move" (set tileId to another TileData.id).

2. **Place item**
   - Add "Place item" mode. List items from the ruleset (world.rulesetId) using existing ruleset items hook. When user selects an item and clicks a tile (with TileData), call createLocationItem({ itemId, rulesetId: world.rulesetId, worldId, locationId, tileId: tileData.id }). Render: for each LocationItem with locationId === location.id, draw at the cell whose TileData.id === locationItem.tileId (show item label or icon).
   - Add remove (deleteLocationItem) and move (updateLocationItem with new tileId).

3. **UI**
   - Make the mode clear (e.g. Paint tile / Place character / Place item). When a placed character or item is selected, show options to remove or move. Use existing design system and components.

Do not implement player-facing "interact with character/item" yet; this phase is creator-only placement and display.
```
