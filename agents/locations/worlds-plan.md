# Worlds & Locations: Phased Implementation Plan

This document breaks down the Worlds/Locations feature into phases with concrete steps and file-level tasks. It is based on the design in [locations.md](./locations.md).

**Scope for v1:** Creator tooling first (world list, world editor, location editor, tilemaps, tile editing, placing characters and items). Player experience (entering world, viewing location, interacting) is a later phase.

**Reference data model** (from locations.md):

- **World** — BaseDetails + label, rulesetId, assetId? (required ruleset association).
- **Tilemap** — BaseDetails + worldId, assetId, tileHeight, tileWidth (world-scoped).
- **Tile** — BaseDetails + tilemapId?, tileX?, tileY? (slice of a tilemap).
- **TileData** — Not a DB table. `{ id, tileId, x, y, isPassable, actionId? }`; stored in `Location.tiles`.
- **Location** — BaseDetails + label, worldId, nodeX, nodeY, nodeWidth, nodeHeight, parentLocationId?, gridWidth, gridHeight, tiles: TileData[].
- **LocationItem** — BaseDetails + itemId, rulesetId, worldId, locationId, tileId (tileId = TileData.id).
- **Character** — extend with sprites: string[], worldId?, locationId?, tileId?.

---

## Phase 1: Data model & persistence

**Goal:** Types and Dexie schema for worlds, tilemaps, tiles, locations, location items; extend Character. No UI.

### 1.1 Types

| Task | File(s) | Notes |
|------|--------|--------|
| Add `World`, `Tilemap`, `Tile`, `TileData`, `Location`, `LocationItem` types (all extending `BaseDetails` where they are DB entities). | `src/types/data-model-types.ts` | `TileData` is not a DB entity; define it in the same file or a shared types file for locations. |
| Extend `Character` with `sprites?: string[]`, `worldId?: string`, `locationId?: string`, `tileId?: string`. | `src/types/data-model-types.ts` | Optional so existing characters remain valid. |
| Export new types from `src/types` (e.g. `index.ts` or existing type barrel). | `src/types/index.ts` (or equivalent) | So hooks and components can import from `@/types`. |

### 1.2 Dexie schema and DB

| Task | File(s) | Notes |
|------|--------|--------|
| Add schema entries for `worlds`, `tilemaps`, `tiles`, `locations`, `locationItems`. | `src/stores/db/schema.ts` | Use same `common` pattern: `++id, createdAt, updatedAt`. Indexes: worlds by rulesetId; tilemaps by worldId; tiles by tilemapId; locations by worldId, parentLocationId; locationItems by worldId, locationId, rulesetId. |
| Bump `dbSchemaVersion`. | `src/stores/db/schema.ts` | e.g. 32. |
| Add table types and `db.version().stores()`. | `src/stores/db/db.ts` | Add `worlds`, `tilemaps`, `tiles`, `locations`, `locationItems` to the Dexie typings and schema. |
| If needed, add migration for existing DB (e.g. ensure Character can accept new optional fields). | `src/stores/db/` or migration script | Dexie usually handles new optional fields; document if any one-time migration is required. |

### 1.3 DB hooks (optional for Phase 1)

| Task | File(s) | Notes |
|------|--------|--------|
| Add world/location/tilemap hooks only if we need side effects (e.g. cascade delete: delete world → delete locations, tilemaps, location items). | `src/stores/db/hooks/` (e.g. `world-hooks.ts`, `location-hooks.ts`) | Register in `db-hooks.ts`. Defer to Phase 2 if no immediate side effects. |

**Phase 1 exit criteria:** Types exist, schema applied, DB opens without error, existing app behavior unchanged.

---

## Phase 2: API layer (hooks)

**Goal:** React-facing hooks to read/write worlds, locations, tilemaps, tiles, location items; extend character hooks for location fields and sprites.

### 2.1 World hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useWorlds(rulesetId?: string)` — list worlds, optionally filtered by ruleset. | `src/lib/compass-api/hooks/worlds/use-worlds.ts` | Follow `useCharacter` / `useRulesets` pattern; use `useLiveQuery` and `db.worlds`. |
| Implement `useWorld(worldId: string | undefined)` — single world by id. | `src/lib/compass-api/hooks/worlds/use-world.ts` | |
| Implement `createWorld`, `updateWorld`, `deleteWorld` (and expose via `useWorlds` or a small `useWorldMutations`). | Same or `use-world-mutations.ts` | Delete: consider cascade (locations, tilemaps, location items) in DB hooks or here. |
| Export from compass-api hooks index. | `src/lib/compass-api/hooks/worlds/index.ts`, `src/lib/compass-api/hooks/index.ts` | |

### 2.2 Location hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useLocations(worldId: string | undefined)` — list locations for a world. | `src/lib/compass-api/hooks/locations/use-locations.ts` | Index on worldId. |
| Implement `useLocation(locationId: string | undefined)` — single location. | `src/lib/compass-api/hooks/locations/use-location.ts` | |
| Implement create/update/delete location; update must support patching `tiles` (TileData[]). | Same or mutations file | |
| Export from compass-api hooks index. | `src/lib/compass-api/hooks/locations/index.ts`, main index | |

### 2.3 Tilemap and Tile hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useTilemaps(worldId: string | undefined)` and `useTilemap(tilemapId)`. | `src/lib/compass-api/hooks/tilemaps/use-tilemaps.ts` (and single) | |
| Implement create/update/delete tilemap. | Same or mutations | |
| Implement `useTiles(tilemapId: string | undefined)` — list Tiles for a tilemap. | `src/lib/compass-api/hooks/tiles/use-tiles.ts` | |
| Implement create/update/delete Tile. | Same or mutations | |
| Export from compass-api. | Tilemaps and tiles index + main index | |

### 2.4 LocationItem hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useLocationItems(worldId?: string, locationId?: string)` and mutations. | `src/lib/compass-api/hooks/location-items/use-location-items.ts` | Filter by worldId and optionally locationId. |
| Export from compass-api. | Index + main | |

### 2.5 Character hook extensions

| Task | File(s) | Notes |
|------|--------|--------|
| Extend `useCharacter` (or character update path) so callers can set `sprites`, `worldId`, `locationId`, `tileId`. | `src/lib/compass-api/hooks/characters/use-character.ts` | Ensure `updateCharacter` accepts these fields; no breaking change for existing usage. |

**Phase 2 exit criteria:** All new hooks exist and are exported; character updates support new fields; no UI yet.

---

## Phase 3: World list and creation

**Goal:** Users can see a list of worlds and create a world (pick ruleset + label), similar to Characters.

### 3.1 Routes and navigation

| Task | File(s) | Notes |
|------|--------|--------|
| Add route `/worlds` — list page. | `src/App.tsx` | |
| Add route `/worlds/:worldId` — world editor (Phase 4). | `src/App.tsx` | Can render a placeholder until Phase 4. |
| Add “Worlds” to sidebar (e.g. alongside Rulesets, Characters). | `src/components/composites/app-sidebar.tsx` | Reuse `homepageItems` pattern; add Worlds with appropriate icon (e.g. Globe). |

### 3.2 Worlds list page

| Task | File(s) | Notes |
|------|--------|--------|
| Create `Worlds` page component: list worlds (all or by current user / ruleset as decided). | `src/pages/home/worlds.tsx` (or `src/pages/worlds/worlds.tsx`) | Mirror `Characters` / `Rulesets`: cards or list, delete, open. |
| Use `useWorlds()` and link each world to `/worlds/:worldId`. | Same | |
| Add “Create world” entry (button or card) that opens creation flow. | Same | |

### 3.3 Create world flow

| Task | File(s) | Notes |
|------|--------|--------|
| Create world dialog or inline flow: select ruleset, enter label, optional asset. | Same page or `src/pages/home/create-world-dialog.tsx` | Reuse ruleset selector pattern from character creation; call `createWorld({ rulesetId, label, assetId? })`. |
| On success, navigate to `/worlds/:worldId` or stay on list and show new world. | Same | |

### 3.4 Page export

| Task | File(s) | Notes |
|------|--------|--------|
| Export `Worlds` from pages index and use in App route. | `src/pages/index.ts`, `src/App.tsx` | |

**Phase 3 exit criteria:** User can open /worlds, see worlds, create a world with ruleset + label, and navigate to world editor (placeholder ok).

---

## Phase 4: World editor (canvas)

**Goal:** World editor at `/worlds/:worldId` with a zoomable/pannable ReactFlow canvas; locations as nodes; add/edit/delete locations; open location editor.

### 4.1 World editor page shell

| Task | File(s) | Notes |
|------|--------|--------|
| Create `WorldEditor` page: load world by `worldId`, show canvas and toolbar. | `src/pages/worlds/world-editor.tsx` (or under `worlds/`) | Use `useWorld(worldId)`, `useLocations(worldId)`. |
| Handle missing world (404 or redirect). | Same | |

### 4.2 ReactFlow canvas for locations

| Task | File(s) | Notes |
|------|--------|--------|
| Reuse or adapt `BaseEditor` from compass-planes: enable zoom and pan (minZoom/maxZoom, panOnDrag/panOnScroll). | `src/lib/compass-planes/base-editor/base-editor.tsx` or a world-specific wrapper | World canvas needs different defaults than sheet editor. |
| Convert locations to ReactFlow nodes: position from `nodeX`, `nodeY`, size from `nodeWidth`, `nodeHeight`; label from `location.label`. | World editor component or `src/pages/worlds/world-editor-canvas.tsx` | |
| On node drag end, persist new position/size to `Location` (update location). | Same | Call location update hook. |
| Right-click or toolbar: “Add location” — create location with default node position/size, add node. | Same | Create location then add node. |
| Optional: edges for parent/child (parentLocationId). Not required for v1. | Same | Defer if time-boxed. |

### 4.3 Navigate into location

| Task | File(s) | Notes |
|------|--------|--------|
| Double-click or “Open” on a location node → navigate to `/worlds/:worldId/locations/:locationId`. | World editor | Route added in Phase 5. |
| Breadcrumb or “Back to world” in location editor (Phase 5) returns to `/worlds/:worldId`. | Phase 5 | |

### 4.4 Delete location

| Task | File(s) | Notes |
|------|--------|--------|
| Delete location from context menu or panel; remove from DB and from canvas. | World editor | Consider cascade: delete location items for that location. |

**Phase 4 exit criteria:** User can open world editor, see location nodes, add/move/resize/delete locations, and open a location (navigate to location editor).

---

## Phase 5: Location editor (grid)

**Goal:** Location editor at `/worlds/:worldId/locations/:locationId` with grid, tile data, and ability to paint tiles (with tilemap/tiles in place).

### 5.1 Route and page shell

| Task | File(s) | Notes |
|------|--------|--------|
| Add route `/worlds/:worldId/locations/:locationId`. | `src/App.tsx` | |
| Create `LocationEditor` page: load location, show grid and toolbar; breadcrumb “World > Location” / “Back to world”. | `src/pages/worlds/location-editor.tsx` | Use `useLocation(locationId)`, `useWorld(worldId)`. |

### 5.2 Grid setup

| Task | File(s) | Notes |
|------|--------|--------|
| UI to set `gridWidth`, `gridHeight` (number of tiles). Persist to location. | Location editor | Only allow when no tiles placed, or allow and clear/remap tiles if needed. |
| Render a grid of cells (CSS grid or divs) with dimensions `gridWidth` × `gridHeight`. | Same | Each cell keyed by (x, y). |

### 5.3 TileData and tile painting

| Task | File(s) | Notes |
|------|--------|--------|
| Load `location.tiles` (TileData[]). Map TileData by (x, y) for fast lookup. | Location editor | |
| “Paint” flow: user selects a Tile (from a tilemap, Phase 6) and clicks a grid cell; create or update TileData (id, tileId, x, y, isPassable, actionId?). Append or update in `location.tiles`, then update location. | Same | Generate stable id for new TileData (e.g. crypto.randomUUID()). |
| Tile property panel: select a cell → show TileData for that (x,y); edit isPassable, actionId (optional: pick action from ruleset via world.rulesetId). | Same | |
| Render each cell: if TileData exists, draw tile (use Tile → Tilemap → asset slice); else empty. | Same | Asset slice: use tilemap.tileWidth, tileHeight and tile.tileX, tileY to compute background-position. |

### 5.4 Tilemap integration (minimal)

| Task | File(s) | Notes |
|------|--------|--------|
| Location editor needs a way to pick a Tile (from a tilemap). If Phase 6 (Tilemap editor) is after Phase 5, provide a minimal tilemap list + tile list (e.g. one default tilemap per world or “upload and set tile size” inline). | Location editor or shared `TilePicker` | See Phase 6. |

**Phase 5 exit criteria:** User can set grid size, paint tiles from a tilemap onto the grid, and set passable/action per cell; grid renders with tile art.

---

## Phase 6: Tilemap editor

**Goal:** Create and edit tilemaps (asset + tileWidth, tileHeight); define Tiles (slices) for use in locations.

### 6.1 Tilemap list and create

| Task | File(s) | Notes |
|------|--------|--------|
| In world context (e.g. world editor sidebar or a “Tilemaps” tab): list tilemaps for the world; “Create tilemap”. | `src/pages/worlds/tilemap-list.tsx` or inside world editor | |
| Create tilemap flow: upload or select asset (world’s ruleset assets or user assets as per design), set tileWidth, tileHeight. Save to DB. | Same or `tilemap-editor.tsx` | |

### 6.2 Tilemap editor (adjust grid)

| Task | File(s) | Notes |
|------|--------|--------|
| Open tilemap editor: show asset image and overlay a grid with tileWidth × tileHeight. Allow adjusting tile dimensions so tiles align. | `src/pages/worlds/tilemap-editor.tsx` | Read-only grid overlay for v1; editing tile dimensions updates tilemap. |
| Optionally: “Define tiles” — for each grid cell that should be placeable, create a Tile (tilemapId, tileX, tileY). Could be implicit (no Tile rows, derive from tilemap + cell) or explicit (Tile rows). Per locations.md we have explicit Tile entities. | Same | Create Tile records for each (tileX, tileY) the user marks as usable, or auto-create on first paint in location. |

### 6.3 Use tilemaps in location editor

| Task | File(s) | Notes |
|------|--------|--------|
| In location editor, tile picker: choose tilemap, then choose tile (or cell) from that tilemap. When painting, create Tile if needed (tilemapId, tileX, tileY) and TileData (tileId, x, y, isPassable, actionId). | Location editor + TilePicker | |

**Phase 6 exit criteria:** User can create tilemaps, set tile dimensions, and use them to paint tiles in the location editor.

---

## Phase 7: Place characters and items in locations (creator)

**Goal:** In the location editor, place characters (ruleset-scoped) and items (LocationItem) on tiles.

### 7.1 Characters in location

| Task | File(s) | Notes |
|------|--------|--------|
| Location editor: “Place character” — list characters for `world.rulesetId` (use existing character list filtered by ruleset). On “Place”, select a tile (TileData.id); set character’s worldId, locationId, tileId. | Location editor + character placement UI | Use `useCharacter` and filter by rulesetId; call updateCharacter. |
| Render character on the grid at the tile that has matching character.tileId (show avatar or first sprite asset). | Location editor | |
| “Remove from location” or move: clear character’s worldId/locationId/tileId or set new tileId. | Same | |

### 7.2 Location items

| Task | File(s) | Notes |
|------|--------|--------|
| “Place item” — list items from ruleset (world.rulesetId); pick item, then click tile. Create LocationItem (itemId, rulesetId, worldId, locationId, tileId). | Location editor | Use ruleset items hook; createLocationItem. |
| Render item on tile (icon or label). Remove: delete LocationItem. | Same | |

**Phase 7 exit criteria:** Creator can place characters and items on tiles and see them on the grid; character and location item data persist.

---

## Phase 8: Player experience (later)

**Goal:** Players can enter a world with a character, view the current location, move between locations, and interact with tiles (actions/items/characters). Document only; implementation later.

### 8.1 Enter world and set character location

- Entry point: e.g. from character sheet or home, “Enter world” with a character; set character’s worldId, locationId, tileId to a default or chosen location/tile.
- Persist so character “remembers” position.

### 8.2 Location viewer (player)

- Route or view: show current location grid (read-only or with movement), characters and items on tiles, tile actions.
- Click tile: if action → run action; if item → show item; if character → show character or interaction.

### 8.3 Navigation between locations

- Move character to another location (e.g. list of child locations, or “exits” defined on tiles/locations).
- Update character’s locationId and tileId.

### 8.4 Link to character sheet

- Easy link from location view to `/characters/:characterId` and back.

---

## Dependency summary

- **Phase 1** → required for all.
- **Phase 2** → required for Phase 3+.
- **Phase 3** → required for Phase 4 (world editor).
- **Phase 4** → required for Phase 5 (location editor).
- **Phase 5** can start with a minimal tilemap (e.g. one tilemap created manually or via simple UI); **Phase 6** completes tilemap creation/editing.
- **Phase 7** depends on Phase 5 (grid + tiles) and Phase 2 (character + location item hooks).

---

## File tree (new files by phase)

```
Phase 1:
  src/types/data-model-types.ts (edit)

Phase 2:
  src/lib/compass-api/hooks/worlds/use-worlds.ts
  src/lib/compass-api/hooks/worlds/use-world.ts
  src/lib/compass-api/hooks/worlds/index.ts
  src/lib/compass-api/hooks/locations/use-locations.ts
  src/lib/compass-api/hooks/locations/use-location.ts
  src/lib/compass-api/hooks/locations/index.ts
  src/lib/compass-api/hooks/tilemaps/use-tilemaps.ts
  src/lib/compass-api/hooks/tilemaps/use-tilemap.ts
  src/lib/compass-api/hooks/tilemaps/index.ts
  src/lib/compass-api/hooks/tiles/use-tiles.ts
  src/lib/compass-api/hooks/tiles/index.ts
  src/lib/compass-api/hooks/location-items/use-location-items.ts
  src/lib/compass-api/hooks/location-items/index.ts
  (edit) src/lib/compass-api/hooks/index.ts
  (edit) src/lib/compass-api/hooks/characters/use-character.ts

Phase 3:
  src/pages/home/worlds.tsx (or src/pages/worlds/worlds.tsx)
  (edit) src/App.tsx
  (edit) src/components/composites/app-sidebar.tsx
  (edit) src/pages/index.ts

Phase 4:
  src/pages/worlds/world-editor.tsx
  src/pages/worlds/world-editor-canvas.tsx (optional; could live in world-editor)
  (optional) src/lib/compass-planes/base-editor/ or wrapper for world zoom/pan

Phase 5:
  src/pages/worlds/location-editor.tsx
  (edit) src/App.tsx

Phase 6:
  src/pages/worlds/tilemap-editor.tsx
  src/pages/worlds/tilemap-list.tsx (or inside world-editor)

Phase 7:
  (edit) location-editor.tsx for character/item placement and rendering
```

---

## Notes

- **Assets for tilemaps:** Tilemap references an asset (assetId). Assets in QB are typically ruleset-scoped; worlds have rulesetId, so the world’s ruleset can be used to resolve assets. If a world is ever allowed without a ruleset, asset resolution for tilemaps will need a separate rule (e.g. user assets).
- **Offline-first:** All new data lives in IndexedDB; no new network dependencies.
- **Future sync:** Design so character position (worldId, locationId, tileId) and location item rows are easy to sync later; avoid hardcoding “single player” in the data model.
- **Export/import:** Worlds are not exported with rulesets (per locations.md). Character export/import may later include world/location/tile state; not in creator v1 scope.
