# Phase 7 implementation notes

Implemented Phase 7 (Campaign model, world decoupling, read-only viewers) with the following decisions:

- **World.rulesetId:** Kept as optional deprecated field on the type so existing code (location editor, tilemap editor, scripts) that still reads it from the DB continues to work. New worlds are created without it; migration 36→37 creates a Campaign for each world that had rulesetId. Schema still indexes rulesetId on worlds to avoid table recreation.
- **createWorld:** No longer requires rulesetId; home worlds form creates world with label (and optional image) only.
- **useWorlds():** No longer accepts rulesetId; returns all worlds.
- **LocationItem:** Type and table removed. useLocationItems hook and folder removed. deleteWorld and deleteLocation updated to use campaign/campaignEventLocation cascades instead.
- **Campaign hooks:** All campaign join hooks use explicit `Promise<Entity[]>` return type in useLiveQuery to satisfy TypeScript.
- **WorldViewer:** Read-only ReactFlow canvas; single-click → onSelectLocation; double-click on location with hasMap → tooltip menu "Advance to location" / "Open map". Uses a view-only node component (no NodeResizer).
- **LocationViewer:** Read-only grid; takes locationId, worldId, getAssetData, optional onSelectCell and tileRenderSize.
- **Campaign world view:** Route `/campaigns/:campaignId/view` shows WorldViewer for the campaign's world; "Open map" switches to LocationViewer for that location.
- **Sidebar:** Added "Campaigns" to homepage items; removed "Scripts" from world route items (scripts are campaign-scoped per adjustments).
- **Asset.worldId:** Added to type only (no schema index) to avoid recreating assets table; can be set for export tracking.
