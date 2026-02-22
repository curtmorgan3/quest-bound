# Phase 1: Data model & persistence

**Goal:** Add types and Dexie schema for worlds, tilemaps, tiles, locations, and location items; extend Character. No UI.

**Depends on:** Nothing (first phase).

**Reference:** [locations.md](./locations.md) for the full data model; [worlds-plan.md](./worlds-plan.md) for the overall plan.

---

## Data model summary

All DB entities extend `BaseDetails` (id, createdAt, updatedAt).

| Entity                 | Key fields                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **World**              | label, rulesetId (required), assetId?                                                                            |
| **Tilemap**            | worldId, assetId, tileHeight, tileWidth                                                                          |
| **Tile**               | tilemapId?, tileX?, tileY? (slice of tilemap image)                                                              |
| **TileData**           | Not a DB table. `{ id, tileId, x, y, isPassable, actionId? }`; stored inside `Location.tiles`.                   |
| **Location**           | label, worldId, nodeX, nodeY, nodeWidth, nodeHeight, parentLocationId?, gridWidth, gridHeight, tiles: TileData[] |
| **LocationItem**       | itemId, rulesetId, worldId, locationId, tileId (tileId = TileData.id), sprites?: string[]                        |
| **Character** (extend) | sprites?: string[], worldId?, locationId?, tileId? (all optional)                                                |

---

## Tasks

### 1.1 Types

| Task                                                                                                                                                                                            | File(s)                                        | Notes                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| Add `World`, `Tilemap`, `Tile`, `TileData`, `Location`, `LocationItem` types. World, Tilemap, Tile, Location, LocationItem extend `BaseDetails`. `TileData` is a plain interface (not a table). | `src/types/data-model-types.ts`                | Import `BaseDetails` from helper-types. |
| Extend `Character` with optional `sprites?: string[]`, `worldId?: string`, `locationId?: string`, `tileId?: string`.                                                                            | `src/types/data-model-types.ts`                | Keeps existing characters valid.        |
| Ensure new types are exported from the types barrel so `@/types` exposes them.                                                                                                                  | `src/types/index.ts` (or existing type barrel) |                                         |

### 1.2 Dexie schema

| Task                                                                                                                                                                                                                                                                                                                    | File(s)                   | Notes                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------ |
| Add schema entries for `worlds`, `tilemaps`, `tiles`, `locations`, `locationItems`. Use the same `common` pattern: `++id, createdAt, updatedAt`. Add indexes: worlds by rulesetId; tilemaps by worldId; tiles by tilemapId; locations by worldId and parentLocationId; locationItems by worldId, locationId, rulesetId. | `src/stores/db/schema.ts` | Follow existing table format in that file. |
| Bump `dbSchemaVersion` (e.g. to 32).                                                                                                                                                                                                                                                                                    | `src/stores/db/schema.ts` |                                            |

### 1.3 Dexie DB instance

| Task                                                                                                               | File(s)               | Notes                                           |
| ------------------------------------------------------------------------------------------------------------------ | --------------------- | ----------------------------------------------- |
| Add `worlds`, `tilemaps`, `tiles`, `locations`, `locationItems` to the Dexie typings (the `Dexie & { ... }` type). | `src/stores/db/db.ts` | Use `EntityTable<World, 'id'>` etc.             |
| Add the new tables to the schema passed to `db.version().stores()`.                                                | `src/stores/db/db.ts` | Schema is in schema.ts; db imports and uses it. |
| Import the new types at the top of db.ts.                                                                          | `src/stores/db/db.ts` |                                                 |

### 1.4 DB hooks (optional for Phase 1)

| Task                                                                                                                                                             | File(s)                                                               | Notes                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| Defer cascade deletes to Phase 2 unless you want them now. If implementing: e.g. on world delete, delete locations, tilemaps, and location items for that world. | `src/stores/db/hooks/world-hooks.ts` (new), register in `db-hooks.ts` | Optional; can be done in Phase 2. |

---

## Exit criteria

- [ ] All new types exist in `data-model-types.ts` and are exported.
- [ ] Character type includes optional sprites, worldId, locationId, tileId.
- [ ] Dexie schema includes the five new tables with correct indexes; schema version bumped.
- [ ] `db.ts` opens without error and exposes the new tables.
- [ ] Existing app behavior is unchanged (no UI uses the new types yet).

---

## Implementation prompt

Use this prompt when implementing Phase 1:

```
Implement Phase 1 of the Worlds & Locations feature: data model and persistence only (no UI).

Context:
- Read agents/locations/locations.md for the full data model.
- Read agents/locations/phase-1.md for the exact tasks.

Do the following:

1. **Types (src/types/data-model-types.ts)**
   - Add World, Tilemap, Tile, Location, and LocationItem as types extending BaseDetails (from helper-types). Include all fields from locations.md (World: label, rulesetId, assetId?; Tilemap: worldId, assetId, tileHeight, tileWidth; Tile: tilemapId?, tileX?, tileY?; Location: label, worldId, nodeX, nodeY, nodeWidth, nodeHeight, parentLocationId?, gridWidth, gridHeight, tiles: TileData[]; LocationItem: itemId, rulesetId, worldId, locationId, tileId).
   - Add TileData as a non-DB interface: { id: string; tileId: string; x: number; y: number; isPassable: boolean; actionId?: string }.
   - Extend Character with optional sprites?: string[], worldId?: string, locationId?: string, tileId?: string.
   - Export any new types from the types barrel so @/types exposes them.

2. **Dexie schema (src/stores/db/schema.ts)**
   - Add table definitions for worlds, tilemaps, tiles, locations, locationItems using the same common pattern (++id, createdAt, updatedAt) and add indexes: worlds (rulesetId), tilemaps (worldId), tiles (tilemapId), locations (worldId, parentLocationId), locationItems (worldId, locationId, rulesetId).
   - Bump dbSchemaVersion (e.g. to 32).

3. **Dexie DB (src/stores/db/db.ts)**
   - Import the new types.
   - Add the five new tables to the Dexie typings (EntityTable<World, 'id'> etc.) and ensure the schema from schema.ts is applied.

Do not add any UI, routes, or hooks. Verify the app still builds and the database opens without errors.
```
