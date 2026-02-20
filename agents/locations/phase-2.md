# Phase 2: API layer (hooks)

**Goal:** Add React-facing hooks to read/write worlds, locations, tilemaps, tiles, and location items; extend character hooks so callers can set sprites and location fields. No UI yet.

**Depends on:** Phase 1 (types and Dexie tables must exist).

**Reference:** [locations.md](./locations.md), [worlds-plan.md](./worlds-plan.md). Follow patterns in `src/lib/compass-api/hooks/characters/use-character.ts` and `src/lib/compass-api/hooks/rulesets/use-rulesets.ts`.

---

## Tasks

### 2.1 World hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useWorlds(rulesetId?: string)` — list all worlds, or filter by rulesetId when provided. Use `useLiveQuery` and `db.worlds`. | `src/lib/compass-api/hooks/worlds/use-worlds.ts` | Follow useRulesets/useCharacter pattern. |
| Implement `useWorld(worldId: string | undefined)` — single world by id. Use `useLiveQuery` and `db.worlds.get(worldId)`. | `src/lib/compass-api/hooks/worlds/use-world.ts` | |
| In useWorlds (or a shared mutations helper): `createWorld(data)`, `updateWorld(id, data)`, `deleteWorld(id)`. On delete, cascade: delete locations, tilemaps, and location items for that world (either in hook or in a DB hook). | Same or `use-world-mutations.ts` | |
| Create `src/lib/compass-api/hooks/worlds/index.ts` and export the world hooks. Add worlds to the main compass-api hooks index. | `src/lib/compass-api/hooks/worlds/index.ts`, `src/lib/compass-api/hooks/index.ts` | |

### 2.2 Location hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useLocations(worldId: string | undefined)` — list locations where worldId matches. Use index on worldId. | `src/lib/compass-api/hooks/locations/use-locations.ts` | |
| Implement `useLocation(locationId: string | undefined)` — single location by id. | `src/lib/compass-api/hooks/locations/use-location.ts` | |
| Implement createLocation(worldId, data), updateLocation(id, data), deleteLocation(id). updateLocation must support patching `tiles` (TileData[]). On delete, delete location items for that location. | Same or mutations | |
| Create locations index and export from main hooks index. | `src/lib/compass-api/hooks/locations/index.ts`, main index | |

### 2.3 Tilemap and Tile hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useTilemaps(worldId: string | undefined)` and `useTilemap(tilemapId: string | undefined)`. | `src/lib/compass-api/hooks/tilemaps/use-tilemaps.ts`, `use-tilemap.ts` | |
| Implement createTilemap, updateTilemap, deleteTilemap. | Same or mutations | |
| Implement `useTiles(tilemapId: string | undefined)` — list Tile entities for a tilemap. Implement createTile, updateTile, deleteTile. | `src/lib/compass-api/hooks/tiles/use-tiles.ts` | |
| Create tilemaps and tiles index files; export from main compass-api hooks index. | `tilemaps/index.ts`, `tiles/index.ts`, main index | |

### 2.4 LocationItem hooks

| Task | File(s) | Notes |
|------|--------|--------|
| Implement `useLocationItems(worldId?: string, locationId?: string)` — filter by worldId and optionally locationId. | `src/lib/compass-api/hooks/location-items/use-location-items.ts` | |
| Implement createLocationItem, updateLocationItem, deleteLocationItem. | Same | |
| Export from location-items index and main index. | `location-items/index.ts`, main index | |

### 2.5 Character hook extensions

| Task | File(s) | Notes |
|------|--------|--------|
| Ensure `updateCharacter` (or the character update path in useCharacter) accepts and persists `sprites`, `worldId`, `locationId`, `tileId`. No breaking changes to existing callers. | `src/lib/compass-api/hooks/characters/use-character.ts` | |

---

## Exit criteria

- [ ] useWorlds, useWorld, and world create/update/delete exist and are exported.
- [ ] useLocations, useLocation, and location create/update/delete exist and are exported.
- [ ] useTilemaps, useTilemap, useTiles, and tilemap/tile create/update/delete exist and are exported.
- [ ] useLocationItems and location item mutations exist and are exported.
- [ ] Character update path supports sprites, worldId, locationId, tileId.
- [ ] No new UI or routes; app still runs and can be exercised via console or future phases.

---

## Implementation prompt

Use this prompt when implementing Phase 2:

```
Implement Phase 2 of the Worlds & Locations feature: the API layer (hooks) only. No UI or new routes.

Context:
- Phase 1 is done: types and Dexie tables for worlds, tilemaps, tiles, locations, locationItems exist. Character is extended with optional sprites, worldId, locationId, tileId.
- Read agents/locations/phase-2.md for the exact tasks.
- Use existing patterns from src/lib/compass-api/hooks/characters/use-character.ts and src/lib/compass-api/hooks/rulesets/use-rulesets.ts (useLiveQuery, db.*, create/update/delete).

Do the following:

1. **World hooks**
   - Create src/lib/compass-api/hooks/worlds/use-worlds.ts: useWorlds(rulesetId?), createWorld, updateWorld, deleteWorld. When deleting a world, cascade delete its locations, tilemaps, and location items.
   - Create use-world.ts: useWorld(worldId) for a single world.
   - Create worlds/index.ts and export from the main compass-api hooks index.

2. **Location hooks**
   - Create src/lib/compass-api/hooks/locations/use-locations.ts and use-location.ts. useLocations(worldId), useLocation(locationId). Add createLocation, updateLocation (support patching tiles: TileData[]), deleteLocation. On delete, remove location items for that location.
   - Create locations/index.ts and export from main index.

3. **Tilemap and Tile hooks**
   - Create src/lib/compass-api/hooks/tilemaps/use-tilemaps.ts and use-tilemap.ts. useTilemaps(worldId), useTilemap(tilemapId). Add create/update/delete tilemap.
   - Create src/lib/compass-api/hooks/tiles/use-tiles.ts. useTiles(tilemapId). Add create/update/delete Tile.
   - Create tilemaps/index.ts and tiles/index.ts; export from main index.

4. **LocationItem hooks**
   - Create src/lib/compass-api/hooks/location-items/use-location-items.ts. useLocationItems(worldId?, locationId?), createLocationItem, updateLocationItem, deleteLocationItem.
   - Create location-items/index.ts and export from main index.

5. **Character**
   - In src/lib/compass-api/hooks/characters/use-character.ts, ensure updateCharacter (or the update path) accepts and persists sprites, worldId, locationId, tileId. Do not break existing usage.

Do not add any new pages, routes, or UI components. Verify the app builds and that the new hooks are exported from the compass-api hooks public API.
```
