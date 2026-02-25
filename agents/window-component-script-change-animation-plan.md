# Plan: Animate Window Components When Value Changes via QBScript

## Goal

When a window component is bound to an attribute (`component.attributeId` set) and that attribute’s value is changed **programmatically by QBScript** (e.g. action script, reactive script, chart), the component should be able to run an animation. User-initiated changes (typing in an input, toggling a checkbox) should not trigger this animation.

## Current Flow (summary)

- **Data**: `useNodeData(component)` in `src/lib/compass-planes/utils/use-node-data.ts` derives `value` from:
  - Character attribute (when `component.attributeId` matches a ruleset attribute and the character has that attribute), or
  - Character component data, or ruleset default / component data.
- **User updates**: Components call `characterContext.updateCharacterAttribute(characterAttributeId, { value })` or `updateCharacterComponentData(component.id, value)`, which update the DB; `useCharacterAttributes` (LiveQuery) and context cause re-renders.
- **Script updates**: QBScript runs in a worker. `AttributeProxy.set()` (and similar) write to `pendingUpdates`; at the end of a run, `ScriptRunner.flushCache()` writes to the worker’s Dexie (IndexedDB). The worker already computes `getModifiedAttributeIds()` (ruleset attribute IDs) before flush and uses them for reactive chaining inside the worker. The main thread does **not** currently receive which attribute IDs were modified by script.
- **Reactive path**: When the user (or another script) changes an attribute, main can send `ATTRIBUTE_CHANGED` to the worker; the worker runs reactive scripts, may modify other attributes, and flushes. The main thread again does not get a list of those modified attribute IDs.
- **Components**: Input, checkbox, text, content (and any other that use `useNodeData` and `attributeId`) render from `data.value`. There is no notion of “value changed by script” vs “by user,” and no animation trigger.

So the missing piece is: **main thread needs to know “these ruleset attribute IDs (and for which character) were just updated by script”** so that only components bound to those attributes can run an animation.

---

## Chosen approach: Option A with `useAttributeChangedByScript` and diff in the hook

We use Option A and introduce a single hook that both triggers re-renders and **derives the value diff** so components can hydrate their animation (e.g. animate from old → new, or show delta).

- **Hook API**: `const { diff, changedByScript } = useAttributeChangedByScript(characterId, attributeId, currentVal)`
  - `attributeId`: ruleset attribute id (e.g. `component.attributeId`).
  - `currentVal`: the current value for this attribute (e.g. `data.value` from `useNodeData`).
  - **Returns**:
    - `changedByScript: boolean` — true when this attribute was just updated by script (and we’re reporting it for this render only).
    - `diff: { from: T, to: T } | null` — when `changedByScript` is true, the previous and new value so the component can drive the animation (e.g. numeric delta, or from/to for transitions). Otherwise `null`.

- **Where the diff comes from (no worker change for values)**  
  The worker does **not** send previous/new values. The hook derives the diff on the main thread:
  - The hook keeps a **ref** storing the last `currentVal` seen for this (characterId, attributeId).
  - When the script-modified store says “(characterId, attributeId) was just modified by script,” and we have a `currentVal` this render:
    - **Previous value** = `ref.current` (value from the previous render).
    - **New value** = `currentVal` (already updated by LiveQuery / context).
    - So `diff = { from: ref.current, to: currentVal }`.
  - The hook then clears that (characterId, attributeId) from the script-modified set (one-shot) and updates the ref to `currentVal` for next time.
  - When the attribute is **not** in the script-modified set, the hook only updates the ref to `currentVal` and returns `{ changedByScript: false, diff: null }`.

So: “previous” is always “what we had last render”; “new” is “what we have this render.” When we see the script-modified flag, we know this render’s value is the script result, so the diff is correct. This keeps the worker contract to “which attributes were modified” only; no need to send values over the wire.

---

## Option A (detailed): Worker → Main signal + store + hook with diff

1. **Worker → Main**
   - For every script run that flushes attribute changes (direct execution and reactive runs after `ATTRIBUTE_CHANGED` / initial sync, etc.), send to main either:
     - An extended `SCRIPT_RESULT` payload that includes `modifiedAttributeIds: string[]` and `characterId: string`, or
     - A dedicated signal, e.g. `ATTRIBUTES_MODIFIED_BY_SCRIPT`, with `{ characterId, attributeIds }`.
   - Worker already has `modifiedAttributeIds` (ruleset attribute IDs) from `getModifiedAttributeIds()` before flush; `characterId` is available in the execution context.
   - **No previous/new values** are sent; the hook will derive diff on main.

2. **Main thread store**
   - When main receives the signal, add each `(characterId, attributeId)` to a “script-modified” set (or map). Entries are removed when the hook consumes them (one-shot per attribute). Optionally also clear after a short TTL to avoid stale entries.

3. **Hook: `useAttributeChangedByScript(characterId, attributeId, currentVal)`**
   - **Inputs**: `characterId`, `attributeId` (ruleset id), `currentVal` (current value from `useNodeData` or equivalent).
   - **State**: A ref storing the previous value for this hook instance (i.e. this component’s attribute). Ref is updated every render to `currentVal` so “previous” is always the last render’s value.
   - **Logic**:
     - If `(characterId, attributeId)` is in the script-modified set and we have a valid call (e.g. characterId and attributeId present):
       - Set `from = ref.current`, `to = currentVal`.
       - **Only report and clear when the value actually changed** (`from !== to`), so we don’t animate on the re-render that happens before LiveQuery has the new value. If `from !== to`: remove `(characterId, attributeId)` from the set, set `ref.current = currentVal`, return `{ changedByScript: true, diff: { from, to } }`. If `from === to` (e.g. same tick, LiveQuery not updated yet): do not clear the set; set `ref.current = currentVal`; return `{ changedByScript: false, diff: null }` so the component doesn’t animate yet; a later render with the new value will see `from !== to` and then we clear and return the diff.
       - Optionally allow `diff` when `from === undefined` (first run) so “undefined → value” can be used for initial hydration if desired.
     - Else:
       - Set `ref.current = currentVal`.
       - Return `{ changedByScript: false, diff: null }`.
   - **Re-renders**: The store must be reactive (e.g. Zustand or context) so that when the worker signal adds entries, components that care re-render. They may render once with the old value (hook returns no diff, keeps entry); when LiveQuery has updated, they render again with the new value and the hook returns `diff` and clears the entry.

4. **Component usage**
   - Components that have `attributeId` and use `useNodeData` call:
     - `const data = useNodeData(component);`
     - `const { diff, changedByScript } = useAttributeChangedByScript(characterId ?? '', component.attributeId ?? '', data.value);`
   - When `changedByScript` is true, they run their animation using `diff.from` and `diff.to` (e.g. Framer Motion from/to, or numeric delta for a “+5” popup).

5. **Animation**
   - Each component type (input, text, checkbox, content) uses `diff` to hydrate the animation (e.g. transition from `diff.from` to `diff.to`, or show `diff.to - diff.from` for numbers). Shared animation behavior can still be defined in one place; the hook only provides the data.

**Pros**: Clear separation (script-only); no worker value payload; diff logic lives in one place (the hook); components get both “should animate” and “from/to” for rich animations.  
**Cons**: Requires worker signal + reactive store on main; reactive runs must also report modified IDs to main.

---

## Option B: “Source” or “reason” on the update path (transient, no DB change)

**Idea**: Mark updates with a “source” when they come from script, and have the UI interpret that.

1. **Script flush path**
   - When the worker is about to flush, it already writes to IndexedDB. We do **not** add a persistent “source” field to the DB. Instead, before or right after the worker sends the result to main, main is notified (as in Option A) with `characterId` and `modifiedAttributeIds`. So the “source” is implied by the separate signal, not stored in the DB. (So this collapses to Option A for the “how does main know” part.)

2. **Alternative variant (no worker contract change)**
   - Main thread could try to infer “script” by process of elimination: maintain a “last user-updated” set. When the UI calls `updateCharacterAttribute`, add `(characterId, characterAttributeId)` to that set with a short TTL. When `useNodeData` sees `value` change, if that attribute was **not** in the last user-updated set, treat it as script-driven and trigger animation. This is heuristic (e.g. sync or bulk load could look like “script”) and requires careful handling of characterAttributeId vs ruleset attributeId.

**Pros (signal-based part)**: Same as Option A.  
**Cons (inference-only variant)**: Fragile; sync, initial load, and multi-tab could cause false positives/negatives.

Recommendation: use the explicit worker→main signal (Option A) rather than relying only on inference.

---

## Option C: Animate on any value change (no script vs user distinction)

**Idea**: Simpler: whenever `useNodeData`’s `value` changes (compared to previous render), trigger an animation. Do not distinguish script vs user.

1. In `useNodeData` (or a thin wrapper), keep a ref of the previous `value`.
2. If `value !== previousValue`, set a “value just changed” flag (or return it), and update the ref.
3. Components use that to run an animation on any value change.

**Pros**: Easiest to implement; no worker or signal changes.  
**Cons**: Animations also run on user typing/toggling, which may be distracting or undesirable.

Useful as a fallback or if the product decision is “animate on every change.”

---

## Recommendation and next steps (Option A + hook with diff)

- **Approach**: Option A with **`useAttributeChangedByScript(characterId, attributeId, currentVal)`** returning **`{ diff, changedByScript }`**. Diff is computed in the hook from a previous-value ref and the script-modified set; worker does not send values.

- **Step 1**: Extend worker→main contract: include `modifiedAttributeIds` and `characterId` in the payload for every script execution (and reactive run) that flushes attribute changes. If reactive runs don’t send a result to main, add a signal (e.g. `ATTRIBUTES_MODIFIED_BY_SCRIPT`) for those runs. No previous/new values on the wire.

- **Step 2**: Main thread: reactive store (e.g. Zustand) that holds a set of `(characterId, attributeId)`. On signal, add those pairs. Store must trigger re-renders for subscribers so the hook runs again with the new `currentVal` and can return `diff` and `changedByScript`.

- **Step 3**: Implement **`useAttributeChangedByScript(characterId, attributeId, currentVal)`**:
  - Subscribe to the script-modified store.
  - Ref for “previous value” for this attribute; update ref to `currentVal` every render.
  - When (characterId, attributeId) is in the set: compute `from = ref.current`, `to = currentVal`. Only if `from !== to` (value actually changed): remove from set, set ref to currentVal, return `{ changedByScript: true, diff: { from, to } }`. If `from === to` (e.g. LiveQuery not updated yet), don’t clear; return `{ changedByScript: false, diff: null }` and set ref to currentVal so the next render (with new value) can report the diff.
  - Otherwise: return `{ changedByScript: false, diff: null }`, set ref to currentVal.

- **Step 4**: In window components with `attributeId` (input, text, checkbox, content): call the hook with `data.value` and use `diff` to hydrate the animation (e.g. from/to transition or delta). Only animate when `changedByScript` is true.

- **Optional**: Per-component or per-window “animate on script change” can be added later without changing this design.

- **Scope**: Only components that have `component.attributeId` and use `useNodeData` use the hook; others are unchanged.

---

## Files / areas to touch (Option A + hook with diff)

| Area | Purpose |
|------|--------|
| `src/lib/compass-logic/worker/signals.ts` | Extend `ScriptResultPayload` or add `ATTRIBUTES_MODIFIED_BY_SCRIPT` with `characterId`, `modifiedAttributeIds`. No value payload. |
| `src/lib/compass-logic/worker/qbscript-worker.ts` | For each script run (and reactive run) that flushes attributes, send modified attribute IDs and characterId to main. |
| Main thread: new store (e.g. Zustand) | Reactive store holding set of `(characterId, attributeId)` so hook subscribers re-render when script-modified list arrives. Entries removed when hook consumes. |
| New hook: `useAttributeChangedByScript` | Accept `(characterId, attributeId, currentVal)`. Ref for previous value; read script-modified set; return `{ diff, changedByScript }` and clear entry on consume. |
| Window node components (input, text, checkbox, content) | Call hook with `data.value`; when `changedByScript`, use `diff.from` / `diff.to` to hydrate animation. |

No database schema change. No value payload from worker; diff is derived on main in the hook.
