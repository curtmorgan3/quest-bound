The campaign play should have context of all campaign characters.

Player characters = character's with userId == currentUser.id, rulesetId == campaign.rulesetId
Player campaign characters = campaign characters with characterId included in player characters

After selecting a campaign, you should see a list of player campaign characters with options to remove them from campaign.
You should also see a list of player characters that can be added.

Then you see an option to 'Start', which moves you into CampaignPlay

## CampaignPlay utilities

Let's wrap CampaignPlay in a CampaignProvider

```ts
interface CampaignProvider {
  campaignPlayerCharacters: CampaignCharacter[]; // those with isNpc == false
  campaignNpcs: CampaignCharacter[]; // isNpc == true
  selectedCharacters: CampaignCharacter[];
  addSelectedCharacter: (id: string) => void;
  moveSelectedCharactersTo: (locationId: string, tileId?: string) => void;
  navigateTo(locationId: string) => void; // moves location-viewer into location, does not move characters
  navigateBack() => void;
}
```

Step 1: Make the campaign provider and wrap CampaignPlay in it.

Step 2: write a hook in campaign-provider.ts, `useCampaignProvider`, that adds the necessary state and functions. Call the hook to set the initial provider value.

---

## Questions (pre-implementation)

1. **Typo**: The doc says `campaign.rulestId` — should that be `campaign.rulesetId`?

Just a typo, I've corrected it.

2. **Where does the pre-play screen live?** Should "Play" from campaign detail go to a new route (e.g. `/campaigns/:campaignId/play/setup` or `/campaigns/:campaignId/setup`) that shows the two lists + Start, and Start then navigates to `/campaigns/:campaignId/play`? Or should it stay on `/campaigns/:campaignId/play` and show the pre-play UI first (no characterId), with the current play view only after Start?

The campaign detail pages should include the list of characters in an accordion expanded from the campaign list item. Within the accordion, you can alter the playe campaign characters. Instead of a list of characters, lets use a new component, `chracter-lookup`, following the pattern of `attribute-lookup`.

Clicking 'play' should take you to `/campaigns/:campaignId/play`. We should no longer need a `characterId` query param.

3. **After Start: one character vs many**: Currently play is "pick one character" and we use `?characterId=...` for movement/navigation. With the provider and `selectedCharacters` / `moveSelectedCharactersTo`, should we keep "play as one character" (one "active" or "playing" character for movement/navigation) and use `selectedCharacters` only for batch move? Or move to multi-character play where there is no single "playing" character and actions apply to the current selection?

We're moving to multi-character play where no single player is 'playing'. Actions will apply to the current selection.

4. **selectedCharacters**: Can selection include both player campaign characters and NPCs, or only one of those? Is selection used only for `moveSelectedCharactersTo`, or also for other actions (e.g. "view sheet", "set as active")?

Selection can include any type of campaign character. For now, it will just be for moving, but we'll expand it later.

5. **navigateTo / navigateBack**: Confirm: `navigateTo(locationId)` = change the **view** (location viewer) to that location; `navigateBack()` = go to parent location in the view. Neither changes character positions; character positions are only changed via `moveSelectedCharactersTo`. Correct?

Correct.

6. **Add/remove on pre-play screen**: For "remove from campaign", should we use the existing `deleteCampaignCharacter` (and only allow remove for the current user's campaign characters)? When "adding" a player character, do we create a CampaignCharacter with no initial location/tile (user places them after Start), or assign a default location when adding?

Remove from campaign should delete the campaign character. Only allow this for the current users campaign characters. When adding, create a campaign character with no initial location.

---

## Follow-up questions

1. **Where is the accordion?** When you say "accordion expanded from the campaign list item" — is the character-management accordion on the **campaign detail** page (`/campaigns/:campaignId`, so after clicking "Open" you see World, Ruleset, Edit, Play, and a new "Characters" accordion section)? Or on the **campaigns list** page (`/campaigns`), where each campaign card would have an expandable accordion to manage characters without opening the detail page?

In the campaigns list. Each campaign card will have an expanded accordion to manage its campaign characters.

2. **CharacterLookup + current characters:** For the accordion content, should it be: (A) a **list** of current player campaign characters (each row with name + remove button) **plus** one **CharacterLookup** used only to add (pick a player character → add to campaign), or (B) a different layout (e.g. everything through CharacterLookup, or multiple lookups)?

A

3. **Component name:** You wrote "chracter-lookup" — should the component be `CharacterLookup` in `character-lookup.tsx` (same pattern as `AttributeLookup` / `attribute-lookup.tsx`), and live under `src/lib/compass-api/components/`?

Yes

---

## UI notes

- **Avatar selection state:** In CampaignPlay, show a border (e.g. ring) on the character avatar when that character is selected.

- **Jump to character dialog:** The "Move to location" flow is refactored to a small dialog that lists `campaignPlayerCharacters`. Each row shows the character's image (avatar) and name. On click of a character, call `jumpToCharacter(characterId)` to navigate the view to that character's current location (if they have one), then close the dialog. Use the shared Dialog component for the modal.

- **handleOverlayClick (LocationViewer in play mode):** When the user clicks an overlay node (character or item sprite) on the map, call `handleOverlayClick(tileId)`. Behaviour: find all campaign characters (player + NPC) at the current view location whose `currentTileId === tileId`. If any of those characters are already selected, deselect every character on that tile. Otherwise, add every character on that tile to the selection. This gives tile-based toggle selection: click a character to select all at that tile; click again to deselect all at that tile.

- **Overlay node `selected`:** Pass `selected` as a property on each overlay node so the LocationViewer can show a border for selected characters. In `useCampaignPlayOverlay`, accept `selectedCharacterIds` (e.g. a `Set<string>` of campaign character ids) and set `selected: selectedCharacterIds?.has(campaignCharacter.id)` on character nodes. In LocationViewer, when `node.selected` is true, render the overlay with a visible border (e.g. ring).
