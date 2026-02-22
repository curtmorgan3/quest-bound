# QBScript Runtime

Short overview of how QBScript is executed: entry points from the UI, context loading, execution steps, and signalling back to the main thread.

---

## 1. How scripts are executed from components

Scripts run in two places: **in the main thread** (e.g. script editor test run) or **in a Web Worker** (campaign/character UI, reactive scripts). The worker keeps the UI responsive and uses the same `ScriptRunner` and context flow.

### Entry points (main → worker signals)

| Signal                           | When it’s used                                                                      | Who sends it                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **EXECUTE_SCRIPT**               | Run a script with full context (e.g. “Run” in editor, or custom flows).             | `QBScriptClient.executeScript()` → `client.ts`                    |
| **EXECUTE_ACTION**               | Run an action’s full script (e.g. user clicks an action).                           | `client.executeAction()` → used by hooks                          |
| **EXECUTE_ACTION_EVENT**         | Run only an action’s `on_activate` / `on_deactivate` handler.                       | `client.executeActionEvent()` → e.g. character sheet action panel |
| **EXECUTE_ITEM_EVENT**           | Run item event handlers (`on_equip`, `on_unequip`, `on_consume`).                   | Worker handles item events via `EventHandlerExecutor`             |
| **ATTRIBUTE_CHANGED**            | Notify the worker that an attribute value changed; worker runs reactive scripts.    | Main thread after DB write (e.g. Dexie update)                    |
| **RUN_INITIAL_ATTRIBUTE_SYNC**   | Run all attribute scripts once in dependency order (e.g. after character creation). | `client.runInitialAttributeSync()`                                |
| **EXECUTE_CAMPAIGN_EVENT_EVENT** | Run campaign event handlers (`on_enter`, `on_leave`) for a tile/location.           | Campaign play flow                                                |

**Examples in the codebase:**

- **Run script from UI (worker):** `src/lib/compass-logic/worker/hooks.tsx` — `useExecuteScript` calls `client.executeScript()`; worker receives `EXECUTE_SCRIPT` and runs `ScriptRunner` (see `qbscript-worker.ts`).
- **Run action event from component:** `src/pages/characters/character.tsx` uses `useExecuteActionEvent` and calls `executeActionEvent(actionId, character.id, null, 'on_activate', roll, campaignId)`.
- **Script editor test run:** `src/pages/ruleset/scripts/script-editor/event-controls.tsx` calls `executeActionEvent(entityId, testCharacter.id, null, 'on_activate')` to run an action’s event in the worker.
- **Worker signal types:** `src/lib/compass-logic/worker/signals.ts` defines all `MainToWorkerSignal` and `WorkerToMainSignal` types.

---

## 2. Loading context into the script runner

Before any script runs, the runner loads all data it needs so accessors can work **synchronously** during execution.

### ScriptExecutionContext

The runner is given a **context** object that identifies the run:

- `ownerId`, `targetId`, `rulesetId`, `db`
- Optional: `campaignId`, `scriptId`, `triggerType`, `entityType`, `entityId`
- Optional: `roll`, `executeActionEvent` (for `roll()` and `Owner.Action().activate()` in the worker)

Example of building context in the worker for `EXECUTE_SCRIPT`:

`src/lib/compass-logic/worker/qbscript-worker.ts` (around 238–251):

```ts
const context: ScriptExecutionContext = {
  ownerId: payload.characterId,
  targetId: payload.targetId,
  rulesetId: payload.rulesetId,
  db,
  scriptId: payload.scriptId,
  triggerType: payload.triggerType,
  entityType: payload.entityType,
  entityId: payload.entityId,
  roll: rollFn,
  executeActionEvent: (actionId, characterId, targetId, eventType) =>
    executor.executeActionEvent(actionId, characterId, targetId, eventType, rollFn),
};
const runner = new ScriptRunner(context);
const result = await runner.run(payload.sourceCode);
```

### loadCache() — what gets loaded

`ScriptRunner.loadCache()` (in `src/lib/compass-logic/runtime/script-runner.ts`) runs **before** the script and fills internal caches:

1. **Ruleset data** — attributes, charts, items, actions for the ruleset (so `Ruleset.Attribute()`, `Owner.Attribute()`, etc. can resolve by name).
2. **Owner (and target)** — character record, inventory items, character attributes, archetype names (so `Owner.name`, `Owner.Attribute()`, `Owner.Item()`, etc. work).
3. **Campaign context (when `campaignId` is set)** — owner’s campaign character and current location/tile (for `Owner.location`, `Owner.Tile` x/y).
4. **Campaign event location (when `entityType === 'campaignEventLocation'`)** — event location and tile; then **location characters** for that location (for `Self.Tile.character` / `Self.Tile.characters`).
5. **Owner’s location characters (when in campaign and owner has a location)** — all characters in the owner’s current location (for `Owner.Tile.character` / `Owner.Tile.characters` and so Owner/Target can be the same instances as in the location list).

All of this is done so that during `run()` no further async DB calls are needed for accessors.

Reference: `src/lib/compass-logic/runtime/script-runner.ts` — `loadCache()` (from ~line 117) and `loadLocationCharactersData()`.

### setupAccessors()

After `loadCache()`, `setupAccessors()` (same file) builds the objects that the script sees in the environment:

- **Owner** — from the location list when the owner is in a loaded location, otherwise from dedicated owner data; when in campaign with a location, `Owner.Tile` is given a `TileProxy` with `character` / `characters`.
- **Target** — same idea (from location list or dedicated).
- **Ruleset** — built from the ruleset caches.
- **Self** — only in certain runs: attribute/action/item (Self = that entity) or campaign event location (Self = event location + `Tile` with character/characters).

These are registered on the evaluator’s global environment so the script can use `Owner`, `Target`, `Ruleset`, `Self`, etc.

Reference: `src/lib/compass-logic/runtime/script-runner.ts` — `setupAccessors()` (from ~line 539).

---

## 3. Execution

`ScriptRunner.run(sourceCode)` (same file, ~line 719):

1. **loadCache()** — async load of all context (see above).
2. **setupAccessors()** — build Owner, Target, Ruleset, Self and define them in the evaluator.
3. **loadAndRunGlobalScripts()** — run global scripts so their functions/variables are in scope.
4. **Parse and run the main script** — `Lexer` → `Parser` → `Evaluator.eval(ast)`.
5. **getModifiedAttributeIds()** — collect attribute IDs that were updated (for reactive follow-up).
6. **flushCache()** — write pending updates (character attributes, inventory, archetypes) back to the DB.

If the run is in the worker and the script modified attributes, the worker may then run **reactive** scripts (dependency chain) via `ReactiveExecutor` / `EventHandlerExecutor`; see `qbscript-worker.ts` after `SCRIPT_RESULT` (e.g. around 284–314).

References:

- Execution pipeline: `src/lib/compass-logic/runtime/script-runner.ts` — `run()`.
- Lexer/Parser/Evaluator: `src/lib/compass-logic/interpreter/` (e.g. `evaluator.ts` for `eval`, and where `announce` / `log` are defined and may post messages).

---

## 4. Signalling back to the main thread

The worker cannot return objects by reference; it sends **signals** with serializable payloads. Class instances and proxies are not structured-cloneable, so the runtime converts them to plain data at the boundary.

### Worker → main signals (relevant to execution)

- **SCRIPT_RESULT** — success: `result`, `announceMessages`, `logMessages`, `executionTime`. Payloads are passed through `prepareForStructuredClone()` so Owner, Tile, etc. become plain objects.
- **SCRIPT_ERROR** — failure: `error`, `announceMessages`, `logMessages`.
- **CONSOLE_LOG** — script called `log(...)`; worker sends `prepareForStructuredClone(args)` so the main thread can safely receive and display them.
- **ANNOUNCE** — script called `announce(message)`; main thread receives and can dispatch a custom event (e.g. for UI toasts).

### prepareForStructuredClone and toStructuredCloneSafe

- **StructuredCloneSafe** — interface in `src/lib/compass-logic/runtime/structured-clone-safe.ts`: objects that can be serialized for `postMessage` implement `toStructuredCloneSafe(): unknown`.
- **prepareForStructuredClone()** — in the same file: recursively walks a value and replaces any `StructuredCloneSafe` object with the result of `toStructuredCloneSafe()`, so the whole payload is plain data and safe to clone.

The worker calls `prepareForStructuredClone(result.value)` and `prepareForStructuredClone(args)` for log args before sending `SCRIPT_RESULT` and `CONSOLE_LOG`. The evaluator’s `log` built-in (when in worker context) sends `CONSOLE_LOG` with `prepareForStructuredClone(args)`.

References:

- Worker sending results: `src/lib/compass-logic/worker/qbscript-worker.ts` — e.g. `sendSignal({ type: 'SCRIPT_RESULT', payload: { ..., result: prepareForStructuredClone(result.value), logMessages: result.logMessages.map(args => prepareForStructuredClone(args)) } })` (around 316–325).
- Evaluator `log` / `announce`: `src/lib/compass-logic/interpreter/evaluator.ts` — around 492–514 (`log` uses `prepareForStructuredClone(args)` before `postMessage`).
- Main thread handling: `src/lib/compass-logic/worker/client.ts` — switch on signal type (`SCRIPT_RESULT`, `CONSOLE_LOG`, `ANNOUNCE`, etc.) and resolve pending requests or forward to console/events (around 129–179).
- Serialization contract: `src/lib/compass-logic/runtime/structured-clone-safe.ts`.

---

## 5. Quick reference

| Topic                                 | File(s)                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Context type and runner               | `src/lib/compass-logic/runtime/script-runner.ts`                                                |
| Load + setup + run pipeline           | `script-runner.ts` — `loadCache()`, `setupAccessors()`, `run()`                                 |
| Worker message handling               | `src/lib/compass-logic/worker/qbscript-worker.ts` — `handleSignal`, `handleExecuteScript`, etc. |
| Main-thread client and signals        | `src/lib/compass-logic/worker/client.ts`, `signals.ts`                                          |
| Hooks for components                  | `src/lib/compass-logic/worker/hooks.tsx`                                                        |
| Event handlers (action/item/campaign) | `src/lib/compass-logic/reactive/event-handler-executor.ts`                                      |
| Structured clone at boundary          | `src/lib/compass-logic/runtime/structured-clone-safe.ts`                                        |
| Worker README and examples            | `src/lib/compass-logic/worker/README.md`                                                        |
