I'm thinking through a new feature.

A Location is a new data model and represents a place where a character or is. The location type looks something like this.

```typescript
type World = {
  label: string;
  rulesetId: string;
  assetId?: string | null;
};

type Tilemap = {
  id: string;
  worldId: string;
  assetId: string;
  tileHeight: number;
  tileWidth: number; // meta data needed to align to world editor grid
};

type Tile = {
  id: string;
  tilemapId?: string;
  tileX?: number; // how to slice image
  tileY?: number;
};

// Not a DB model
type TileData = {
  id: string;
  tileId: string;
  x: number; // position in location grid
  y: number;
  isPassable: boolean;
  actionId?: string; // assocation to action for an onClick event
};

type Location = {
  id: string;
  label: string;
  worldId: string;
  nodeHeight: number;
  nodeWidth: number;
  nodeX: number;
  nodeY: number;
  parentLocationId?: string;
  gridHeight: number; // number of tiles y
  gridWidth: number; // number of tiles x
  tiles: TileData[]; // serialized
};

type LocationItem = {
  itemId: string; // ID of item in ruleset
  rulesetId: string; // world editor pulls characters/items via world's ruleset
  worldId: string;
  locationId: string;
  tileId: string;
};

// Updates to existing models
type Character = {
  // ...Character
  sprites: string[]; // ids of assets used for sprites
  worldId?: string;
  locationId?: string;
  tileId?: string;
};
```

A world has many locations. Locations can be nested, but always have one parentId (except for top level locations, which have no parentId).

## Creator Experience

You'll create a world from the home page by assigning a ruleset to it, much like characters. The world editor is a canvas which can be zoomed and panned.
You add elements to the canvas to represent locations, then click into those elements to move into that location.

From within a location, you can apply a grid and define the height and width in grid squares. If a grid is applied, you can upload a tileset and decorate
tiles. Each tile may be selected to assign actions, mark them as passable, etc.

You can add characters and items to a location and place them on a tile.

## Player Experience

Players can move a character into a world and navigate through locations with them. They can click on tiles which have characters, items or actions to interact with those entities. They can move between their character sheets (`/characters/:id`) and the view for their current location easily.

## Goals

- This should feel like a light VTT experience.
- It uses QB's existing architecture where possible

## Questions

- What is the best approach for the world editor / viewer? Is the existing use of ReactFlow for the window editor enough, or do we need to use something more optimized like PixiJS?
- What are the largest challenges?
- What are some possible issues with implementing this feature alongside the current application?

---

## Answers (from codebase review)

### World editor / viewer: ReactFlow vs PixiJS

**Recommendation: Start with ReactFlow for both the world canvas and the location interior.**

- **World canvas** (zoom/pan, nodes = locations): The existing `BaseEditor` uses ReactFlow with zoom/pan currently _disabled_ (minZoom=maxZoom=1, panOnDrag/panOnScroll=false) for the sheet editor. ReactFlow supports zoom and pan out of the box—we’d enable them for the world view and treat each location as a node. That matches “add elements to the canvas, click into them” and reuses the same stack (context menu, selection, layout).

- **Location interior** (grid of tiles, tileset, characters/items): This can be implemented as either (a) a grid of DOM elements (e.g. divs or a CSS grid) keyed by `(tileX, tileY)` with tile data from the store, or (b) a single canvas that paints the grid. For a “light VTT” with moderate grid sizes (e.g. up to ~50×50), React + DOM or a small canvas is sufficient. **PixiJS** becomes worth it only if we target very large maps, many animated sprites, or smooth camera movement and need to avoid React’s render cost. It also adds a large dependency and a non-React rendering path.

**Summary:** Use ReactFlow for the world-level canvas (with zoom/pan enabled). Use React (and optionally a simple canvas for the tileset layer) for the location grid. Revisit PixiJS only if we hit real performance limits.

---

### Largest challenges

1. **Tile identity and storage**  
   The draft `Tile` type has `locationId`, `tileX`, `tileY` but no `id`. `LocationItem` and `Character` reference `tileId`. So we must either:
   - Give each tile a stable `id` (e.g. `id` on `Tile`, or a composite like `locationId:tileX:tileY` used as id), and store one row per tile in IndexedDB, or
   - Store tiles as a structured blob per location (e.g. `location.tileData: Record<"x,y", TileProps>`) and derive `tileId` as a composite key everywhere.  
     The first approach is consistent with existing QB entities (Dexie, hooks, indexes) and makes “tile with action / character / item” simple.

2. **Nested locations and “drilling in”**  
   Navigating from world → location → sublocation and back requires clear URL/state (e.g. `/worlds/:worldId` vs `/worlds/:worldId/locations/:locationId`) and a notion of “current” location for the editor. Breadcrumbs or a small map strip help so creators don’t get lost.

3. **Character placement and movement**  
   Moving a character to a tile (and validating passability, permissions, etc.) and syncing `character.worldId/locationId/tileId` without conflicting with the rest of the character model (inventory, attributes, sheet) needs a clear place in the data flow and in the UI (e.g. “Set location” from character vs from the map).

4. **Schema and migrations**  
   New tables (worlds, locations, tiles, locationItems) and extending `Character` (and possibly `BaseDetails` for new entities) mean a new Dexie schema version and a migration path for existing characters (new fields optional/nullable).

5. **Offline-first**  
   All world/location/tile data must live in IndexedDB and work offline, consistent with the rest of QB.

---

### Possible issues alongside the current application

1. **Character model extension**  
   Adding `sprites`, `worldId`, `locationId`, `tileId` to `Character`: existing characters have no world/location. That’s fine if fields are optional; we must ensure no code assumes they’re always set (e.g. character sheet still works when not in a world).

2. **Routes and navigation**  
   New routes (e.g. `/worlds`, `/worlds/:worldId`, `/worlds/:worldId/locations/:locationId`, and possibly a player view) and sidebar/entry points (e.g. “Worlds” next to “Characters” / “Rulesets”) need to fit the current `App.tsx` and layout without cluttering.

3. **Export/import**  
   If worlds are tied to a ruleset, export/import of rulesets may need to include world/location (and maybe tile) data. Character export/import may need to include world/location/tile state so a character “remembers” where they were.

4. **Scripts (QBScript)**  
   If we want scripts to depend on “current location” or tile (e.g. “when in Location X”, “when standing on tile with action Y”), the script runtime and accessors need a way to read `character.locationId` / `tileId` and related data. That’s a later-phase concern but affects how we model context in the script runner.

5. **Assets**  
   Tilesets and character sprites use the existing asset system; we should confirm whether one asset can be a “tileset” (multiple tile images) or if a tileset is “N×M image + metadata.” That drives how we store `tilesetRef` and render tiles.

---

## Implementation plan (high level)

1. **Data model & DB**
   - Add types: `World`, `Location`, `Tile`, `LocationItem` (and extend `Character`).
   - Add Dexie tables and indexes; bump schema version; migration if needed.
   - Resolve tile identity (recommend: `Tile` has `id` and is stored per row).

2. **API layer**
   - Hooks: `useWorlds`, `useWorld`, `useLocations`, `useLocation`, `useTiles`, `useLocationItems`, and updaters; character hooks extended for `worldId`/`locationId`/`tileId` and sprites.

3. **World editor (creator)**
   - World list + create (from home, ruleset-picked like characters).
   - World canvas: ReactFlow with zoom/pan, nodes = locations, edges optional (parent/child or visual).
   - “Open location” → navigate to location editor for that location.

4. **Location editor (creator)**
   - Grid setup: width, height, optional tileset.
   - Tile layer: paint/decorate tiles, set passable, assign action.
   - Place characters and location items on tiles (UI to pick character/item and click tile).

5. **Player experience**
   - “Enter world” with a character; set character’s world/location/tile.
   - Location viewer: grid, characters/items/actions on tiles, click to interact.
   - Navigation between locations (e.g. click exit/portal or list of child locations).
   - Easy link between character sheet (`/characters/:id`) and current location view.

6. **Polish**
   - Permissions (who can move which character, who can edit world).
   - Export/import of ruleset (worlds/locations) and character (location state).
   - Optional: QBScript access to location/tile for conditions/effects.

---

## Questions for you

Before turning this into a step-by-step implementation plan (with file-level tasks), a few decisions would help:

1. **Tile identity**  
   Do you want each tile to have a dedicated `id` (one Dexie row per tile), or is a composite key `(locationId, tileX, tileY)` enough and we use a single structure (e.g. a “tile map” blob) per location?

   _answer_
   Each tile woul have an `id`. It's ommission in the types above was an oversight.

2. **World ownership**  
   Is a world always tied to a single ruleset (and created from the ruleset or home with “create world for this ruleset”)? Any need for multi-ruleset or user-owned “personal” worlds?

   _answer_
   A world will always belong to a ruleset. However, worlds will not be exported with a ruleset. Similar to characters.

3. **Multiplayer / real-time**  
   Is “see other players’ characters on the map in real time” in scope at all, or is this strictly single-user (each player sees only their own character’s position)?

   _answer_
   For now, everything is instanced to the current player. However, in the future we will add architecture to sync content between QB instances, meaning other player's characters will render and update in real time. We won't implement that as a first pass, but keep it in mind during architecture decisions.

4. **Tileset format**  
   Is a tileset “one asset (image) + metadata (tile width/height, maybe collision)” or do you imagine multiple assets (e.g. one image per tile type)? This affects how we store `tilesetRef` and how we render.

   _answer_
   If possible, a tileset should be a single image that a tile can reference and take a slice of with x and y coordinates. The collision and other metadata would be stored on the location, not the tile.

5. **Scope for v1**  
   For the first version, do you want to prioritize creator tooling (world + location editor, tile editing) or player experience (moving character, viewing location, clicking actions/items)? That will order the implementation steps.

   _answer_
   We should start with creator tooling at first.

---

## Follow-up questions

1. **Location position on the world canvas**  
   When locations are nodes on the zoomable world canvas, we need to persist their (x, y) position so the layout is saved. Should `Location` include `x` and `y` (or `positionX` / `positionY`) for the world-editor canvas, or do you prefer a separate store (e.g. layout blob per world)?

   _answer_
   Location should have x, y, height and width to store their position and size within the world editor.

2. **Tileset slice metadata**  
   You said the tileset is one image and a tile takes a slice by x/y. Where should we store the slice size in pixels (tile width/height in the image)? Options: (a) on `Location` (e.g. `tilesetTileWidth`, `tilesetTileHeight` — one grid for the whole location), or (b) on the asset/tileset itself (e.g. asset metadata). Which do you prefer?

   _answer_
   We'll probably need a tilemap editor for users to upload an asset and adjust its size relative to a grid. Let's make a Tilemap model that stores the asset and the metadata. Locations will have a serialzied blob of TileData[], each associated to a Tile, which is associated to a Tilemap.

3. **Tileset ref: location vs tile**  
   The draft has both `Location.tilesetRef` and `Tile.tilesetRef`. Should the location have a single default tileset and tiles only override when needed, or is the location-level ref enough and we drop it from `Tile` for v1?

   _answer_
   I've updated the types a bit. Reread them and ask follow ups.

4. **Character sprites**  
   `Character.sprites: string[]` — is this a list of asset IDs for animation frames (we pick one or cycle), or something else (e.g. multiple “costumes”)? Affects how we render the character on the map.

   _answer_
   This is a list of assetIds which will be stacked at the same position with ascending z-indecies. Some will represent status, conditions, items, etc. We do not need to support animations in this first implementation.

5. **BaseDetails**  
   Should `World`, `Location`, `Tile`, and `LocationItem` all extend `BaseDetails` (id, createdAt, updatedAt) like other QB entities for consistency?

   _answer_
   yes.

---

## Second-round follow-ups

1. **Location.tiles vs tileData**  
   The type at the top shows `Location.tiles: Tile[]`. Your answer for the tileset question said locations have "a serialized blob of **TileData[]**, each associated to a **Tile**, which is associated to a **Tilemap**." Should `Location` store **tileData: TileData[]** (grid placements: which Tile at which x,y, plus isPassable, actionId) instead of `tiles: Tile[]`? And should each **TileData** include an **id** so that `LocationItem.tileId` and `Character.tileId` can point at a specific placement (e.g. `tileId` = TileData.id)?

   _answer_
   I've updated the type to correct this mistake. Location should have a TileData[] and each tiledata should have an id.

2. **Location width/height**  
   You said location has x, y, height, width for "position and size within the world editor." The doc also describes a grid inside the location with "height and width in grid squares." Should we have two sets of fields: (a) **x, y, nodeWidth?, nodeHeight?** for the world-editor node position/size, and (b) **gridWidth, gridHeight** for the interior tile grid (number of tiles), or is one width/height used for both (e.g. node size derived from grid size)?

   _answer_
   Yes, two sets. **nodeX, nodeY, nodeWidth, nodeHeight** and **gridHeight, gridWidth**.

3. **Tilemap scope**  
   Should **Tilemap** include **rulesetId** (like other ruleset-scoped entities) so tilemaps are per-ruleset and assets stay scoped correctly?

   _answer_
   No, tilemaps should be associated to a world. It is possible for a world to be created independently from a ruleset, so any models that inherently belong to the world should not reference rulesetId when possible.

---

## World and ruleset (resolved)

Worlds may be created independently (e.g. by a different user) but **must be associated to a ruleset** (`World.rulesetId` required). When adding characters and items to a location, the world editor pulls those entities using this association. Since characters have `rulesetId`, **LocationItem** also has **rulesetId**. Other entities (Location, Tilemap, Tile, etc.) do not need a ruleset reference—they are world-scoped.
