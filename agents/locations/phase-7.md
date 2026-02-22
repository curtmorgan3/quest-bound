# Phase 7: Campaign model, world decoupling, and read-only viewers

**Goal:** Introduce Campaign as the join between ruleset and world; decouple World from Ruleset. Add Campaign, CampaignCharacter, CampaignItem, CampaignEvent, and CampaignEventLocation. Retire LocationItem and character placement on Character. Add optional worldId to Asset. Implement campaign creation workflow and read-only WorldViewer and LocationViewer (no campaign placement yet).

**Depends on:** Phase 1, 2, 3, 4, 5, 6. World and location editors exist; location has grid and TileData. This phase updates the data model and adds campaign + viewers.

**Reference:** [locations.md](./locations.md), [adjustments.md](./adjustments.md). Campaign joins ruleset and world; placement is campaign-scoped via CampaignCharacter and CampaignItem. One script per CampaignEvent.

---

## Design summary

- **World** no longer has `rulesetId`. Worlds (and Location, Tile, Tilemap) are ruleset-agnostic. **Asset** gets optional `worldId` for tracking/export.
- **Character** loses `worldId`, `locationId`, `tileId`; placement is only via **CampaignCharacter** (currentLocationId, currentTileId).
- **LocationItem** is retired; **CampaignItem** replaces it (campaignId, currentLocationId, currentTileId).
- **Campaign** = id, rulesetId, worldId. **CampaignCharacter** = characterId, campaignId, currentLocationId?, currentTileId?. **CampaignItem** = id, itemId, campaignId, currentLocationId?, currentTileId?. **CampaignEvent** = id, label, campaignId, scriptId?. **CampaignEventLocation** = id, campaignEventId, locationId (events surface as buttons on locations in a campaign).
- **WorldViewer** and **LocationViewer** are read-only UI for navigating world and location grid; used later by CampaignEditor and Play. No campaign data rendered in this phase.

---

## Tasks

### 7.1 Types and schema changes

| Task | File(s) | Notes |
|------|--------|--------|
| Add `Campaign`, `CampaignCharacter`, `CampaignItem`, `CampaignEvent`, `CampaignEventLocation` types. Campaign has id, rulesetId, worldId. CampaignCharacter: characterId, campaignId, currentLocationId?, currentTileId?. CampaignItem: id, itemId, campaignId, currentLocationId?, currentTileId?. CampaignEvent: id, label, campaignId, scriptId?. CampaignEventLocation: id, campaignEventId, locationId. All extend BaseDetails where appropriate. | `src/types/` | |
| Remove `rulesetId` from `World`. Add optional `worldId?: string` to Asset (or asset type used for world export). | Same | Migration: existing worlds have rulesetId; decide migration path (e.g. create a Campaign per world with that rulesetId, then drop column). |
| Remove `worldId`, `locationId`, `tileId` from `Character`. | Same | Optional migration: move existing placement into CampaignCharacter if a campaign exists. |
| Remove or deprecate `LocationItem` type and table; document replacement by CampaignItem. | Same + Dexie | Delete LocationItem table in schema; migrate or drop data. |
| Export new types from types barrel. | `src/types/index.ts` | |

### 7.2 Dexie schema

| Task | File(s) | Notes |
|------|--------|--------|
| Add tables: campaigns, campaignCharacters, campaignItems, campaignEvents, campaignEventLocations. Indexes: campaigns by rulesetId, worldId; campaignCharacters by campaignId, characterId; campaignItems by campaignId; campaignEvents by campaignId; campaignEventLocations by campaignEventId, locationId. | Dexie schema | |
| Remove World.rulesetId from schema; add Asset.worldId if stored in same DB. Remove Character worldId, locationId, tileId. Remove locationItems table. Bump schema version; add migration. | Same | |

### 7.3 Hooks and API

| Task | File(s) | Notes |
|------|--------|--------|
| useCampaigns(): list campaigns (e.g. all or by rulesetId/worldId). useCampaign(campaignId): single campaign. createCampaign({ rulesetId, worldId }), updateCampaign, deleteCampaign. | `src/lib/compass-api/hooks/` or equivalent | |
| useCampaignCharacters(campaignId): list join records; useCampaignCharacter(campaignId, characterId) or by id. createCampaignCharacter(campaignId, characterId, { currentLocationId?, currentTileId? }), updateCampaignCharacter, deleteCampaignCharacter. | Same | |
| useCampaignItems(campaignId): list; createCampaignItem(campaignId, { itemId, currentLocationId?, currentTileId? }), updateCampaignItem, deleteCampaignItem. | Same | |
| useCampaignEvents(campaignId): list events. useCampaignEventLocations(campaignEventId) or by campaignId. createCampaignEvent(campaignId, { label, scriptId? }), updateCampaignEvent, deleteCampaignEvent. createCampaignEventLocation(campaignEventId, locationId), delete. | Same | |
| Update world/location hooks if they referenced World.rulesetId or LocationItem. Remove useLocationItems or replace usages with campaign-scoped hooks where needed. | Various | |
| Characters and items for a campaign: filter by campaign.rulesetId (e.g. useCharacter / db.characters.where('rulesetId').equals(campaign.rulesetId); items by rulesetId). | Same | |

### 7.4 Campaign creation workflow

| Task | File(s) | Notes |
|------|--------|--------|
| Dedicated campaigns entry: e.g. "Campaigns" in nav or home. List campaigns (useCampaigns). "Create campaign" → select a world (useWorlds) and a ruleset (useRulesets or list); create campaign with chosen worldId and rulesetId; navigate to campaign context (e.g. campaign editor or campaign detail). | New page(s) e.g. `src/pages/campaigns/` | Route suggestion: `/campaigns`, `/campaigns/new`, `/campaigns/:campaignId`. |
| Campaign detail or shell: show campaign info (world label, ruleset label), links to "Edit campaign" (Phase 8) and "Play" (Phase 8). | Same | |

### 7.5 WorldViewer

| Task | File(s) | Notes |
|------|--------|--------|
| WorldViewer component: read-only world canvas (e.g. same as world editor canvas but no edit controls). Load world (useWorld), locations (useLocations(worldId)). Render location nodes; click a location → callback (e.g. onSelectLocation(locationId)) for parent to handle. Zoom/pan OK. No create/delete/edit. | e.g. `src/components/worlds/world-viewer.tsx` or pages | Reuse layout/canvas from world editor if possible; strip editing. |
| On **double-click** a location: if that location **has a map** (e.g. location.hasMap or equivalent), show a **tooltip menu** with two options: **"Advance to location"** (WorldViewer: e.g. drill into / set as current location in world context) and **"Open map"** (open LocationViewer for that location). If the location has no map, double-click can invoke a single default action (e.g. advance or callback). | Same | Parent or viewer handles menu choice; callbacks e.g. onAdvanceToLocation(locationId), onOpenMap(locationId). |
| Use WorldViewer in a minimal route or campaign shell so it can be used in Phase 8 for "navigate to a location" (CampaignEditor and Play). | Routes / campaign shell | |

### 7.6 LocationViewer

| Task | File(s) | Notes |
|------|--------|--------|
| LocationViewer component: read-only location grid. Load location (useLocation), render grid (gridWidth × gridHeight), TileData from location.tiles. Draw tiles (Tile → Tilemap → asset slice). No paint, no property panel, no mode switching. Optional: callback on cell click (e.g. onSelectCell(x, y) or onSelectTileData(tileData)) for Phase 8. | e.g. `src/components/locations/location-viewer.tsx` | Same dimensions and tile rendering as location editor; no editing. |
| Use LocationViewer in a minimal route or campaign shell so Phase 8 can embed it when editing or playing a campaign. | Same | |

---

## Exit criteria

- [ ] World has no rulesetId; Asset has optional worldId. Character has no worldId/locationId/tileId. LocationItem is removed.
- [ ] Campaign, CampaignCharacter, CampaignItem, CampaignEvent, CampaignEventLocation types and tables exist with appropriate indexes.
- [ ] Hooks: useCampaigns, useCampaign, useCampaignCharacters, useCampaignItems, useCampaignEvents, useCampaignEventLocations, and CRUD for each. Characters/items for a campaign filtered by campaign.rulesetId.
- [ ] User can create a campaign by selecting a world and a ruleset; campaigns are listed.
- [ ] WorldViewer shows a read-only world canvas; clicking a location notifies parent (e.g. locationId). Double-clicking a location with a map shows a tooltip menu: "Advance to location" (WorldViewer) or "Open map" (LocationViewer).
- [ ] LocationViewer shows a read-only location grid with tiles; no editing.
- [ ] No regression in world editor or location editor (grid, tile paint, tile properties). Editors no longer reference rulesetId on world for character/item lists (those move to campaign context in Phase 8).

---

## Implementation prompt

Use this prompt when implementing Phase 7:

```
Implement Phase 7 of the Worlds & Locations feature: Campaign model, decouple World from Ruleset, and read-only WorldViewer and LocationViewer.

Context:
- Phases 1–6 are done: World (currently with rulesetId), Location, TileData, Tilemap, Tile, LocationItem, Character (with worldId, locationId, tileId). World editor and location editor exist.
- Read agents/locations/adjustments.md and agents/locations/phase-7.md.

Do the following:

1. **Types and schema**
   - Add Campaign (id, rulesetId, worldId), CampaignCharacter (characterId, campaignId, currentLocationId?, currentTileId?), CampaignItem (id, itemId, campaignId, currentLocationId?, currentTileId?), CampaignEvent (id, label, campaignId, scriptId?), CampaignEventLocation (id, campaignEventId, locationId). Extend BaseDetails where appropriate.
   - Remove rulesetId from World. Add optional worldId to Asset. Remove worldId, locationId, tileId from Character. Retire LocationItem (remove type and table). Bump Dexie schema version; add migration for existing data.

2. **Hooks**
   - Campaigns: useCampaigns, useCampaign, createCampaign, updateCampaign, deleteCampaign.
   - CampaignCharacter: useCampaignCharacters(campaignId), create/update/delete.
   - CampaignItem: useCampaignItems(campaignId), create/update/delete.
   - CampaignEvent: useCampaignEvents(campaignId), create/update/delete. CampaignEventLocation: useCampaignEventLocations(campaignEventId), create/delete.
   - When needing characters or items for a campaign, filter by campaign.rulesetId.

3. **Campaign creation**
   - Dedicated campaigns workflow: list campaigns, "Create campaign" → select world + ruleset → create campaign; routes e.g. /campaigns, /campaigns/new, /campaigns/:campaignId.

4. **WorldViewer**
   - Read-only world canvas: load world and locations, render location nodes, zoom/pan. On location click, callback with locationId. On location double-click: if location has a map (e.g. hasMap), show a tooltip menu with "Advance to location" (WorldViewer drill-in/set current) and "Open map" (open LocationViewer for that location); parent handles choice via callbacks (e.g. onAdvanceToLocation, onOpenMap).

5. **LocationViewer**
   - Read-only location grid: load location, render grid and tiles from location.tiles (same rendering as location editor). No paint or property panel. Optional callback on cell/tile click for Phase 8.

Update world/location editor code that relied on World.rulesetId or LocationItem so the app still builds. Do not implement campaign placement or play yet (Phase 8).
```
