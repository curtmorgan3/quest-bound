# Character Loader Script Type

## Summary

New script entity type **Character Loader** added. One per ruleset; runs once at character creation only, before initial attribute sync and before archetype on_add scripts.

## Behavior

- **Execution order**: Right after character and characterArchetypes are created → Character Loader → `runInitialAttributeSync` (attribute scripts) → archetype on_add scripts.
- **Context**: Same as other scripts: `Owner` (attributes, actions, items, inventory, `Owner.archetypes`, `Owner.hasArchetype`, add/remove archetype). No separate “character object”; existing Owner API is used.
- **Entry point**: Full script is executed once (no named handler like on_load).
- **When**: Only at first character creation; not run on syncWithRuleset or later.

## Implementation Notes

- **Storage**: Script with `entityType: 'characterLoader'`, `entityId: null` (like global). Enforced “only one per ruleset” in `use-scripts` create/update and in script import.
- **Execution**: `executeCharacterLoader(db, characterId, rulesetId)` in `event-handler-executor.ts`; called from `use-character.ts` `createCharacter()` before `runInitialAttributeSyncSafe`.
- **Export/import**: Path folder `character_loaders/`; metadata and validation include characterLoader; import skips a second Character Loader with a warning.
- **UI**: New type in script editor type dropdown; no entity picker (like Global). Script list filter includes “Character Loader”.
- **Dependency graph**: characterLoader scripts get a node but do not participate in attribute-based execution order.

## Files Touched (main)

- `src/types/data-model-types.ts` – Script / DependencyGraphNode entityType
- `src/lib/compass-logic/runtime/script-runner.ts` – triggerType `character_load`
- `src/lib/compass-logic/reactive/event-handler-executor.ts` – executeCharacterLoader, persistCharacterLoaderLogs
- `src/lib/compass-api/hooks/characters/use-character.ts` – call executeCharacterLoader before initial sync
- `src/lib/compass-api/hooks/scripts/use-scripts.ts` – getEntityTable, create/update, one-per-ruleset
- `src/pages/ruleset/scripts/*` – templates, editor top bar, scripts index filter
- Export/import: script-utils, script-export, script-import
