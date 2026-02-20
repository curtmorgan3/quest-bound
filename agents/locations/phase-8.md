# Phase 8: Campaign editor and play campaign

**Goal:** CampaignEditor lets the creator place CampaignCharacters, CampaignItems, and CampaignEvents per location (using WorldViewer and LocationViewer for navigation). Play campaign lets a player select a character in the campaign and view the world/location with campaign characters, items, and events; link to character sheet.

**Depends on:** Phase 7. Campaign model, hooks, campaign creation, WorldViewer, and LocationViewer exist. World and location editors remain for world-building only (no placement there).

**Reference:** [locations.md](./locations.md), [adjustments.md](./adjustments.md). Placement is campaign-scoped. CampaignEvent has one scriptId; CampaignEventLocation links events to locations; events surface as buttons on locations in a campaign.

---

## Design summary

- **CampaignEditor:** Opens in campaign context (e.g. `/campaigns/:campaignId/edit`). Uses WorldViewer to navigate the campaign’s world; selecting a location opens LocationViewer for that location. On the location view, creator can: place CampaignCharacters (characters from campaign.rulesetId), place CampaignItems (items from campaign.rulesetId), add CampaignEvents and attach them to the current location (CampaignEventLocation). Events appear as buttons on the location. One script per CampaignEvent. Resolve tile for placement using one TileData.id per cell (e.g. topmost by zIndex).
- **Play campaign:** User selects a campaign and a character (CampaignCharacter for that campaign). View world via WorldViewer and location via LocationViewer; LocationViewer shows CampaignCharacters, CampaignItems, and CampaignEvents for the current location. Tile actions (TileData.actionId) still apply. Link to character sheet and back.

---

## Tasks

### 8.1 Campaign editor – shell and navigation

| Task | File(s) | Notes |
|------|--------|--------|
| Route for campaign edit, e.g. `/campaigns/:campaignId/edit`. Load campaign (useCampaign); load world (useWorld(campaign.worldId)) and locations (useLocations(campaign.worldId)). | Campaign editor page | |
| Render WorldViewer with campaign’s world; on location select, set “current location” and show LocationViewer for that location. Breadcrumb or context: Campaign > World > [Location name]. | Same | |
| Optional: sidebar or list of locations in the campaign’s world to jump to a location. | Same | |

### 8.2 Campaign editor – place characters

| Task | File(s) | Notes |
|------|--------|--------|
| In campaign editor, when a location is shown in LocationViewer: “Place character” mode or button. List characters for campaign.rulesetId (e.g. db.characters.where('rulesetId').equals(campaign.rulesetId) or useCharacter filtered). User selects a character, then clicks a cell that has at least one TileData. Resolve one TileData.id (e.g. topmost by zIndex) for that cell. Create or update CampaignCharacter: set currentLocationId to current location, currentTileId to that TileData.id. If character already in campaign, updateCampaignCharacter; else createCampaignCharacter. | Campaign editor | |
| Render CampaignCharacters on LocationViewer when in edit mode: for each CampaignCharacter with currentLocationId === current location.id, find TileData.id === currentTileId and draw character there (avatar or sprite from character). | Same | Use read-only LocationViewer but overlay campaign entities for this location. |
| “Remove from location” or “Move”: clear currentLocationId/currentTileId to remove; or set new currentTileId (and optionally currentLocationId) to move. | Same | |

### 8.3 Campaign editor – place items

| Task | File(s) | Notes |
|------|--------|--------|
| “Place item” mode: list items from campaign.rulesetId (e.g. db.items.where('rulesetId').equals(campaign.rulesetId)). User picks item, then clicks a cell with TileData. Resolve one TileData.id (e.g. topmost). createCampaignItem(campaignId, { itemId, currentLocationId: location.id, currentTileId }). | Campaign editor | |
| Render CampaignItems on LocationViewer: for each CampaignItem with currentLocationId === current location.id, draw at tile matching currentTileId (icon or item label). | Same | |
| Remove: deleteCampaignItem. Move: updateCampaignItem with new currentLocationId/currentTileId. | Same | |

### 8.4 Campaign editor – campaign events

| Task | File(s) | Notes |
|------|--------|--------|
| “Add event” or similar: create CampaignEvent (campaignId, label, scriptId optional). Attach to current location: create CampaignEventLocation(campaignEventId, locationId). List script entity type for “campaign event” so user can pick a script (one per event). | Campaign editor | |
| On LocationViewer (edit mode), show events for this location: list CampaignEventLocations for locationId, resolve CampaignEvent for each; display as buttons (label; optional run script). Remove: delete CampaignEventLocation and optionally CampaignEvent. | Same | |
| Events “surface as buttons to be attached to locations within campaigns” (adjustments.md). UI: e.g. a list or bar of event buttons for the current location; creator can add/remove/reorder or edit label and script. | Same | |

### 8.5 Campaign editor – UI clarity

| Task | File(s) | Notes |
|------|--------|--------|
| Clear mode or toolbar: e.g. “Navigate” / “Place character” / “Place item” / “Manage events”. When a placed character or item is selected, show remove/move. Use existing design system (@/components). | Campaign editor | |

### 8.6 Play campaign – entry and viewer

| Task | File(s) | Notes |
|------|--------|--------|
| Play entry: from campaign detail or list, “Play” → select a character that is in this campaign (CampaignCharacter for this campaignId). Or: “Play as [character name]” if only one. Route e.g. `/campaigns/:campaignId/play` with character in context (query or state). | Play campaign page | |
| Load campaign and chosen character’s CampaignCharacter record (currentLocationId, currentTileId). Load world and locations. Render WorldViewer; current location = CampaignCharacter.currentLocationId. Show LocationViewer for current location. | Same | |
| LocationViewer in play mode: render tiles (from location.tiles), plus CampaignCharacters with currentLocationId === location.id (at their currentTileId), CampaignItems same, and CampaignEvents for this location (CampaignEventLocation) as buttons. TileData.actionId: clickable to run ruleset action. | Same | |
| Link “Character sheet” to `/characters/:characterId` (or app’s character route) and “Back to location” or “Back to campaign” so player can switch between sheet and location view. | Same | |

### 8.7 Play campaign – navigation between locations

| Task | File(s) | Notes |
|------|--------|--------|
| Allow player to move to another location: e.g. list of child locations of current, or list of locations in world. On select, update CampaignCharacter’s currentLocationId and currentTileId (e.g. to a default tile in the new location). Re-render LocationViewer for new location. | Play campaign | |
| Optional: “exits” or tile actions that trigger location change; same idea—update CampaignCharacter placement and refresh view. | Same | |

---

## Exit criteria

- [ ] Creator can open campaign edit, navigate world and locations via WorldViewer and LocationViewer, and place CampaignCharacters and CampaignItems on tiles (currentLocationId, currentTileId).
- [ ] Creator can remove or move placed characters and items in the campaign editor.
- [ ] Creator can add CampaignEvents (with optional script), attach them to locations (CampaignEventLocation), and see them as buttons on the location; can remove events.
- [ ] Character and item lists in campaign editor are filtered by campaign.rulesetId.
- [ ] Player can start play for a campaign by selecting a character (in that campaign); view world and current location with campaign characters, items, and event buttons; use tile actions.
- [ ] Player can navigate to another location and see the update; can switch between character sheet and location view.
- [ ] No regression in world editor, location editor, or Phase 7 campaign creation and viewers.

---

## Implementation prompt

Use this prompt when implementing Phase 8:

```
Implement Phase 8 of the Worlds & Locations feature: Campaign editor and Play campaign.

Context:
- Phase 7 is done: Campaign, CampaignCharacter, CampaignItem, CampaignEvent, CampaignEventLocation; World without rulesetId; Character without placement; LocationItem retired. WorldViewer and LocationViewer exist (read-only). Campaign creation workflow exists.
- Read agents/locations/adjustments.md, agents/locations/phase-7.md, and agents/locations/phase-8.md.

Do the following:

1. **Campaign editor**
   - Route /campaigns/:campaignId/edit. Use WorldViewer to navigate campaign’s world; on location select, show LocationViewer for that location. Breadcrumb: Campaign > World > Location.
   - Place character: list characters by campaign.rulesetId; user selects character and clicks a cell with TileData; resolve one TileData.id (topmost by zIndex); create/update CampaignCharacter with currentLocationId and currentTileId. Render CampaignCharacters on LocationViewer for this location. Remove/move: clear or update currentLocationId/currentTileId.
   - Place item: list items by campaign.rulesetId; select item, click cell; create CampaignItem with currentLocationId, currentTileId. Render CampaignItems on LocationViewer. Remove/move via update/delete.
   - Campaign events: create CampaignEvent (label, scriptId optional); attach to location via CampaignEventLocation. Show events for current location as buttons (label; one script per event). Allow add/remove. Script entity type for “campaign event” as needed.
   - Clear UI modes: e.g. Navigate / Place character / Place item / Manage events. Use existing design system.

2. **Play campaign**
   - Entry: from campaign, “Play” and select a character in the campaign (CampaignCharacter). Route e.g. /campaigns/:campaignId/play with character in context.
   - Render WorldViewer and LocationViewer for campaign’s world and character’s current location. LocationViewer shows tiles, CampaignCharacters, CampaignItems, and CampaignEvents (as buttons) for that location. TileData.actionId: click to run ruleset action.
   - Link to character sheet and back. Allow moving to another location (update CampaignCharacter currentLocationId/currentTileId and refresh).

Follow existing patterns and tech stack. Do not add character/item placement to the location editor (that stays world-building only).
```
