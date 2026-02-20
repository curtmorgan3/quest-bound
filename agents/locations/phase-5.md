# Phase 5: Location editor (grid)

**Goal:** Location editor at `/worlds/:worldId/locations/:locationId` with a grid (gridWidth × gridHeight), tile data (TileData[]) stored on the location, and the ability to paint tiles from a tilemap. User can set passable and actionId per cell. If Phase 6 (tilemap editor) is not done yet, provide a minimal way to pick or create a tilemap/tile (e.g. one default tilemap or inline "upload asset + tile size").

**Depends on:** Phase 1, 2, 3, 4. Phase 6 can follow; Phase 5 may need a minimal tilemap/tile flow so tiles can be painted.

**Reference:** [locations.md](./locations.md), [worlds-plan.md](./worlds-plan.md). Location.tiles is TileData[] (id, tileId, x, y, isPassable, actionId?). Tile references Tilemap; Tilemap has assetId, tileWidth, tileHeight. Tile has tileX, tileY for the slice.

---

## Tasks

### 5.1 Route and page shell

| Task | File(s) | Notes |
|------|--------|--------|
| Add or replace placeholder route `/worlds/:worldId/locations/:locationId` with the real LocationEditor. | `src/App.tsx` | |
| Create LocationEditor page: load location (useLocation), world (useWorld for breadcrumb). Show grid, toolbar, and breadcrumb "World > Location" or "Back to world". | `src/pages/worlds/location-editor.tsx` | |

### 5.2 Grid setup

| Task | File(s) | Notes |
|------|--------|--------|
| UI to set gridWidth and gridHeight (number of tiles). Persist to location via updateLocation. | Location editor | Consider allowing only when no tiles are placed, or allow and clear/remap tiles. |
| Render a grid of cells (CSS grid or divs) with dimensions gridWidth × gridHeight. Each cell keyed by (x, y). | Same | |

### 5.3 TileData and tile painting

| Task | File(s) | Notes |
|------|--------|--------|
| Load location.tiles (TileData[]). Build a map by (x, y) for fast lookup. | Location editor | |
| "Paint" flow: user selects a Tile (from a tilemap; see 5.4). Clicks a grid cell. Create or update TileData (id from crypto.randomUUID(), tileId, x, y, isPassable default true, actionId optional). Update location.tiles and call updateLocation. | Same | |
| Tile property panel: when a cell is selected, show TileData for that (x, y). Allow editing isPassable and actionId (optional: pick action from ruleset via world.rulesetId). | Same | |
| Render each cell: if TileData exists, draw the tile (Tile → Tilemap → asset; use tilemap.tileWidth, tileHeight and tile.tileX, tileY to compute background-position or slice). Else empty cell. | Same | |

### 5.4 Tilemap/tile picker (minimal if Phase 6 not done)

| Task | File(s) | Notes |
|------|--------|--------|
| Location editor needs a way to pick a Tile. If Phase 6 exists: tile picker that lists tilemaps for the world, then tiles for the selected tilemap. If Phase 6 not done: minimal path—e.g. list tilemaps for world (useTilemaps(worldId)); if none, "Create tilemap" inline (upload asset + tileWidth, tileHeight) or a single default tilemap. For painting, create Tile if needed (tilemapId, tileX, tileY) and TileData. | Location editor + optional TilePicker component | |

---

## Exit criteria

- [ ] Opening `/worlds/:worldId/locations/:locationId` shows the location editor with breadcrumb and grid.
- [ ] User can set grid width and height; grid renders with that many cells.
- [ ] User can select a tile (from a tilemap) and paint it on cells; TileData is stored in location.tiles and persisted.
- [ ] User can select a cell and edit isPassable and actionId.
- [ ] Grid cells show tile art (asset slice) when TileData exists; empty otherwise.
- [ ] Minimal tilemap/tile creation works if Phase 6 is not implemented (so painting is possible).

---

## Implementation prompt

Use this prompt when implementing Phase 5:

```
Implement Phase 5 of the Worlds & Locations feature: the location editor (grid and tile painting).

Context:
- Phases 1–4 are done: types, hooks, world list, world editor canvas, and route /worlds/:worldId/locations/:locationId (possibly placeholder).
- Read agents/locations/phase-5.md and agents/locations/locations.md for the data model.
- Location has: gridWidth, gridHeight, tiles: TileData[]. TileData = { id, tileId, x, y, isPassable, actionId? }. Tile references Tilemap; Tilemap has assetId, tileWidth, tileHeight. Tile has tileX, tileY for the slice in the asset.

Do the following:

1. **Location editor page (src/pages/worlds/location-editor.tsx)**
   - Load location with useLocation(locationId) and world with useWorld(worldId). Show breadcrumb "World > [Location label]" or "Back to world" linking to /worlds/:worldId.
   - Toolbar: grid dimensions (gridWidth, gridHeight) with a way to edit and persist via updateLocation. Render a grid of cells (gridWidth × gridHeight), each keyed by (x, y).

2. **TileData and painting**
   - Load location.tiles; build a map by (x, y). When user selects a Tile (from tile picker) and clicks a grid cell, create or update TileData (id: crypto.randomUUID(), tileId, x, y, isPassable: true, actionId). Update the location.tiles array and call updateLocation.
   - When a cell is selected, show a panel to edit isPassable and actionId (optional: actions from ruleset via world.rulesetId).

3. **Rendering tiles**
   - For each cell, if TileData exists: resolve Tile → Tilemap, load asset, render slice using tilemap.tileWidth, tileHeight and tile.tileX, tileY (e.g. background-position or clip). Else render empty cell.

4. **Tile picker (minimal)**
   - If useTilemaps(worldId) returns tilemaps, let user pick a tilemap then pick a tile (or cell) from it. If no tilemaps exist, provide a minimal "Create tilemap" (asset + tileWidth, tileHeight) so one tilemap exists. When painting, create a Tile (tilemapId, tileX, tileY) if needed, then TileData. Use existing hooks useTilemaps, useTiles, createTilemap, createTile.

Follow existing UI patterns (Tailwind, @/components). Ensure the grid is clearly visible and the paint/select flow is intuitive.
```
