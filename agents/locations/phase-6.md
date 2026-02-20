# Phase 6: Tilemap editor

**Goal:** Users can create and edit tilemaps (asset + tileWidth, tileHeight) in world context, and define Tiles (slices) for use in the location editor. Location editor's tile picker uses these tilemaps and tiles.

**Depends on:** Phase 1, 2, 4, 5 (world editor and location editor exist; location editor already has minimal tilemap/tile usage; Phase 6 formalizes tilemap creation and editing).

**Reference:** [locations.md](./locations.md), [worlds-plan.md](./worlds-plan.md). Tilemap = worldId, assetId, tileWidth, tileHeight. Tile = tilemapId, tileX, tileY.

---

## Tasks

### 6.1 Tilemap list and create

| Task | File(s) | Notes |
|------|--------|--------|
| In world context (e.g. world editor sidebar or a "Tilemaps" tab/section): list tilemaps for the world (useTilemaps(worldId)). "Create tilemap" button. | `src/pages/worlds/tilemap-list.tsx` or inside world-editor | Can be a sidebar panel in the world editor or a separate view. |
| Create tilemap flow: upload or select asset (use world's ruleset assets via world.rulesetId and existing asset hooks), set tileWidth, tileHeight. Save via createTilemap. | Same or `tilemap-editor.tsx` | |

### 6.2 Tilemap editor (adjust grid)

| Task | File(s) | Notes |
|------|--------|--------|
| Open tilemap editor (e.g. from tilemap list): show the asset image and overlay a grid with tileWidth × tileHeight. Allow editing tileWidth and tileHeight so the grid aligns with the image; persist via updateTilemap. | `src/pages/worlds/tilemap-editor.tsx` | Read-only grid overlay for v1; changing dimensions updates the tilemap. |
| Optionally: "Define tiles" — create Tile records for grid cells the user marks as placeable (tilemapId, tileX, tileY). Or auto-create Tile on first use when painting in location editor. Per design we have explicit Tile entities; ensure Tiles can be created from this UI or from the location editor when painting. | Same | |

### 6.3 Use tilemaps in location editor

| Task | File(s) | Notes |
|------|--------|--------|
| In location editor, tile picker: list tilemaps for the world, then list tiles (or grid cells) for the selected tilemap. When user paints, use or create Tile (tilemapId, tileX, tileY) and TileData. | Location editor + TilePicker (or integrate into existing picker from Phase 5) | Phase 5 may already have a minimal picker; refine it to use the full tilemap list and tile list. |

---

## Exit criteria

- [ ] From the world editor, user can open a tilemap list and create a tilemap (asset + tileWidth, tileHeight).
- [ ] User can open a tilemap editor, see the asset with a grid overlay, and adjust tile dimensions.
- [ ] User can define or discover Tiles (slices) for a tilemap; location editor tile picker shows tilemaps and tiles and painting works with them.
- [ ] No regression in location editor grid or painting.

---

## Implementation prompt

Use this prompt when implementing Phase 6:

```
Implement Phase 6 of the Worlds & Locations feature: the tilemap editor.

Context:
- Phases 1–5 are done: types, hooks, world list, world editor, location editor with grid and tile painting. Location editor may already have a minimal tilemap/tile picker.
- Read agents/locations/phase-6.md and agents/locations/locations.md.
- Tilemap = worldId, assetId, tileWidth, tileHeight. Tile = tilemapId, tileX, tileY (slice of the tilemap image).

Do the following:

1. **Tilemap list in world context**
   - Add a way to view tilemaps for the current world (e.g. sidebar in world editor or a "Tilemaps" tab). Create src/pages/worlds/tilemap-list.tsx or integrate into world-editor. Use useTilemaps(worldId). List tilemaps with "Edit" and "Create tilemap" actions.

2. **Create tilemap**
   - Create flow: select or upload asset (use assets for world.rulesetId), set tileWidth and tileHeight. Call createTilemap({ worldId, assetId, tileWidth, tileHeight }). Navigate to tilemap editor or open in place.

3. **Tilemap editor (src/pages/worlds/tilemap-editor.tsx)**
   - Load tilemap by id. Show the asset image (from assetId) and overlay a grid of tileWidth × tileHeight. Allow editing tileWidth and tileHeight (inputs); on change call updateTilemap. Optionally allow defining Tiles: for each grid cell (tileX, tileY) the user can mark as usable, create a Tile (tilemapId, tileX, tileY). Or document that Tiles are created on first paint in the location editor.

4. **Location editor tile picker**
   - Ensure the location editor tile picker lists tilemaps for the world (useTilemaps(worldId)) and tiles for the selected tilemap (useTiles(tilemapId)). When painting, use existing Tile or create Tile if needed (tilemapId, tileX, tileY), then create/update TileData. Integrate with the existing location editor from Phase 5.

Use existing UI components and patterns. Ensure asset resolution uses the world's ruleset for tilemap assets.
```
