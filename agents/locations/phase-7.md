# Phase 7: Place characters and items in locations (creator)

**Goal:** In the location editor, the creator can place characters (from the world's ruleset) and items (LocationItem) on tiles. Characters and items are visible on the grid; creator can remove or move them.

**Depends on:** Phase 1, 2, 5 (and ideally 4, 6). Location editor with grid and tiles must exist; world editor provides context. Character hooks support worldId, locationId, tileId; LocationItem hooks exist.

**Reference:** [locations.md](./locations.md), [worlds-plan.md](./worlds-plan.md). Character has optional worldId, locationId, tileId. LocationItem has itemId, rulesetId, worldId, locationId, tileId (TileData.id). World has rulesetId; characters and items are chosen from that ruleset.

---

## Current design notes (alignment)

- **Routes:** World editor at `/worlds/:worldId`; location editor at `/worlds/:worldId/locations/:locationId`. Back navigates to parent location or world root.
- **Location editor:** `src/pages/worlds/location-editor.tsx`. Grid uses `location.tileRenderSize`; global "Layer" (paint z-index) and "Tile size" in top bar. Multi-tile selection in tile paint bar; cell property panel for layers at a cell.
- **Tiles:** `Location.tiles` is `TileData[]`. Each `TileData` has `id`, `tileId`, `x`, `y`, `zIndex`, `isPassable`, `actionId`. Multiple TileData per cell (layers) are supported; use one `TileData.id` per character/item placement (e.g. topmost layer at that cell by zIndex).
- **Hooks:** `useWorld(worldId)`, `useLocation(locationId)`, `useLocations(worldId)`, `useLocationItems(worldId, locationId)` with `createLocationItem`, `updateLocationItem`, `deleteLocationItem`. Characters: filter by `world.rulesetId` (e.g. from `useCharacter()` list or `db.characters` by rulesetId). Items: load by `world.rulesetId` (e.g. `db.items.where('rulesetId').equals(world.rulesetId)` or a ruleset-scoped items API). `updateCharacter(id, { worldId, locationId, tileId })` for placement.
- **Location type:** Includes `hasMap`, `tileRenderSize`, `opacity` (fill and background image). No separate `backgroundOpacity`.

---

## Tasks

### 7.1 Characters in location

| Task | File(s) | Notes |
|------|--------|--------|
| In location editor: "Place character" mode or button. List characters for world.rulesetId (e.g. filter characters from useCharacter by rulesetId, or query by rulesetId). User selects a character, then clicks a cell that has at least one TileData. Use one TileData.id at that cell (e.g. topmost by zIndex) and set character's worldId, locationId, tileId via updateCharacter. | Location editor | |
| Render characters on the grid: for each character with locationId === current location.id, find the tile (TileData.id === character.tileId) and render the character there (avatar or first sprite asset from character.sprites / assetId). | Same | |
| "Remove from location" or "Move": clear character's worldId, locationId, tileId; or set a new tileId (TileData.id) to move. | Same | |

### 7.2 Location items

| Task | File(s) | Notes |
|------|--------|--------|
| "Place item" mode: list items from ruleset (world.rulesetId), e.g. db.items.where('rulesetId').equals(world.rulesetId). User picks item, then clicks a cell with TileData. Use one TileData.id at that cell (e.g. topmost by zIndex). Create LocationItem via createLocationItem(worldId, locationId, { itemId, rulesetId: world.rulesetId, tileId }). | Location editor | |
| Render items on the grid: for each LocationItem with locationId === current location.id, render at the tile with matching tileId (icon or item label). | Same | |
| Remove: deleteLocationItem. Move: updateLocationItem with new tileId (TileData.id). | Same | |

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
- Phases 1–5 (and ideally 6) are done: types, hooks, world list, world editor, location editor with grid and tile painting. Character has optional worldId, locationId, tileId. LocationItem hooks and types exist (useLocationItems in @/lib/compass-api/hooks/location-items/use-location-items.ts). World has rulesetId; use it to filter characters and items.
- Location editor: src/pages/worlds/location-editor.tsx. Routes: /worlds/:worldId/locations/:locationId. Location.tiles is TileData[]; cells can have multiple TileData (layers with zIndex). Use one TileData.id per character/item placement (e.g. topmost TileData at clicked cell).
- Read agents/locations/phase-7.md and agents/locations/locations.md.

Do the following:

1. **Place character**
   - In the location editor, add "Place character" (mode or button). Load characters and filter by rulesetId === world.rulesetId (e.g. from useCharacter-style list or db.characters). When user selects a character and clicks a grid cell that has at least one TileData, resolve one TileData.id for that cell (e.g. topmost by zIndex) and call updateCharacter(characterId, { worldId, locationId, tileId: that TileData.id }). Render characters on the grid: for each character where character.locationId === location.id, find the TileData with id === character.tileId and draw the character there (use character.assetId or character.sprites[0] for avatar/image).
   - Add "Remove from location" (clear worldId, locationId, tileId) and optionally "Move" (set tileId to another TileData.id).

2. **Place item**
   - Add "Place item" mode. List items from the ruleset (world.rulesetId), e.g. db.items.where('rulesetId').equals(world.rulesetId) or a ruleset-scoped hook. When user selects an item and clicks a cell with TileData, resolve one TileData.id (e.g. topmost at that cell) and call createLocationItem(worldId, locationId, { itemId, rulesetId: world.rulesetId, tileId }). Render: for each LocationItem with locationId === location.id, draw at the cell whose TileData.id === locationItem.tileId (show item label or icon).
   - Add remove (deleteLocationItem) and move (updateLocationItem with new tileId).

3. **UI**
   - Make the mode clear (e.g. Paint tile / Place character / Place item). When a placed character or item is selected, show options to remove or move. Use existing design system and components (e.g. from @/components).

Do not implement player-facing "interact with character/item" yet; this phase is creator-only placement and display.
```
