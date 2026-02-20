# Phase 9: Campaign event (and location/tile) script wiring

**Goal:** Wire up script execution for campaign events (On Enter, On Leave, On Activate) and, as needed, for location and tile script types. The script runner in `lib/compass-logic` has awareness of script types for location, tile, and campaign event, but no event runners to fire them yet.

**Depends on:** Phase 8. Campaign editor and play campaign exist; CampaignEvent has type and scriptId; CampaignEventLocation has locationId and tileId; events are one per tile and surface as tile highlights or buttons.

**Reference:** [locations.md](./locations.md), [adjustments.md](./adjustments.md), [phase-8.md](./phase-8.md).

---

## Design summary

- **Campaign event scripts:** When a player enters a tile, leaves a tile, or activates a tile that has a CampaignEvent (CampaignEventLocation with that tileId), run the event’s script (CampaignEvent.scriptId) if present. Event type determines when: On Enter, On Leave, On Activate.
- **Script entity type:** Ruleset scripts may need an entity type or usage for “campaign event” so creators can assign a script to an event; filter or list such scripts in the campaign editor when Phase 8 adds a script picker.
- **Location / tile scripts:** If the runtime already distinguishes location and tile script types, wire those triggers as needed (e.g. on entering a location, on clicking a tile with an action).

---

## Tasks (stub)

### 9.1 Campaign event runners

| Task | File(s) | Notes |
|------|--------|--------|
| Implement event runners (or extend script runner) to fire when: player’s character **enters** a tile that has a CampaignEvent of type On Enter; **leaves** a tile that has a CampaignEvent of type On Leave; **activates** (e.g. click) a tile that has a CampaignEvent of type On Activate. | `lib/compass-logic` | Pass campaign context, character, location, tile, event; run CampaignEvent.scriptId. |
| Ensure script runner / executor can run in “campaign event” context (entityType, Self/context for campaign play). | Same | |
| Optional: script picker in campaign editor (Phase 8) to set CampaignEvent.scriptId; filter scripts by entity type “campaign event” if defined. | Campaign editor | May be done in Phase 8 with “notes for Phase 9”; wire execution here. |

### 9.2 Location and tile scripts (optional)

| Task | File(s) | Notes |
|------|--------|--------|
| If location script type exists: fire when player enters a location (e.g. currentLocationId changes). | TBD | |
| If tile script type exists: wire to tile actions (TileData.actionId) or event activation as appropriate. | TBD | |

---

## Notes from Phase 8 implementation

*(When implementing Phase 8, add here any discoveries about what Phase 9 needs.)*

- Script entity type for campaign events: …
- Where to invoke event runners (play LocationViewer, navigation, tile click): …
- Context to pass into script (campaignId, characterId, locationId, tileId, event type): …

---

## Exit criteria (stub)

- [ ] On Enter / On Leave / On Activate campaign events run their script (scriptId) when the corresponding trigger occurs in play mode.
- [ ] No regression in Phase 8 campaign editor or play campaign.
- [ ] (Optional) Location and tile scripts wired if applicable.
