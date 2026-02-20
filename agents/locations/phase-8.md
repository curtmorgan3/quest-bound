# Phase 8: Campaign editor and play campaign

**Goal:** CampaignEditor lets the creator place CampaignCharacters, CampaignItems, and CampaignEvents per location (using WorldViewer and LocationViewer for navigation). Play campaign lets a player select a character in the campaign and view the world/location with campaign characters, items, and events; link to character sheet.

**Depends on:** Phase 7. Campaign model, hooks, campaign creation, WorldViewer, and LocationViewer exist. World and location editors remain for world-building only (no placement there).

**Reference:** [locations.md](./locations.md), [adjustments.md](./adjustments.md). Placement is campaign-scoped. CampaignEvent has one scriptId; CampaignEventLocation links events to locations; events surface as buttons on locations in a campaign.

---

## Design summary

- **Campaign editor flow:** Open campaign → Edit campaign → WorldViewer starts at root location. Use WorldViewer to move between locations. Open a map when the location has a map (hasMap). On the location map, **click a tile** → choose **Add Character** | **Add Item** | **Add Event**.
  - **Add Character:** Select an archetype from the campaign’s ruleset. Creates a Character (from that archetype) and a CampaignCharacter with placement on the clicked tile. Character is drawn using sprite, else image, else placeholder. Adding a character to a campaign (Phase 7) creates a CampaignCharacter; placement is updated through that record. To move a character: navigate to the target location and select a tile there.
  - **Add Item:** Select an item from the campaign’s ruleset. Creates a CampaignItem with placement on the clicked tile (currentLocationId, currentTileId). Same item can be placed multiple times (multiple CampaignItem records). Draw with sprite > image > placeholder. Remove/move via delete or update (move = navigate to target location and select tile).
  - **Add Event:** Enter a name and select type: **On Enter** | **On Leave** | **On Activate**. Creates a CampaignEvent (with type) and attaches it to the current location and **that tile** (CampaignEventLocation has locationId + tileId). **One event per tile.** The tile is highlighted to indicate the event. Script wiring (running scripts when events fire) is Phase 9.
- **Play campaign:** User selects a campaign and a character (CampaignCharacter). View world via WorldViewer and location via LocationViewer; LocationViewer shows tiles, CampaignCharacters, CampaignItems, and CampaignEvents for the current location (events as buttons or tile highlights). Tile actions (TileData.actionId) apply. Link to character sheet and back. When moving to another location, set currentTileId to the **first passable tile** (TileData.isPassable) in the new location.
- **Breadcrumb:** Campaign > [World name] > [Location name].

---

## Tasks

### 8.1 Campaign editor – shell and navigation

| Task                                                                                                                                                                                       | File(s)              | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----- |
| Route for campaign edit, e.g. `/campaigns/:campaignId/edit`. Load campaign (useCampaign); load world (useWorld(campaign.worldId)) and locations (useLocations(campaign.worldId)).          | Campaign editor page |       |
| Start WorldViewer at **root location** (e.g. root of the world’s location tree). On location select, set “current location” and show LocationViewer when that location has a map (hasMap). Breadcrumb: **Campaign > [World name] > [Location name]**. | Same                 |       |
| Optional: sidebar or list of locations in the campaign’s world to jump to a location.                                                                                                      | Same                 |       |

### 8.2 Campaign editor – place characters

| Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | File(s)         | Notes                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| When a location with a map is shown in LocationViewer: **click a tile** (cell with at least one TileData) → show context menu with “Add Character”, “Add Item”, “Add Event”. For **Add Character:** user selects an **archetype** from the campaign’s ruleset (db.archetypes.where('rulesetId').equals(campaign.rulesetId)). Create a new **Character** from that archetype (use existing character-creation flow, e.g. createCharacter with archetypeIds) and a **CampaignCharacter** with currentLocationId, currentTileId (resolve one TileData.id per cell, e.g. topmost by zIndex). Adding a character to a campaign creates the CampaignCharacter; placement is set here. | Campaign editor | Only way to add a character in campaign edit is by clicking a tile and choosing Add Character → archetype.                                   |
| Render CampaignCharacters on LocationViewer when in edit mode: for each CampaignCharacter with currentLocationId === current location.id, find TileData.id === currentTileId and draw character there. Use character’s **sprite** if available, else **image**, else **placeholder icon**.                                                                                                                                                                                                                                                                                                                                                                    | Same            | Use read-only LocationViewer but overlay campaign entities for this location. |
| “Remove from location” or “Move”: clear currentLocationId/currentTileId to remove from location; to move, creator **navigates to the target location** and selects a tile there, then update CampaignCharacter with new currentLocationId and currentTileId.                                                                                                                                                                                                                                                                                                                                                                                                   | Same            |                                                                               |

### 8.3 Campaign editor – place items

| Task                                                                                                                                                                                                                                                                                                       | File(s)         | Notes |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----- |
| **Add Item** (from tile context menu): user selects an **item** from the campaign’s ruleset (db.items.where('rulesetId').equals(campaign.rulesetId)). Create CampaignItem with itemId, currentLocationId (current location), currentTileId (resolved from clicked cell, e.g. topmost TileData by zIndex). Same itemId can be placed multiple times (multiple CampaignItem records). | Campaign editor |       |
| Render CampaignItems on LocationViewer: for each CampaignItem with currentLocationId === current location.id, draw at tile matching currentTileId. Use item’s **sprite** if available, else **image**, else **placeholder icon**.                                                                                                                                    | Same            |       |
| Remove: deleteCampaignItem. Move: creator navigates to target location and selects a tile; updateCampaignItem with new currentLocationId and currentTileId.                                                                                                                                                                                                             | Same            |       |

### 8.4 Campaign editor – campaign events

| Task                                                                                                                                                                                                                                                                | File(s)         | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----- |
| **Add Event** (from tile context menu): user enters a **name** and selects **type**: **On Enter** | **On Leave** | **On Activate**. Create CampaignEvent (campaignId, label, type, scriptId optional). Attach to current location **and tile**: create CampaignEventLocation(campaignEventId, locationId, **tileId**). **One event per tile** (enforce at most one CampaignEventLocation per (locationId, tileId) or one event per tile in UI). Script picker can be added when wiring scripts in Phase 9; document needs in phase-9.md. | Campaign editor | CampaignEvent type field; CampaignEventLocation needs tileId.              |
| On LocationViewer (edit mode), show events for this location: for each CampaignEventLocation with this locationId (and tileId), resolve CampaignEvent; **highlight the tile** to indicate the event. Show event label and type; allow remove (delete CampaignEventLocation and optionally CampaignEvent). No reorder; no order field. | Same            |       |
| In play mode, events surface as buttons or tile affordances (Phase 9 will wire script execution when player enters/leaves tile or activates).                                                                                                                       | Same            |       |

### 8.5 Campaign editor – UI clarity

| Task                                                                                                                                                                                                   | File(s)         | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ----- |
| **Tile context menu:** when creator clicks a tile, show **Add Character** | **Add Item** | **Add Event** (and Remove/Move/Edit when a tile has an entity or event). Optional toolbar/mode: e.g. “Navigate” / “Place character” / “Place item” / “Manage events”. When a placed character or item is selected, show remove and move (move = navigate to target location and select tile). Use existing design system (@/components). | Campaign editor |       |

### 8.6 Play campaign – entry and viewer

| Task                                                                                                                                                                                                                                                                                                       | File(s)            | Notes |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| Play entry: from campaign detail or list, “Play” → select a character that is in this campaign (CampaignCharacter for this campaignId). Or: “Play as [character name]” if only one. Route e.g. `/campaigns/:campaignId/play` with character in context (query or state).                                   | Play campaign page |       |
| Load campaign and chosen character’s CampaignCharacter record (currentLocationId, currentTileId). Load world and locations. Render WorldViewer; current location = CampaignCharacter.currentLocationId. Show LocationViewer for current location.                                                          | Same               |       |
| LocationViewer in play mode: render tiles (from location.tiles), plus CampaignCharacters with currentLocationId === location.id (at their currentTileId), CampaignItems same, and CampaignEvents for this location (CampaignEventLocation) as buttons. TileData.actionId: clickable to run ruleset action. | Same               |       |
| Link “Character sheet” to `/characters/:characterId` (or app’s character route) and “Back to location” or “Back to campaign” so player can switch between sheet and location view.                                                                                                                         | Same               |       |

### 8.7 Play campaign – navigation between locations

| Task                                                                                                                                                                                                                                                                                 | File(s)       | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ----- |
| Allow player to move to another location: e.g. list of child locations of current, or list of locations in world. On select, update CampaignCharacter’s currentLocationId and currentTileId (to the **first passable tile** in the new location: first TileData where isPassable === true). Re-render LocationViewer for new location. | Play campaign |       |
| Optional: “exits” or tile actions that trigger location change; same idea—update CampaignCharacter placement and refresh view.                                                                                                                                                       | Same          |       |

---

## Exit criteria

- [ ] Creator can open campaign edit; WorldViewer starts at root. Creator navigates via WorldViewer and opens LocationViewer for locations with a map. Clicking a tile shows Add Character | Add Item | Add Event.
- [ ] Add Character: select archetype from campaign ruleset; creates Character (from archetype) and CampaignCharacter with placement. Add Item: select item from ruleset; creates CampaignItem (same itemId can be placed multiple times). Creator can remove or move placed characters and items (move = navigate to target location and select tile).
- [ ] Creator can add CampaignEvents with type (On Enter | On Leave | On Activate), attach to location and tile (CampaignEventLocation with locationId + tileId); one event per tile; tile highlighted; can remove events. Script wiring is Phase 9.
- [ ] Character creation uses archetypes; item list filtered by campaign.rulesetId.
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
   - Route /campaigns/:campaignId/edit. Use WorldViewer to navigate campaign’s world; on location select, show LocationViewer for that location. Breadcrumb: Campaign > [World name] > [Location name]. Start WorldViewer at root location when opening edit.
   - **Tile context menu:** on tile click, offer Add Character | Add Item | Add Event (and Remove/Move/Edit when tile has an entity or event). **Add Character:** user selects an **archetype** from campaign.rulesetId; create Character from that archetype and CampaignCharacter with currentLocationId, currentTileId (resolve one TileData.id per cell, e.g. topmost by zIndex). Render with sprite > image > placeholder. Move: creator navigates to target location and selects a tile; update CampaignCharacter.
   - **Add Item:** user selects item from campaign.rulesetId; create CampaignItem with currentLocationId, currentTileId. Same itemId can be placed multiple times. Render with sprite > image > placeholder. Remove/move via delete or update (move = navigate and select tile).
   - **Add Event:** user enters name and selects type: On Enter | On Leave | On Activate. Create CampaignEvent (label, type, scriptId optional) and CampaignEventLocation(campaignEventId, locationId, tileId). One event per tile. Highlight the tile to indicate the event. Script wiring deferred to Phase 9; add notes to phase-9.md. Data model: CampaignEvent has `type`; CampaignEventLocation has `tileId`.
   - Use existing design system.

2. **Play campaign**
   - Entry: from campaign, “Play” and select a character in the campaign (CampaignCharacter). Route e.g. /campaigns/:campaignId/play with character in context.
   - Render WorldViewer and LocationViewer for campaign’s world and character’s current location. LocationViewer shows tiles, CampaignCharacters, CampaignItems, and CampaignEvents (as buttons) for that location. TileData.actionId: click to run ruleset action.
   - Link to character sheet and back. Allow moving to another location: set currentTileId to the **first passable tile** (TileData.isPassable) in the new location; refresh view.

Follow existing patterns and tech stack. Do not add character/item placement to the location editor (that stays world-building only).
```

---

## Clarifying questions (answer below)

### CampaignCharacter vs Character

- When we "list characters for campaign.rulesetId," are we listing **Character** records (ruleset characters) and then creating/updating **CampaignCharacter** on placement?
- If a character is "already in campaign," does that mean Phase 7 already creates a **CampaignCharacter** when you add a character to the campaign (with no placement yet), and we only set `currentLocationId` / `currentTileId` when placing? Or do we create **CampaignCharacter** only the first time we place them in the editor?

_answer_

Adding a character to a campaign should create a CampaignCharacter record associated to that record. We will update placement through that record. When playing a campaign, we'll make updates to the character record directly for things other than placement.

### CampaignItem multiplicity

- Can the same ruleset item (`itemId`) be placed more than once in a campaign (e.g. several "Health Potion" instances in different locations)? If yes, each placement is a separate **CampaignItem** with the same `itemId`, correct?

_answer_
Yes. Each placement is a separate CampaignItem with the same itemId.

### Event script and script type

- For "script entity type for 'campaign event'": does the ruleset already define a script type/usage for campaign events, or should we add one (or filter existing scripts by type)?
- In **play** mode, when the player clicks an event button, should that always run the event's `scriptId` (when present), or is there another behavior (e.g. "run script" as an optional action)?

_answer_

The script runner in lib/compass-logic has awareness of script types for location, tile and campaign event, but no event runners to fire them. We can tackle wiring up scripts in phase 9. As you build out phase 8, make notes in a phase 9 doc about what is needed for scripts.

### Moving to another location in the editor

- When moving a placed character/item to a **different** location, should the creator have to navigate to that location and then click a tile (so we set `currentLocationId` + `currentTileId` from that view)? Or do you want a UI that can set "location + tile" without switching the current view (e.g. location dropdown + tile picker)?

_answer_

The creator will have to navigate to that location and manually select a tile for now.

Actually, the only want to create a character when editing a campaign should be by interacting with a tile. The creator will click on a tile, select 'Create Character' and choose an archetype from the ruleset.

### Event order

- Task 8.4 says "add/remove/reorder" events. Should **CampaignEventLocation** (or **CampaignEvent**) have an explicit order field (e.g. `order` or `sortOrder`), or is "reorder" out of scope and ordering by creation/id enough for now?

_answer_

No order is needed. Only one event can be added per tile. The event types are 'On Enter', 'On Leave' and 'On Activate'

### Default tile when changing location (play)

- When the player moves to another location (8.7), we need "a default tile in the new location" for `currentTileId`. How should that be chosen? (e.g. first tile by id, by zIndex, a designated "spawn" tile, or any tile in the location?)

_answer_

The first passable tile in the location

### World breadcrumb

- For "Campaign > World > [Location name]," should the middle segment show the **world name** (e.g. "Campaign > My World > Tavern") or the literal label "World"?

_answer_

It should show the world name

## User flow clarification

*(Summarized in Design summary above; detail below.)*

Open a campaign > edit campaign > start world viewer at root location

Use world viewer to move between locations

Open a map of a location that has a map

Click a tile and select between "Add Character", "Add Item" and "Add Event"

Add Character

- Select an archetype ruleset
- The character appears on the tile using its sprite as an image if available, its image or a placeholder icon

Add Item

- Select an item from the ruleset
- The item appears on the tile using its sprite as an image if available, its image or a placeholder icon

Add Event

- Enter a name
- Select a type between 'On Enter', 'On Leave' or 'On Activate'
- Creates a campaign event
- That tile is highlighted to indicate the event
