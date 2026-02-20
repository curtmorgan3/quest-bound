# Phase 4: World editor (canvas)

**Goal:** World editor at `/worlds/:worldId` with a zoomable/pannable ReactFlow canvas where each location is a node. User can add, move, resize, and delete locations, and open a location (navigate to location editor). Route for location editor is added here or in Phase 5; navigation target is `/worlds/:worldId/locations/:locationId`.

**Depends on:** Phase 1, 2, 3. Location editor (Phase 5) can be a placeholder when "Open location" is clicked until Phase 5 is implemented.

**Reference:** [worlds-plan.md](./worlds-plan.md). ReactFlow is in `src/lib/compass-planes/base-editor/base-editor.tsx`; sheet editor uses it with zoom/pan disabled—for the world canvas enable zoom and pan.

---

## Tasks

### 4.1 World editor page shell

| Task | File(s) | Notes |
|------|--------|--------|
| Create WorldEditor page component. Load world by worldId (useWorld) and locations by worldId (useLocations). Show canvas and a simple toolbar (e.g. "Add location", "Back to worlds"). | `src/pages/worlds/world-editor.tsx` | |
| Handle missing world: 404 or redirect to /worlds. | Same | |

### 4.2 ReactFlow canvas for locations

| Task | File(s) | Notes |
|------|--------|--------|
| Reuse or adapt BaseEditor from compass-planes. For the world canvas, enable zoom and pan (e.g. minZoom &lt; maxZoom, panOnDrag or panOnScroll true). | `src/lib/compass-planes/base-editor/base-editor.tsx` or a world-specific wrapper component | World canvas needs different defaults than the sheet editor (which has minZoom=maxZoom=1 and pan disabled). |
| Convert locations to ReactFlow nodes: position from location.nodeX, nodeY; size from nodeWidth, nodeHeight; label from location.label. | World editor or `src/pages/worlds/world-editor-canvas.tsx` | Use a custom node type that displays the location label and supports resize if needed. |
| On node drag/resize end, persist new position/size to the Location (updateLocation with nodeX, nodeY, nodeWidth, nodeHeight). | Same | |
| "Add location": toolbar or context menu. Create a new location with default node position/size (e.g. center or offset), add to DB, then add node to the canvas. | Same | createLocation(worldId, { label: 'New Location', nodeX, nodeY, nodeWidth, nodeHeight, gridWidth, gridHeight, tiles: [] }). |

### 4.3 Navigate into location

| Task | File(s) | Notes |
|------|--------|--------|
| Double-click or "Open" on a location node → navigate to `/worlds/:worldId/locations/:locationId`. | World editor | Add route in App if not already present (can be placeholder in Phase 5). |
| Optional: breadcrumb or "Back to world" is implemented in the location editor (Phase 5). | Phase 5 | |

### 4.4 Delete location

| Task | File(s) | Notes |
|------|--------|--------|
| Context menu or panel: "Delete location". Remove location from DB (deleteLocation); remove location items for that location (handled in Phase 2 hooks or here). Update canvas to remove the node. | World editor | |

### 4.5 Route

| Task | File(s) | Notes |
|------|--------|--------|
| Ensure `/worlds/:worldId` renders WorldEditor. Add `/worlds/:worldId/locations/:locationId` if not yet present (placeholder component ok until Phase 5). | `src/App.tsx` | |

---

## Exit criteria

- [ ] Opening `/worlds/:worldId` shows the world editor with a ReactFlow canvas.
- [ ] Canvas is zoomable and pannable; location nodes show label and position/size from DB.
- [ ] User can add a location (new node + DB record), move/resize nodes (persisted to Location), and delete a location.
- [ ] User can open a location (navigate to `/worlds/:worldId/locations/:locationId`). That route can render a placeholder until Phase 5.
- [ ] Missing world is handled (404 or redirect).

---

## Implementation prompt

Use this prompt when implementing Phase 4:

```
Implement Phase 4 of the Worlds & Locations feature: the world editor canvas.

Context:
- Phases 1–3 are done: types, hooks, world list, and create world. The route /worlds/:worldId exists (possibly with a placeholder).
- Read agents/locations/phase-4.md for the exact tasks.
- ReactFlow is used in src/lib/compass-planes/base-editor/base-editor.tsx; for the sheet editor zoom/pan are disabled. For the world editor we need zoom and pan enabled.

Do the following:

1. **World editor page (src/pages/worlds/world-editor.tsx)**
   - Load world with useWorld(worldId) and locations with useLocations(worldId). If world is missing, redirect to /worlds or show 404.
   - Render a toolbar: "Back to worlds" (link to /worlds), "Add location" button.
   - Render a ReactFlow canvas that shows each location as a node. Node position from location.nodeX, nodeY; size from nodeWidth, nodeHeight; label from location.label.

2. **ReactFlow setup**
   - Use BaseEditor from compass-planes or create a wrapper that enables zoom and pan (e.g. minZoom &lt; maxZoom, panOnDrag/panOnScroll). Convert locations to ReactFlow nodes; on node drag/resize end, call updateLocation with the new nodeX, nodeY, nodeWidth, nodeHeight.
   - Implement "Add location": create a new location via createLocation(worldId, { label: 'New Location', nodeX, nodeY, nodeWidth, nodeHeight, gridWidth: 1, gridHeight: 1, tiles: [] }) with sensible defaults, then add the node to the canvas.

3. **Open location**
   - On double-click or "Open" on a location node, navigate to /worlds/:worldId/locations/:locationId. Add the route in App.tsx if needed; the location editor can be a placeholder component (e.g. "Location editor" + back link) until Phase 5.

4. **Delete location**
   - Add a way to delete a location (context menu or selection + delete button). Call deleteLocation(id) and remove the node from the canvas.

5. **Routes**
   - Ensure App.tsx has /worlds/:worldId → WorldEditor and /worlds/:worldId/locations/:locationId → a placeholder (e.g. LocationEditorPlaceholder) that shows "Location editor" and a link back to /worlds/:worldId.

Follow existing patterns (ReactFlow node types, styling). Do not implement the full location grid editor yet; that is Phase 5.
```
