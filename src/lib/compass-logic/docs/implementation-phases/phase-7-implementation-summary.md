# Phase 7: UI Components – Implementation Summary

## Completed

### 1. Script editor
- **CodeMirror 6** integration with full setup: syntax highlighting, autocomplete, history, keymap (including Mod-S save).
- **QBScript language** (`src/lib/compass-logic/editor/qbscript-language.ts`): StreamLanguage-based tokenizer for keywords, builtins, accessors (Owner/Target/Ruleset), numbers, strings, comments, operators.
- **QBScript autocomplete** (`src/lib/compass-logic/editor/qbscript-autocomplete.ts`): Suggestions for Owner, Target, Ruleset, subscribe, roll, announce, log, console.log, floor/ceil/round, and keywords.
- **CodeMirror wrapper** (`src/lib/compass-logic/editor/code-mirror-editor.tsx`): Controlled component with `value`/`onChange`, optional `onSave` (Ctrl/Cmd-S).

### 2. Script association UI
- **Single scripts page** at `/rulesets/:rulesetId/scripts` (index, new, edit).
- **Association** handled on the editor page with:
  - Entity type select: Attribute / Action / Item / Global.
  - **AttributeLookup**, **ActionLookup**, **ItemLookup** from `@/lib/compass-api` for linking a script to an entity when type is attribute/action/item.

### 3. Console panel
- **Naive implementation**: single stream of logs (no scriptId/characterId filtering).
- **QBScriptClient** extended with `onSignal` / `offSignal` so the Console can subscribe to worker signals.
- **Console** embedded on the script editor page: shows CONSOLE_LOG entries with timestamp and formatted args; Clear button; scrollable list (last 500).

### 4. Error display
- **Validation**: syntax-only validation via existing worker `validateScript`; errors shown in an Alert above the editor; Save disabled when there are errors.
- **Script error log**: uses `useScriptErrors()`; embedded in a tab on the editor page; list of recorded errors with message, line, stack trace (details), Dismiss button.

### 5. Script library
- **Scripts index** at `/rulesets/:rulesetId/scripts`: list of scripts with type filter (All / Attribute / Action / Item / Global), “New Script” button, each row links to the editor.
- **ScriptListItem**: shows name, entity type badge, optional entity title, updated-at time, disabled badge when applicable.

### 6. Routes and nav
- Routes:
  - `/rulesets/:rulesetId/scripts` → Scripts index.
  - `/rulesets/:rulesetId/scripts/new` → New script editor.
  - `/rulesets/:rulesetId/scripts/:scriptId` → Edit script editor.
- **Scripts** link added to the ruleset sidebar (Scripts item with FileCode icon).

### 7. Other behaviour
- **Autosave draft** to localStorage (key `qb.script-draft-{scriptId|new}`) for name, sourceCode, entityType, entityId; restored when opening “new” or the same script.
- **Debounced validation** (500 ms) on source change.
- **Delete script** button on edit page (with confirm).

## Follow-up / TODO

The following were explicitly deferred and should be implemented later:

1. **Target selector for actions**  
   When an action script requires a target (e.g. `on_activate(Target)`), show a target selector (e.g. character picker) before running the action. Deferred; to be added where action buttons are triggered (e.g. character sheet or inventory).

2. **Script override toggle for players**  
   Per-attribute “Auto-calculate” toggle (scriptDisabled on CharacterAttribute) so players can override a script-computed value. Deferred; to be added in the character sheet / character attribute UI where the value is displayed or edited.

3. **Console filtering**  
   Extend CONSOLE_LOG payload (and worker) to include `scriptId` and `characterId` so the Console can filter by script and character.

4. **Richer validation**  
   Add undefined-variable warnings and circular-dependency checks (e.g. using existing `DependencyGraph.detectCycles()`) in addition to syntax-only validation.

5. **Replace script playground**  
   The new script editor page is the intended long-term replacement for the dev-tools script playground; when ready, replace or redirect the playground to this editor.

## Files touched/added

- `src/lib/compass-logic/worker/client.ts` – `onSignal` / `offSignal`, `WorkerSignalHandler`, notify subscribers before handling.
- `src/lib/compass-logic/worker/index.ts` – export `WorkerSignalHandler`.
- `src/lib/compass-logic/editor/qbscript-language.ts` – QBScript StreamLanguage + highlight style.
- `src/lib/compass-logic/editor/qbscript-autocomplete.ts` – autocomplete override.
- `src/lib/compass-logic/editor/code-mirror-editor.tsx` – React CodeMirror wrapper.
- `src/lib/compass-logic/editor/index.ts` – editor exports.
- `src/pages/ruleset/scripts/scripts-index.tsx` – script library page.
- `src/pages/ruleset/scripts/script-list-item.tsx` – script row component.
- `src/pages/ruleset/scripts/script-editor-page.tsx` – editor page with console + error log.
- `src/pages/ruleset/scripts/index.ts` – scripts page exports.
- `src/pages/ruleset/index.ts` – export scripts.
- `src/App.tsx` – routes for scripts index, new, edit.
- `src/components/composites/app-sidebar.tsx` – Scripts nav item and docs path for scripts.

## Dependencies added

- `@codemirror/state`
- `@codemirror/view`
- `@codemirror/language`
- `@codemirror/autocomplete`
- `@codemirror/commands`
- `@lezer/highlight` (used by QBScript theme)
