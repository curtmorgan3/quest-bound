I want to decouple the World model from a Ruleset. Worlds and all of its downstream associations (Location, Tile, Tilemap, etc) should be completely independent from a Ruleset.

That means assets could be associated to a world, location or tilemap directly without a ruleset.

Simlarly, characters and items (through the current LocationItem type) do not need a world id.

A new model, Campaign, will join a ruleset and a world. Something like

```ts
type Campaign = {
  id: string;
  rulesetId: string;
  worldId: string;
};
```

Characters will have a join with campaigns.

```ts
type CampaignCharacter = {
  characterId: string;
  campaignId: string;
  currentLocationId?: string;
  currentTileId?: string;
};
```

And similar for item instances

```ts
type CampaignItem = {
  id: string;
  itemId: string;
  campaignId: string;
  currentLocationId?: string;
  currentTileId?: string;
};
```

Plus a new model for joining scripts

```ts
type CampaignEvent = {
  id: string;
  label: string;
  campaignId: string;
  scriptId?: string;
};

type CampaignEventLocation = {
  id: string;
  campaignEventId: string;
  locationId: string;
};
```

Ask any follow ups and make notes here.

---

## Follow-ups and notes

### Summary of the shift

- **World** (and Location, Tile, Tilemap, etc.) no longer has `rulesetId`. Worlds are ruleset-agnostic; assets can attach to world/location/tilemap directly.
- **Campaign** is the new join: one ruleset + one world. All “which ruleset’s characters/items are in this world?” is campaign-scoped.
- **Character placement** moves from Character (worldId, locationId, tileId) to **CampaignCharacter** (characterId, campaignId, currentLocationId?, currentTileId?).
- **Item placement** moves from **LocationItem** (worldId, locationId, tileId) to **CampaignItem** (campaignId, currentLocationId?, currentTileId?). So LocationItem is effectively replaced by CampaignItem for “item instance placed in the world.”

### Naming and types

- **currentLocation / currentTile** — For storage we’d typically use IDs, e.g. `currentLocationId?: string` and `currentTileId?: string` (where `currentTileId` is a `TileData.id` so we know which tile/layer in the location). Suggest using `currentLocationId` and `currentTileId` in the types unless you want embedded objects.
- **Character** — Remove `worldId`, `locationId`, `tileId` once CampaignCharacter exists and is the source of truth for placement.

### Follow-up questions

1. **Creator flow (Phase 7)**  
   When the creator places characters/items in the location editor, they’re now placing _per campaign_. How do we choose the campaign?
   - Option A: Location editor is opened in a campaign context (e.g. route like `/worlds/:worldId/campaigns/:campaignId/locations/:locationId` or a campaign picker in the world editor).
   - Option B: There’s a “default” or “editor” campaign per world used only while building.
   - Option C: Something else (e.g. “place in all campaigns for this world”)?

   This should no longer happen the the location editor. We'll need some new tools:
   - WorldViewer - allows for world navigation in a read only state
   - LocationViewer - allows for viewing a location grid map in a read only state
   - CampaignEditor - create CampaignCharacters, CampaignItems and CampaignEvents

2. **LocationItem**  
   Should **LocationItem** be fully retired in favor of **CampaignItem** (and any “item on the map” is always a campaign item), or do we keep LocationItem for a different use (e.g. world-building-only props that aren’t campaign-specific)?

   Retire LocationItem.

3. **Assets on world/location/tilemap**  
   When you say assets can be associated to world, location, or tilemap directly: is that already in the current types (e.g. `assetId` on World/Tilemap) and we’re just clarifying that they’re not ruleset-scoped, or do we need new fields (e.g. `assetId` or an asset list on Location)?

   Assets should be given an optional worldId so we can track assets for exporting worlds.

4. **Multiple campaigns per world**  
   Confirming: one world can be used in many campaigns (same world, different rulesets), and the same character can appear in multiple campaigns with different placement per campaign. Is that the intended model?

   Yes.

5. **Campaign creation**  
   Where does the user create a Campaign (ruleset + world)? From the world editor (“Add ruleset to this world”), from the ruleset side (“Create campaign with this ruleset”), or a dedicated campaigns list/screen?

   There needs to be a dedicated campaigns workflow.
   - Creating a campaign by selecting a world and a ruleset
   - Editing a campaign per location (see above)
   - Playing a campaign by selecting a character
   - playing a campaign would use the same WorldViewer and LocationViewer, with the location viewer including the CampaignCharacters, CampaignItems and CampaignEvents.

Once these are decided, Phase 7 (and related docs) can be updated to be campaign-scoped and to use CampaignCharacter + CampaignItem instead of Character placement and LocationItem.

## Other thoughts

I forgot to mention scripts. Scripts should no longer be assignable to worlds. Instead, scripts can be associated directly to campaigns. I added new script entity types for location and tile. We'll need one more for 'campaign event'. We'll need an associated model for CampaignEvent that scripts can be attached to. These will surface as buttons to be attached to locations within campaigns.

I updated the types. Ask anything else you need to clarify.

---

## Consolidation notes (after your answers)

- **CampaignItem** — Aligned to `currentLocationId` / `currentTileId` (like CampaignCharacter) for normalized storage and consistency.
- **Summary of new UX:** Location editor stays for world-building only (grid, tiles, tile paint). No character/item placement there. New **CampaignEditor** is where you place CampaignCharacters, CampaignItems, and CampaignEvents per location; it uses **WorldViewer** and **LocationViewer** (read-only) for navigation. **Play campaign** also uses WorldViewer + LocationViewer, with LocationViewer showing campaign characters, items, and events. Dedicated campaigns workflow: create (world + ruleset) → edit (per-location placement/events) → play (select character).
- **Scripts:** No longer on world. Attach to campaigns via CampaignEvent (and possibly location/tile entity types). **One script per CampaignEvent** (scriptId on CampaignEvent).
