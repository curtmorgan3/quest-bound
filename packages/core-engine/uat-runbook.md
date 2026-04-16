# Core engine — manual UAT runbook

Use this checklist for regression testing of the Quest Bound app shell (`@quest-bound/core-engine` + embedded `@quest-bound/runtime` pages). Routes use the **history API** (paths like `https://<host>/rulesets`); the host must serve `index.html` for unknown paths (SPA fallback).

**Tester setup**

- [ ] Use a clean browser profile or private window when testing auth and sync edge cases.
- [ ] Confirm whether the build has **Quest Bound Cloud** configured (`isCloudConfigured`). Skip or mark N/A any step that requires cloud when testing a local-only build.
- [ ] Keep **DevTools → Application → IndexedDB** in mind for data resets if you need a clean local state.

Record pass/fail, build version, and date on each run.

---

## Home and navigation

- [ ] App loads without a blank screen; no unhandled error overlay.
- [ ] Root URL redirects to **`/rulesets`**.
- [ ] **Settings** (gear) opens the settings panel; closing it returns focus sensibly.
- [ ] **Dice** control opens the dice panel; rolls complete and UI updates.
- [ ] **Help** opens documentation in a new tab with a URL that matches the current area (rulesets vs characters vs campaigns).
- [ ] Navigate across top-level sections and confirm the main content updates and the URL path matches.

---

## Rulesets (home) and ruleset list

Path: **`/rulesets`**

- [ ] **Rulesets** tab: local rulesets list loads; empty state is readable if none exist.
- [ ] **Create ruleset** flow: create a new ruleset with title (and description if offered); new ruleset appears in the list.
- [ ] **Import** `.zip` / ruleset file: happy path completes; ruleset appears (or overwrite/duplicate dialogs behave as documented).
- [ ] Import **conflict** paths: trigger replace confirmation and duplicate confirmation when applicable; cancel and confirm both work.
- [ ] **Export** a ruleset (if available from list or ruleset UI); downloaded file can be re-imported on a clean profile.
- [ ] **Delete** local ruleset: confirm dialog; ruleset removed from list; no crash after delete.
- [ ] **Cloud-only rulesets** (when signed in with sync): cloud list loads; **install from cloud** pulls a ruleset; **delete from cloud** (if applicable) behaves as expected.
- [ ] **Modules** tab: toggle between Rulesets and Modules lists; module rulesets (`isModule`) only appear under Modules; normal rulesets only under Rulesets.

---

## Ruleset content (authoring)

Open a ruleset from the list: **`/rulesets/:rulesetId`** redirects into sub-routes (typically attributes).

For each subsection, verify: page loads, primary list/grid renders, **create** and **edit** (where applicable), and navigation from the ruleset sidebar or in-page tabs works.

### Attributes

Path: **`/rulesets/:rulesetId/attributes`**

- [ ] List or chart view loads; add/edit attribute flows work; validation errors are visible when expected.

### Items

Path: **`/rulesets/:rulesetId/items`**

- [ ] Items list/chart loads; create item; edit item; item custom properties modal (if used) opens and saves.

### Actions

Path: **`/rulesets/:rulesetId/actions`**

- [ ] Actions list loads; create/edit action; links to charts or scripts remain consistent.

### Charts

Path: **`/rulesets/:rulesetId/charts`**

- [ ] Charts list loads; select a chart; create/edit chart; export TSV (if present) produces a file.

### Documents

Path: **`/rulesets/:rulesetId/documents`**

- [ ] Documents list loads; upload/add document; open document where supported.
- [ ] **`/rulesets/:rulesetId/documents/:documentId`** — document viewer loads; navigation back to list works.

### Windows

Path: **`/rulesets/:rulesetId/windows`**

- [ ] Windows list loads; create window if applicable.
- [ ] **`/rulesets/:rulesetId/windows/:windowId`** — window editor loads; save changes; return to windows list.

### Pages (Compass)

Path: **`/rulesets/:rulesetId/pages`**

- [ ] Pages list loads; create/select page.
- [ ] **`/rulesets/:rulesetId/pages/:pageId`** — page editor loads; edit nodes; save; no data loss on refresh (within same session).

### Archetypes

Path: **`/rulesets/:rulesetId/archetypes`**

- [ ] Archetypes list loads; create archetype dialog completes.
- [ ] **`/rulesets/:rulesetId/archetypes/:archetypeId/edit`** — archetype sheet editor loads; save; exit.

### Scripts

- [ ] **`/rulesets/:rulesetId/scripts`** — scripts index loads; open a script.
- [ ] **`/rulesets/:rulesetId/scripts/:scriptId`** — script editor loads; edit; save; run/playtest hooks if used in your test ruleset.

### Custom properties

Path: **`/rulesets/:rulesetId/custom-properties`**

- [ ] Manage custom properties UI loads; add/edit/delete property definitions; changes reflected where used (e.g. items).

### Assets

Path: **`/rulesets/:rulesetId/assets`**

- [ ] Assets library loads; upload asset; asset usable from pickers elsewhere (e.g. image on item or ruleset).

### Ruleset hub redirect

Path: **`/rulesets/:rulesetId`** (no sub-path)

- [ ] Redirects to a default sub-area (e.g. attributes) without errors.

---

## Read-only / external grant (ruleset playtest)

When opening a ruleset via an **external read-only grant** (playtest link / grant flow):

- [ ] **`/landing/:rulesetId`** — landing page loads; **Modify this ruleset** is hidden for read-only; CTAs for characters/campaigns work as designed.
- [ ] Deep links into **`/rulesets/:rulesetId/...`** either allow read-only browsing or redirect appropriately; no destructive edits are possible where forbidden.
- [ ] Settings sidebar: **ruleset** settings entry is not shown when read-only (per app rules).

---

## Play link (hosted ruleset bundle)

Path: **`/play/:slug`** (slug provided by host)

- [ ] Valid slug: bundle downloads, import runs, navigates to **`/landing/:rulesetId`** (or existing ruleset) on success.
- [ ] Invalid slug / network error: user-visible error message.
- [ ] Import **replace** and **duplicate** confirmations when the same ruleset already exists locally.

---

## Characters

Path: **`/characters`**

- [ ] Character list loads; empty state acceptable.
- [ ] Open a character: **`/characters/:characterId`** — character sheet (runtime `CharacterPage`) loads; inventory, archetypes, attribute edit panels open/close.
- [ ] **`/characters/:characterId/default`** — default character sheet editor loads for archetype/sheet defaults; save and navigate away.
- [ ] **`/characters/:characterId/documents/:documentId`** — document viewer opens for linked document.
- [ ] **`/characters/:characterId/chart/:chartId`** — character chart viewer loads and displays data.

---

## Campaigns

Path: **`/campaigns`**

- [ ] Campaign list loads; create campaign (including **`/campaigns?new=1`** / new campaign modal if used).
- [ ] **`/campaigns/:campaignId/scenes`** — scene list; add/rename/reorder/delete scenes as supported.
- [ ] **`/campaigns/:campaignId/scenes/:sceneId`** — **campaign dashboard** loads: columns (Stage NPCs, Scene / turn order, Game log); open character sheet from avatars; collapse/expand columns.
- [ ] Turn-based mode toggle (if present); **next turn** advances; reorder turn order via drag when enabled.
- [ ] **Scene document** and **scene events** panels open from header.
- [ ] **`/campaigns/:campaignId/documents`** — campaign documents page; link documents to campaign.
- [ ] **`/campaigns/:campaignId/documents/:documentId`** — viewer opens.
- [ ] **`/campaigns/:campaignId/chart/:chartId`** — campaign chart viewer.

---

## Real time (campaign play)

Requires cloud, authenticated user, sync enabled, and host choosing to enable realtime where applicable.

- [ ] From campaign dashboard header, open **guest join / host session** UI (`CampaignPlayInviteSheet`): generate or display join token; copy link if offered.
- [ ] Toggle **host campaign realtime** (if present): connecting / connected / error states show a clear notice; reconnect path works after transient failure (optional stress test).
- [ ] With realtime on, **player/joiner** scenario (second browser or profile): join flow completes; delegated actions or “open sheet” behaviors match product expectations.

---

## Cloud sync

Preconditions: cloud configured; sign in; enable **Quest Bound Cloud** / sync in user settings where required.

- [ ] **User settings → Cloud** (or equivalent): sign in, sign out, enable sync, email verification messaging if applicable.
- [ ] On a ruleset sub-route (not homepage/characters/campaigns): sidebar **cloud sync** control reflects state (synced / syncing / error / offline).
- [ ] Open **push / sync** dialog from sidebar; run a push or sync; completion or error is visible.
- [ ] **Sync review** dialog (planning/commit): resolve conflicts or accept plan per UI; no stuck spinner.
- [ ] **Cloud sync summary** panel (layout): opens from appropriate entry; dismissible.
- [ ] **Pull entire ruleset from cloud** (from rulesets home when applicable): completes or shows actionable error.
- [ ] **Non-owner cloud install** rulesets list behavior (if your account has shared installs).

---

## File sharing and external grants

Interpret broadly: import/export, hosted play bundles, external grants.

- [ ] **Ruleset export** and **re-import** on another profile (file sharing sanity).
- [ ] **Play** URL with slug shares a ruleset bundle to a fresh client (see Play link section).
- [ ] **Pending external grants** dialog (layout): appears when applicable; accept/dismiss flows work.

---

## Modules (ruleset modules)

Path: **`/rulesets`** → **Modules** tab

- [ ] Module rulesets are listed separately from full rulesets.
- [ ] Creating or importing a **module** ruleset (if your workflow supports it) and attaching it to a parent ruleset (if applicable elsewhere in the product) — follow docs for your version.

---

## Settings

Open **Settings** from the sidebar.

### User (default)

- [ ] **Profile**: username updates persist after reload.
- [ ] **Cloud account** tab (when cloud configured): auth state, sync toggle, beta / legal copy readable.
- [ ] **PWA**: install prompt or “already installed” path; **check for update** / refresh app when service worker present.
- [ ] **Onboarding**: “show again” or replay onboarding if control exists.
- [ ] **Export error logs** downloads JSON without throwing.

### Ruleset (when navigated inside a ruleset, not read-only)

- [ ] Settings sidebar shows **ruleset** entry; open **Ruleset** settings — title, description, image, version-related controls per UI.
- [ ] Changes persist; navigating away and back shows updated data.

### Campaign (when navigated inside a campaign route)

- [ ] **Campaign** entry in settings sidebar; campaign label/ruleset binding/edit per UI.

### Character (when on a character route)

- [ ] **Character** entry in settings sidebar; character-specific settings save.

---

## Dice, prompts, and global overlays

- [ ] **Dice panel**: standard rolls; advantage/disadvantage or advanced modes if enabled in your build.
- [ ] **Physical roll modal** (if triggered from play): opens and closes cleanly.
- [ ] **Prompt modal** — triggered from scripted flows if you have a repro ruleset.
- [ ] **Character select modal** — opens when required by flow; selection applies.
- [ ] **Global loading overlay** — appears for long operations and clears.
- [ ] **Script error notifications** — host shows script errors without freezing the app (use a ruleset with a deliberate script error if available).

---

## Dev tools

Path: **`/dev-tools`**

- [ ] **Script** tab / script playground runs sample scripts; output visible.
- [ ] **Debug** tab — localStorage debug flags list; add/remove/toggle keys under `debug.log.*`.
- [ ] **Feature flags** tab — list flags; toggle; verify behavior change where a flag exists.
- [ ] **Actions** tab / ruleset actions panel — executes test actions without crashing.

---

## Errors and edge cases

- [ ] **`/nonexistent-route`** — **404** error page renders; link back to home or rulesets works.
- [ ] **Offline**: toggle network offline; cloud sync shows offline or error state; app remains usable for local-only features.
- [ ] **Sign-in gate**: unauthenticated access to a route that requires cloud shows **Sign in** flow, not a blank page.

---

## PWA and onboarding

- [ ] First-run **onboarding** panel (if enabled for user): complete skip/finish; does not reappear until reset.
- [ ] **PWA install prompt** (layout) does not block critical navigation; dismiss works.

---

## Suggested order for a full pass

1. Home and navigation
2. Rulesets (home) → pick one ruleset
3. Ruleset content (attributes → … → assets, as deep as time allows)
4. Characters
5. Campaigns (including dashboard + documents + charts)
6. Cloud sync + file sharing / external grants
7. Real time (if applicable)
8. Play link + landing + read-only grant (if applicable)
9. Settings (user, then context-specific)
10. Dice / overlays / modals
11. Dev tools
12. Errors / offline / 404

---

## Notes for testers

- Many **campaign** and **character sheet** interactions live in `@quest-bound/runtime`; file issues under the repo with **steps and URL path**.
- **Cloud** and **realtime** steps require backend configuration and test accounts; mark **N/A** when testing a local static build.
- After major releases, re-validate **import/export** and **play slug** with a production-like ruleset `.zip` and slug from staging.
