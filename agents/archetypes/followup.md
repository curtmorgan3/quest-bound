## Open Questions

## Archetypes

- in script editor, event fire UI
- multi-select initial archetype UI with custom load order
- remove ordering from char arch panel
  - load order only matters if you create a character with multiple archetypes
- default shouldn't be a surfaced option. Remove it from archetype lists. Only show archetype UI if ruleset has at least one non-default

## Charts

- Add empty chart, then add/remove row for simple chart creation

## Scripts

- cant edit script type after save
- AttributeProxy
  - `setMax()` and `setMin()` should set character attribute min, max values
  - Change `max` and `min` to `setToMax()` and `setToMin()`
  - Make `max` and `min` property getters
