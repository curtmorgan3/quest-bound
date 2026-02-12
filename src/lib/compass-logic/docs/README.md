# Compass Logic - Scripting and Logic System

## Overview

This directory will contain the scripting and logic functionality for Quest Bound, enabling dynamic behavior and automation within rulesets.

## Current System Understanding

### Architecture

- **Quest Bound** is a progressive web app for creating digital tabletop RPGs
- Built with React, TypeScript, Vite
- Uses Dexie (IndexedDB) for local-first data storage
- Component-based visual editor using @xyflow/react for node-based layouts

### Core Data Model

The system has several key entities:

1. **Rulesets** - Game systems created by users
2. **Characters** - Player characters within a ruleset
3. **Attributes** - Character properties (string, number, boolean, list types)
   - Can have min/max values, options, default values
   - Support multi-select lists
4. **Actions** - Currently simple entities with title, description, category, image
5. **Items** - Inventory items with properties like weight, quantity, equippable, consumable
6. **Charts** - Data tables for reference
7. **Documents** - Reference materials, can include PDFs
8. **Windows** - UI containers for components
9. **Components** - Visual elements on character sheets (text, input, checkbox, inventory, graph, frame, etc.)

### Current Functionality

#### Component System

Components can be linked to attributes via `attributeId` and actions via `actionId`. Component types include:

- **Text** - Display text with interpolation support
- **Input** - User input fields (text, number, select/dropdown)
- **Checkbox** - Boolean toggles
- **Inventory** - Grid-based item management
- **Graph** - Visual progress bars (linear/circular)
- **Image** - Display images
- **Shape** - Basic shapes
- **Content** - Rich text content
- **Frame** - Embed external content

#### Data Interpolation

The system supports basic templating via `{{attribute_name}}` syntax:

- Text components can reference character attributes
- Values are injected at render time via `injectCharacterData()`
- Special `{{name}}` token for character name

#### Dice Rolling

- Supports dice notation parsing (e.g., "2d6+4", "1d20")
- Text components can detect dice expressions and make them clickable
- Integration with dddice-js for 3D dice rolling

#### Conditional Rendering

Components support:

- `conditionalRenderAttributeId` - Show/hide based on attribute value
- `conditionalRenderInverse` - Invert the condition

### Current Limitations (Opportunities for Scripting)

1. **Actions** are currently passive - they have no executable behavior
2. **No computed attributes** - can't derive one attribute from others
3. **No validation rules** - can't enforce constraints beyond min/max
4. **No event handling** - can't trigger logic on attribute changes
5. **Limited conditional logic** - only simple show/hide based on single attribute
6. **No formulas** - can't do math operations between attributes
7. **No state machines** - can't model complex game states
8. **No automation** - can't auto-update values based on rules

## Questions for Discussion

### Scope and Use Cases

1. What are the primary use cases you envision for scripting?
   - Computed attributes (e.g., AC = 10 + DEX modifier)?
   - Action execution (e.g., casting a spell reduces mana)?
   - Complex validation (e.g., can't exceed max HP)?
   - Automated updates (e.g., leveling up changes multiple stats)?
   - Conditional logic beyond simple show/hide?

2. Should scripts be:
   - Per-action (scripts that run when an action is triggered)?
   - Per-attribute (computed/derived values)?
   - Per-component (custom behavior)?
   - Global to the ruleset (game rules)?
   - Event-driven (onChange, onLoad, etc.)?

### Scripting Language/Approach

3. What scripting approach do you prefer?
   - **Formula-based** (Excel-like: `=10 + {{DEX}} * 2`) - simple, familiar
   - **Expression language** (e.g., JavaScript subset, JSONLogic) - more powerful
   - **Visual scripting** (node-based logic builder) - accessible, no coding
   - **Full JavaScript** (sandboxed) - most flexible, security concerns
   - **Domain-specific language** (custom syntax for RPG rules) - tailored but new to learn

4. Where should scripts be authored?
   - In the component editor UI?
   - In a dedicated scripting panel?
   - In the action/attribute definition screens?
   - In a separate "logic editor" view?

### Execution Model

5. When should scripts execute?
   - On attribute change (reactive)?
   - On action click/trigger?
   - On page load?
   - On specific events (combat start, level up, etc.)?
   - Continuously (live computed values)?

6. Should scripts be able to:
   - Read any attribute?
   - Write to any attribute?
   - Trigger other actions?
   - Show notifications/dialogs?
   - Roll dice programmatically?
   - Access inventory items?
   - Modify the character sheet layout?

### Safety and Constraints

7. How should we handle errors in scripts?
   - Silent failure with fallback values?
   - Show error messages to users?
   - Validation before saving?
   - Sandbox execution to prevent crashes?

8. Should there be limits on:
   - Script execution time?
   - Number of operations?
   - Which entities can be accessed?
   - Recursion/circular dependencies?

### Data Model Changes

9. Where should scripts be stored?
   - In the `Action` entity (add `script` field)?
   - In the `Attribute` entity (for computed attributes)?
   - In the `Component` entity (for component-specific logic)?
   - New `Script` entity (separate, reusable)?
   - In the `Ruleset` entity (global rules)?

10. Should scripts be:
    - Versioned (track changes)?
    - Shareable between rulesets?
    - Importable/exportable separately?

### User Experience

11. Who is the target user for creating scripts?
    - Ruleset creators (game designers)?
    - Players (customizing their characters)?
    - Both?

12. What level of programming knowledge should be assumed?
    - None (visual/formula-based only)?
    - Basic (simple expressions)?
    - Intermediate (conditional logic, loops)?
    - Advanced (full programming)?

### Integration Points

13. How should scripts integrate with existing features?
    - Should dice rolls be scriptable?
    - Should inventory operations trigger scripts?
    - Should scripts affect conditional rendering?
    - Should charts/documents be accessible to scripts?

14. Should there be a testing/debugging mode?
    - Preview script results before saving?
    - Step-through execution?
    - Console/log output?
    - Test characters for validation?

## Initial Thoughts

Based on the codebase structure, a phased approach might work well:

**Phase 1: Formula-based Computed Attributes**

- Add `formula` field to Attribute entity
- Support simple expressions like `10 + {{DEX}} * 2`
- Evaluate formulas when rendering components
- Extend `injectCharacterData()` to handle formulas

**Phase 2: Action Scripts**

- Add `script` field to Action entity
- Define simple DSL for common operations (set attribute, roll dice, show message)
- Execute when action is clicked/triggered
- Track execution in character history/log

**Phase 3: Event System**

- Add event hooks (onChange, onLoad, etc.)
- Allow scripts to subscribe to events
- Support validation and side effects

**Phase 4: Advanced Features**

- Visual scripting editor
- Complex conditional logic
- State machines
- Debugging tools

## Decisions Made

### Scripting Language (Question 3)

**Decision: Custom interpreted C-like language called QBScript (.qbs)**

Key requirements:

- C-like syntax similar to JavaScript
- Simple but powerful enough for general use cases
- Support for lexical scope
- Built-in functions for accessing:
  - Attributes
  - Actions
  - Items
  - Charts
- File extension: `.qbs`
- Future: Visual node-based editor that compiles to QBScript

### Performance & Architecture (Critical)

**Non-blocking execution model:**

- Interpreter must run in a Service Worker
- Cannot block rendering
- Use signals or similar pattern for communication
- Efficiency is a top priority

### Future Extensibility

- Node-based visual editor will compile to QBScript text
- The interpreter remains the execution engine regardless of authoring method

### Target Users (Questions 11-12)

**Decision: Game designers creating rulesets**

User profile:

- Game designers, not programmers
- Some technical knowledge assumed
- Players will NOT write custom scripts
- Players only interact with scripts through the UI (clicking actions, changing attributes, etc.)

Implications:

- Need clear documentation and examples
- Error messages should be helpful and actionable
- Syntax should be intuitive and forgiving where possible
- Visual editor becomes more important for accessibility

### Script Scope & Permissions (Questions 4, 6, 9)

**Decision: Entity-associated scripts with full access**

Script Association:

- One script per entity (1:1 relationship)
- Scripts are associated with **Attribute records** (not character attributes)
- Example: `hit_points.qbs` associated with the "Hit Points" attribute definition
- Stored as a field on the entity (e.g., `script` field on Attribute)

Permissions:

- **Full read access** to attributes, actions, items
- **Full write access** to attributes, actions, items

Execution Model:

- Scripts declare their own **subscriptions** (dependencies)
- Script re-executes when subscribed attributes change (reactive)
- **Return value** sets the associated entity's value
- **Side effects** can alter other entities

Key Distinction:

- **Attribute** (ruleset-level definition) - has the script
- **CharacterAttribute** (character-specific instance) - script operates on these instances
- Script subscribes to, publishes events about, and alters CharacterAttribute values
- One script definition, many character instances

Example flow:

```
// In hit_points.qbs (associated with Hit Points attribute)
subscribe(constitution, level);  // Re-run when these change

let maxHP = 10 + (constitution * 2) + (level * 5);
return maxHP;  // Sets this character's Hit Points value
```

### Script Attachment Points (Question 1)

**Decision: Scripts can be attached to Attributes, Items, and Actions**

**Attributes:**

- Have scripts with return values
- Reactive (subscription-based)
- Return value sets the attribute's value

**Actions:**

- Have scripts with NO return value
- Only produce side effects
- Execute when triggered (clicked, called, etc.)

**Items:**

- Have built-in event handler methods:
  - `onEquip()` - fires when item is equipped
  - `onConsume()` - fires when item is consumed
  - (potentially others: `onUnequip`, `onDrop`, `onPickup`, etc.)
- Can call Actions from within item scripts
- Example: Ring of Healing calls the "Heal" action when equipped

Script patterns:

```javascript
// attribute: hit_points.qbs
subscribe(constitution, level);
return 10 + (constitution * 2) + (level * 5);

// action: cast_fireball.qbs
setAttribute('mana', getMana() - 5);
rollDice('8d6');
// no return

// item: ring_of_healing.qbs
onEquip() {
  callAction('Heal');
}
```

### Execution Triggers (Question 2)

**Decision: Multiple trigger types depending on entity**

**Attribute Scripts:**

- Run on character/page load (initial calculation)
- Re-run when any subscribed attribute changes (reactive)
- Continuous synchronization

**Action Scripts:**

- Can be associated to UI components
- Execute when UI is clicked/triggered
- Manual/explicit execution only

**Item Scripts:**

- Event handlers fire when corresponding UI is clicked
- `onEquip()` fires when player clicks equip button
- `onConsume()` fires when player clicks consume button
- Event-driven based on player interaction

Execution summary:

- **Load time**: Attribute scripts (initial values)
- **Reactive**: Attribute scripts (on dependency change)
- **User-triggered**: Action scripts, Item event handlers (on click)

### Script Lifecycle & Overrides (Question 3)

**Decision: Continuous sync with player override capability**

**Computed Attributes:**

- Continuously kept in sync with dependencies
- Example: Max HP always reflects current Constitution and Level

**Player Overrides:**

- Players can manually override computed values
- Overriding temporarily disables the script for that character attribute
- Script stops running until override is cleared
- Allows for temporary buffs, debuffs, or special cases

Implementation implications:

- CharacterAttribute needs a flag: `scriptDisabled: boolean` or `overridden: boolean`
- UI needs a way to show "this value is computed" vs "this value is overridden"
- UI needs a way to re-enable script (clear override)
- When override is cleared, script re-runs and recalculates value

Example use case:

- Max HP normally = 10 + (CON _ 2) + (Level _ 5)
- Player gets temporary +10 HP buff from spell
- Player manually sets Max HP to computed value + 10
- Script is disabled for this character
- When buff expires, player clears override, script resumes

### Side Effects & Transactions (Question 4)

**Decision: Cascading updates with safety mechanisms**

**Cascading Behavior:**

- Side effects CAN trigger other scripts
- setAttribute() on attribute A can cause attribute B's script to re-run
- Allows for complex reactive chains

**Infinite Loop Prevention:**

**Runtime Protection:**

- Track script evaluation count over time window
- If threshold exceeded (e.g., 100 evaluations in 1 second):
  - Disable ALL scripts for that character
  - Show error message to player/designer
  - Require manual re-enable
- Prevents browser lockup

**Design-time Detection:**

- Analyze dependency graph when script is saved
- Detect circular dependencies (A subscribes to B, B subscribes to A)
- Surface warnings to designer
- Don't prevent saving, but warn about potential issues

**Rollback Mechanism:**

- Implement transaction-like behavior
- If script throws error or hits loop limit:
  - Rollback all changes made during that execution chain
  - Restore previous attribute values
- Ensures data integrity

Implementation notes:

- Need execution context that tracks:
  - Scripts executed in current chain
  - Original values before chain started
  - Evaluation count and timing
- Service Worker needs to maintain this state
- May need "execution ID" to group related script runs

### Built-in API Surface (Question 5)

**Decision: Accessor object pattern with context awareness**

**Accessor Objects:**
Three context objects for data access:

1. **`Ruleset`** - Accesses ruleset-level definitions
   - `Ruleset.Attribute('Hit Points')` - returns Attribute record (definition)
   - `Ruleset.Action('Cast Fireball')` - returns Action record
   - `Ruleset.Item('Health Potion')` - returns Item record
   - `Ruleset.Chart('Spell List')` - returns Chart record

2. **`Owner`** - The character executing the script
   - `Owner.Attribute('Hit Points')` - returns CharacterAttribute record (instance)
   - `Owner.Item('Health Potion')` - returns character's inventory item
   - Always available
   - Represents "this character"

3. **`Target`** - Optional character selected by user
   - `Target.Attribute('Hit Points')` - returns target's CharacterAttribute
   - `Target.Item('Health Potion')` - returns target's inventory item
   - May be null/undefined if no target selected
   - Allows cross-character interactions (healing others, attacks, etc.)

**Context Provision:**

- Owner and Target provided by user interaction
- Owner = character whose sheet is open / who triggered the action
- Target = character selected via UI (for spells/actions affecting others)

**API Pattern:**

```javascript
// Get definition
let hpDef = Ruleset.Attribute('Hit Points');

// Get character's current value
let currentHP = Owner.Attribute('Hit Points').value;

// Modify owner's attribute
Owner.Attribute('Hit Points').value = 50;

// Affect target (if selected)
if (Target) {
  Target.Attribute('Hit Points').value -= 10;
}
```

Note: Detailed QBScript syntax will be documented separately for iteration.

### Data Types (Question 6)

**Decision: Primitives, arrays, and special types**

**Core Types:**

- **Primitives:**
  - `number` - integers and floats
  - `string` - text values
  - `boolean` - true/false
- **Arrays:**
  - `[1, 2, 3]` - ordered collections
  - Support standard operations (push, pop, length, indexing, etc.)

**User-Defined:**

- **Variables:** `let hp = 100;`
- **Functions:** User can define their own functions
  ```javascript
  function calculateModifier(score) {
    return (score - 10) / 2;
  }
  ```

**Global Scripts:**

- Scripts can be marked as `global`
- All variables and functions in global scripts are available to all other scripts
- Enables shared utility functions and constants
- Example: `utils.qbs` marked as global provides `calculateModifier()` to all scripts

**Special Types:**

- Return values from accessor methods have special types:
  - `Ruleset.Attribute()` returns Attribute type
  - `Owner.Attribute()` returns CharacterAttribute type
  - `Ruleset.Item()` returns Item type
  - `Owner.Item()` returns InventoryItem type
  - `Ruleset.Chart()` returns Chart type
  - `Ruleset.Action()` returns Action type
- These types have specific properties/methods based on their entity

**Not Supported:**

- Objects/maps (not needed)
- null (may not be needed - use undefined or special handling)

Implementation notes:

- Need to define the shape of special types (what properties/methods they expose)
- Global script execution order matters (globals must load first)
- Need mechanism to mark scripts as global in the database

### Control Flow (Question 7)

**Decision: Essential control flow only**

**Supported:**

- **Conditionals:**
  ```javascript
  if (condition) {
    // code
  } else if (otherCondition) {
    // code
  } else {
    // code
  }
  ```
- **Loops:**

  ```javascript
  for (let i = 0; i < 10; i++) {
    // code
  }
  ```

  - Standard C-style for loops
  - Iteration over arrays

**Not Supported (for now):**

- Recursion
- Early return (functions run to completion)
- try/catch error handling
- while loops (can be added later if needed)
- break/continue (can be added later if needed)

Rationale:

- Keeps interpreter simpler
- Covers 90% of use cases
- Can add features incrementally based on user needs
- Prevents some complexity/performance issues (deep recursion)

### Error Handling (Question 8)

**Decision: Halt, log, and surface errors**

**On Script Failure:**

1. **Halt execution** immediately
2. **Store error** in dedicated error log
3. **Surface to user** via UI notification

**Error Log Store:**

- Separate database table/store for script errors
- Store details:
  - Timestamp
  - Script name/entity
  - Character ID (if applicable)
  - Error message
  - Line number (if available)
  - Stack trace (if available)
  - Context (what triggered the script)

**User Notification:**

- Show error message in UI
- For game designers: detailed error with line number, context
- For players: user-friendly message ("A script error occurred")
- Link to error log for details

**Rollback Behavior:**

- When script fails, rollback all changes (as discussed in Question 4)
- Character state returns to pre-execution state
- Prevents partial/corrupted updates

Implementation notes:

- Need ScriptError entity in database
- Need UI component for displaying errors
- Need error log viewer (especially for designers)
- Service Worker must catch all errors and communicate them back
- Consider error severity levels (warning vs critical)

### Testing & Debugging (Question 9)

**Decision: Test characters with console logging**

**Test Characters:**

- Use existing "test character" functionality
- Designers test scripts on test characters before using on real characters
- Test characters can be created/deleted freely
- Allows safe experimentation without affecting real game data

**Console Logging:**

- Built-in `log()` function available in scripts
  ```javascript
  log('HP calculated:', hp);
  log('Modifier:', modifier, 'Base:', base);
  ```
- Logs captured by interpreter
- Stored in memory (not persisted to database)
- Associated with character and script execution

**Console UI:**

- Read-only console panel in the UI
- Shows logs from script executions
- Filterable by:
  - Character
  - Script/entity
  - Timestamp
  - Log level (if we add warn/error levels)
- Clears on page refresh or manually
- Only visible to designers (not players)

**Debug Workflow:**

1. Designer creates test character
2. Writes script with log() statements
3. Triggers script (load character, change attribute, click action)
4. Views console output in UI
5. Iterates on script

Implementation notes:

- Console logs sent from Service Worker to main thread via signals
- Need ConsoleLog message type in signal protocol
- UI component: expandable console panel (similar to browser DevTools)
- Consider log limits (max 1000 logs, then rotate)
- Timestamp each log with high precision for debugging timing issues

### Storage & Versioning (Question 10)

**Decision: Separate Script entity with source code storage**

**Script Entity:**
New database table for scripts:

```typescript
type Script = BaseDetails & {
  rulesetId: string;
  name: string; // e.g., "hit_points", "cast_fireball"
  sourceCode: string; // Full .qbs source code
  entityType: 'attribute' | 'action' | 'item';
  entityId: string; // ID of associated attribute/action/item
  isGlobal: boolean; // Whether this is a global utility script
  // Future: compiled bytecode cache?
};
```

**Entity Relationships:**

- Script record holds the association (entityType + entityId)
- Alternative approach: Entity holds scriptId
  - `Attribute.scriptId?: string`
  - `Action.scriptId?: string`
  - `Item.scriptId?: string`
- One-to-one relationship (one script per entity)

**Export/Import:**

- When ruleset is exported:
  - Scripts exported as individual `.qbs` files
  - Directory structure: `/scripts/attributes/hit_points.qbs`
  - File contains full source code
- Users can edit `.qbs` files in external editors (VS Code, etc.)
- When imported back:
  - Parse `.qbs` files
  - Create/update Script records
  - Maintain associations to entities

**Benefits:**

- Scripts are version-controlled outside QB (git, etc.)
- Can use external tooling (syntax highlighting, linting)
- Scripts are portable and shareable
- Clean separation of concerns (script code vs entity data)

Implementation notes:

- Add Script table to database schema
- Update export/import logic to handle scripts
- Need file naming convention (entity name sanitized for filesystem)
- Consider script validation on import
- May want script versioning in future (store history of changes)

## Complete Feature Summary

### QBScript System Overview

A complete scripting system for Quest Bound enabling reactive game logic, executable actions, and event-driven item behavior.

**Language:** Custom C-like interpreted language (QBScript, `.qbs` files)
**Execution:** Service Worker with signal-based communication (non-blocking)
**Users:** Game designers (some technical knowledge, not programmers)
**Access:** Full read/write to attributes, actions, items, charts

### Script Types & Behavior

| Type          | Attachment       | Return Value               | Triggers                  | Use Case                                         |
| ------------- | ---------------- | -------------------------- | ------------------------- | ------------------------------------------------ |
| **Attribute** | Attribute entity | Yes (sets attribute value) | Load + dependency changes | Computed values (Max HP = 10 + CON\*2)           |
| **Action**    | Action entity    | No (side effects only)     | UI click                  | Abilities (Cast Fireball reduces mana)           |
| **Item**      | Item entity      | Event handlers             | UI click (equip/consume)  | Item effects (Ring of Healing calls Heal action) |

### Execution Model

- **Reactive:** Attribute scripts auto-run on dependency changes via `subscribe()`
- **Cascading:** Side effects can trigger other scripts
- **Override:** Players can disable scripts and manually set values
- **Transactional:** Errors rollback all changes in execution chain
- **Safe:** Infinite loop detection (evaluation count threshold)

### Language Features

- **Types:** number, string, boolean, arrays, special entity types
- **Control Flow:** if/else if/else, for loops
- **Functions:** User-defined functions
- **Scope:** Lexical scoping, global scripts for shared utilities
- **Built-ins:** `Owner`, `Target`, `Ruleset` accessors, log()`

### Safety & Quality

- **Design-time:** Circular dependency detection with warnings
- **Runtime:** Execution count limits, error halting, rollback mechanism
- **Debugging:** Console logging, test characters, error log storage
- **Errors:** Halt on error, log to database, surface to UI

### Data Model

- New **Script** entity (stores source code + associations)
- Scripts linked to attributes, actions, or items
- Export/import as `.qbs` files for external editing
- Support for global utility scripts

## QBScript Syntax Review

Reviewed syntax specification in QBScript.md. Key observations:

### Syntax Highlights

- **Python-like**: Colon-based blocks, indentation-aware
- **Implicit returns**: Attribute scripts return last expression
- **Method chaining**: `Owner.Attribute('HP').add(10)` is clean
- **For-in loops**: `for arrow in arrows:` and `for index in 10:` are intuitive
- **Event handlers**: `on_equip()`, `on_activate()` pattern for Items/Actions

### Questions & Clarifications Needed

1. **Variable declaration** ✅
   - **Decision:** No keyword needed (Python-style)
   - `hit_points = Owner.Attribute('Hit Points')`
   - Assignment creates new variable if it doesn't exist, updates if it does
   - Simpler for non-programmers

2. **Function syntax** ✅
   - **Decision:** No keyword needed
   - `func_name(parameters):`
   - Parameters are untyped (dynamic typing)
   - Clean and minimal syntax

3. **Block endings** ✅
   - **Decision:** Indentation-only (Python-style)
   - No `end` keyword needed
   - Line 169 in examples is a typo - should be removed
   - Blocks defined by indentation level

4. **Return statements** ✅
   - **Decision:** Explicit `return` required
   - **Attribute scripts:** Must use `return value` to set attribute value
   - **Action/Item scripts:** `return` ends execution early (no value)
   - Early exit pattern: `return` acts like early termination
   - Examples need updating to include explicit `return` statements

5. **String interpolation** ✅
   - **Decision:** Works in all string contexts
   - Syntax: `{{variable}}`
   - Examples:
     - `announce('Hit for {{damage}} damage!')`
     - `message = 'You have {{hp}} health'`
     - `Owner.Attribute('Status').set('Level {{level}}')`
   - Consistent with existing Quest Bound attribute interpolation

6. **Dice rolling** ✅
   - **Decision:** Explicit `roll()` function required
   - `roll('1d8')` returns a number (the rolled result)
   - `roll('4d6+3')` supports modifiers
   - `roll('{{level}}d4')` supports interpolation in dice string
   - Examples:
     - `damage = roll('1d8')`
     - `healing = roll('2d6+4')`
     - `level_damage = roll('{{Owner.Attribute('Level')}}d4')`
   - Line 64 examples need updating to show `roll()` function
   - No ambiguity: `1d8` is not valid syntax, must use `roll('1d8')`

7. **Boolean logic** ✅
   - **Decision:** C-style operators
   - **AND:** `&&`
   - **OR:** `||`
   - **NOT:** `!`
   - **Equality:** `==` (equals), `!=` (not equals)
   - Examples:
     - `if hp > 0 && mana >= 5:`
     - `if is_dead || is_unconscious:`
     - `if !has_shield:`
   - Keeps syntax closer to C/JavaScript despite Python-like structure

8. **Attribute methods and value access** ✅
   - **Decision:** Explicit `.value` property required
   - **Reading values:** `Owner.Attribute('HP').value`
   - **Comparison:** `Owner.Attribute('Attack Power').value > Target.Attribute('Defense Power').value`
   - **Methods chained on Attribute:**
     - `.set(newValue)` - sets attribute value
     - `.add(amount)` - adds to current value
     - `.subtract(amount)` - subtracts from current value
     - `.multiply(factor)` - multiplies current value
     - `.divide(divisor)` - divides current value
     - `.max()` - sets to attribute's max property
     - `.min()` - sets to attribute's min property
     - `.flip()` - toggles boolean attribute
     - `.random()` - sets to random option (list attributes)
     - `.next()` - sets to next option (list attributes)
     - `.prev()` - sets to previous option (list attributes)
   - Examples:
     - `Owner.Attribute('Hit Points').add(12)` - adds 12 to HP
     - `current_hp = Owner.Attribute('Hit Points').value` - reads HP
     - `Owner.Attribute('Mana').set(100)` - sets mana to 100
   - Line 174 needs `.value` added

9. **Array methods** ✅
   - **Decision:** All methods with parentheses
   - `.count()` - returns array length
   - `.first()` - returns first element
   - `.last()` - returns last element
   - `.push(item)` - adds item to end
   - `.pop()` - removes and returns last item
   - Indexing: `array[index]` (zero-based)
   - Consistent syntax: all operations use `()`
   - Lines 36-40 need updating

10. **Chart queries** ✅
    - **Decision:** `.where()` returns cell value directly
    - **Signature:** `.where(source_column, source_value, target_column)`
    - **Behavior:**
      1. Finds first row where `source_column` equals `source_value`
      2. Returns the value in `target_column` of that row
      3. If no match found, returns empty string `''`
    - **Examples:**
      - `spell_damage = Ruleset.Chart('Spells').where('Spell Name', 'Fireball', 'Damage')`
      - `xp_needed = Ruleset.Chart('Level Table').where('Level', current_level, 'XP Required')`
    - `.get(column_name)` - still returns array of all values in that column
    - No `.whereAll()` for now (can add later if needed)
    - Line 122 needs updating to new signature

11. **Action activation and Target parameter** ✅
    - **Decision:** Target parameter determines UI behavior
    - **With Target:** `on_activate(Target):`
      - UI prompts user to select a character before executing
      - Target is guaranteed to exist (no null check needed)
    - **Without Target:** `on_activate():`
      - Executes immediately on click
      - Only affects Owner
    - **Examples:**
      - `on_activate(Target):` - healing spell that requires target selection
      - `on_activate():` - self-buff that only affects Owner
    - **UI Flow:**
      1. User clicks action button
      2. If signature includes Target, show character selector
      3. User selects target character
      4. Script executes with selected Target
    - Lines 158-168 should remove `if Target:` checks (Target is guaranteed)
    - Same pattern applies to `on_deactivate(Target):` if needed

12. **Item properties** ✅
    - **Decision:** Custom primitive properties on Item records
    - Designers can add arbitrary properties to Item entities
    - Property types: number, string, boolean
    - Access via dot notation: `item.property_name`
    - **Examples:**
      - Armor: `armor.armor_value`, `armor.defense_bonus`
      - Weapon: `weapon.damage`, `weapon.attack_bonus`, `weapon.durability`
      - Potion: `potion.healing_amount`, `potion.duration`
    - **Usage:**
      ```
      armor = Owner.Item('Plate Mail')
      Owner.Attribute('Armor Class').add(armor.armor_value)
      ```
    - Item record needs to support dynamic properties (schema extension)
    - Properties defined in Item creation UI

13. **Comments** ✅
    - **Decision:** C-style comments
    - **Single-line:** `// comment text`
    - **Multi-line:** `/* comment text */`
    - **Examples:**

      ```
      // Calculate damage
      damage = roll('1d8')

      /*
      This is a complex calculation
      that requires multiple steps
      */
      total = base + modifier
      ```

    - Familiar to most developers

14. **Subscription parameters** ✅
    - **Decision:** String literals or variable references
    - **Subscribable events:**
      - Attribute value changes
      - Action `on_activate()` firing
      - Action `on_deactivate()` firing
    - **Syntax:**
      - `subscribe('Attribute Name', 'Another Attribute')`
      - `subscribe(variable_name)` where variable holds attribute/action name
      - `subscribe('Action Name', 'Attribute Name')` - mixed types allowed
    - **Examples:**

      ```
      // Subscribe to attributes
      subscribe('Constitution', 'Level')

      // Subscribe to action activation
      subscribe('Mage Armor', 'Shield Spell')

      // Variable reference
      attr = 'Hit Points'
      subscribe(attr, 'Constitution')
      ```

    - **Cannot subscribe to:**
      - Item events (on_equip, on_consume, etc.)
      - Item quantity/inventory changes
      - (Can add later if needed)
    - Lines 125-126 are correct

### Syntax Fixes Needed in QBScript.md

| Issue           | Line     | Current                                        | Fix To                                                        |
| --------------- | -------- | ---------------------------------------------- | ------------------------------------------------------------- |
| `end` keyword   | 169      | Has `end`                                      | **Remove** (indentation-only) ✅                              |
| Array methods   | 36-40    | `.count` `.first` `.last`                      | **Change to** `.count()` `.first()` `.last()` ✅              |
| Math power      | 58       | `^2`                                           | **Change to** `**` (e.g., `x**2`) ✅                          |
| Dice notation   | 64       | `1d8, 4d10`                                    | **Change to** `roll('1d8')`, `roll('4d10')` ✅                |
| Missing return  | Multiple | Implicit returns                               | **Add explicit** `return` statements ✅                       |
| Attribute value | 174      | `Owner.Attribute('X') > Target.Attribute('Y')` | **Add** `.value` to both ✅                                   |
| Chart signature | 122      | `.where(column_name, some_value)`              | **Change to** `.where(source_col, source_val, target_col)` ✅ |
| Target check    | 159-162  | `if Target:`                                   | **Remove** (Target is guaranteed if in signature) ✅          |
| Typo            | 176      | `Owner.Attibute`                               | **Fix to** `Owner.Attribute` ✅                               |
| Typo            | 178      | `{{damance}}`                                  | **Fix to** `{{damage}}` ✅                                    |

## QBScript Syntax Reference (Finalized)

### Variables & Assignment

```javascript
// No keyword needed - assignment creates or updates
hp = 100;
name = 'Warrior';
is_alive = true;
```

### Functions

```javascript
// No keyword - just name and parameters
calculateModifier(score):
  return (score - 10) / 2

getMaxHP(con, level):
  base = 10
  return base + (con * 2) + (level * 5)
```

### Control Flow

```javascript
// If/else (indentation-based blocks)
if condition:
  // code
else if other_condition:
  // code
else:
  // code

// For loops
for item in array:
  // code

for i in 10:
  // loops 10 times (i = 0 to 9)
```

### Data Types

- **Primitives:** `number`, `string`, `boolean`
- **Arrays:** `[1, 2, 3]`
- **Special:** Attribute, Action, Item, Chart objects

### Operators

- **Math:** `+`, `-`, `*`, `/`, `**` (power), `%` (modulo)
- **Comparison:** `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Boolean:** `&&` (and), `||` (or), `!` (not)

### String Interpolation

```javascript
message = 'You have {{hp}} health';
announce('Damage: {{damage}}');
```

### Accessors

```javascript
Owner; // Character executing the script
Target; // Character selected by user (if required)
Ruleset; // Ruleset-level data
```

### Built-in Functions

```javascript
// Dice
roll('1d8');
roll('2d6+4');
roll('{{level}}d4');

// Math
floor(3.7); // 3
ceil(3.2); // 4
round(3.5); // 4

// UI
announce('message');
log('debug info');

// Subscriptions (in attribute scripts)
subscribe('Attribute Name', 'Another Attribute');
subscribe('Action Name');
```

### Attribute Methods

```javascript
attr = Owner.Attribute('Hit Points');

attr.value; // Read current value
attr.set(100); // Set to 100
attr.add(10); // Add 10
attr.subtract(5); // Subtract 5
attr.multiply(2); // Multiply by 2
attr.divide(2); // Divide by 2
attr.max(); // Set to max value
attr.min(); // Set to min value
attr.flip(); // Toggle boolean
attr.random(); // Random option (list)
attr.next(); // Next option (list)
attr.prev(); // Previous option (list)
```

### Character Methods

```javascript
Owner.hasItem('Sword');
Owner.addItem('Potion', 3);
Owner.removeItem('Arrow', 1);
```

### Item Methods

```javascript
item = Owner.Item('Health Potion');
items = Owner.Items('Arrow');

items.count(); // Number of items
items.first(); // First item
items.last(); // Last item
items.push(new_item); // Add item
items.pop(); // Remove last
items[0]; // Access by index
```

### Chart Methods

```javascript
chart = Ruleset.Chart('Spell List');

chart.get('Spell Name'); // Array of all spell names
chart.where('Spell Name', 'Fireball', 'Damage'); // Find row, return value
```

### Action Methods

```javascript
action = Owner.Action('Mage Armor');

action.activate(); // Trigger on_activate
action.deactivate(); // Trigger on_deactivate
```

### Comments

```javascript
// Single line comment

/*
  Multi-line
  comment
*/
```

### Script Types

**Attribute Scripts:**

```javascript
subscribe('Constitution', 'Level');

base = 10;
con = Owner.Attribute('Constitution').value;
level = Owner.Attribute('Level').value;

return base + con * 2 + level * 5;
```

**Action Scripts:**

```javascript
// With target
on_activate(Target):
  damage = roll('1d8')
  Target.Attribute('Hit Points').subtract(damage)
  announce('Hit for {{damage}} damage!')
  return

// Without target
on_activate():
  Owner.Attribute('Mana').subtract(5)
  announce('Spell cast!')
  return

on_deactivate(Target):
  Target.Attribute('Armor Class').subtract(2)
  return
```

**Item Scripts:**

```javascript
on_equip():
  Owner.Attribute('Armor Class').add(5)
  return

on_unequip():
  Owner.Attribute('Armor Class').subtract(5)
  return

on_consume():
  healing = roll('2d4+2')
  Owner.Attribute('Hit Points').add(healing)
  announce('Healed {{healing}} HP!')
  return

// Items can call actions
on_equip():
  Owner.Action('Mage Armor').activate()
  return
```

**Global Scripts:**

```javascript
// Marked as global - available to all scripts

calculateModifier(score):
  return floor((score - 10) / 2)

rollWithAdvantage(dice_expr):
  roll1 = roll(dice_expr)
  roll2 = roll(dice_expr)
  if roll1 > roll2:
    return roll1
  else:
    return roll2
```

## Implementation Status

### Completed ✅

1. ✅ Requirements gathering (14+ questions answered)
2. ✅ Language specification finalized
3. ✅ Syntax documented with comprehensive examples
4. ✅ Use cases identified and documented
5. ✅ Safety mechanisms designed
6. ✅ Error handling strategy defined
7. ✅ QBScript.md updated with correct syntax
8. ✅ Complete D&D example created

### Ready to Implement ⏳

The system is fully specified and ready for implementation. See SUMMARY.md for roadmap.

## Next Implementation Steps

### Phase 1: Interpreter Core (MVP)

- [ ] Lexer - Tokenize QBScript source code
- [ ] Parser - Build Abstract Syntax Tree (AST)
- [ ] Evaluator - Execute AST
- [ ] Built-in functions (roll, floor, ceil, round, announce, log)
- [ ] Operator implementations (+, -, \*, /, \*\*, %, ==, !=, >, <, >=, <=, &&, ||, !)
- [ ] Control flow (if/else if/else, for loops)
- [ ] String interpolation {{variable}}
- [ ] Unit tests for interpreter

### Phase 2: Service Worker Integration

- [ ] Service Worker setup
- [ ] Signal-based communication protocol
- [ ] Script execution manager
- [ ] Error capture and logging
- [ ] log() forwarding to UI
- [ ] Performance monitoring (execution count tracking)

### Phase 3: Data Model & Database

- [ ] Script entity (id, rulesetId, name, sourceCode, entityType, entityId, isGlobal)
- [ ] Add scriptId fields to Attribute, Action, Item entities
- [ ] Script CRUD operations
- [ ] ScriptError entity for error logging
- [ ] Migration for existing rulesets

### Phase 4: Game Entity Integration

- [ ] Accessor objects (Owner, Target, Ruleset)
- [ ] Attribute methods (.value, .set(), .add(), etc.)
- [ ] Character methods (hasItem, addItem, removeItem)
- [ ] Item methods and custom properties
- [ ] Action methods (activate, deactivate)
- [ ] Chart methods (.get(), .where())

### Phase 5: Reactive System

- [ ] Subscription tracking (subscribe() implementation)
- [ ] Dependency graph builder
- [ ] Circular dependency detection
- [ ] Script re-execution on dependency changes
- [ ] Cascading update handling
- [ ] Infinite loop prevention

### Phase 6: UI Components

- [ ] Script editor (code editor with syntax highlighting)
- [ ] Console panel (displays log() output)
- [ ] Error display notifications
- [ ] Target selector for actions
- [ ] Script override toggle for players
- [ ] Script association UI (link scripts to entities)

### Phase 7: Import/Export

- [ ] Export scripts as .qbs files
- [ ] Import .qbs files
- [ ] File naming conventions
- [ ] Directory structure for exported scripts

### Phase 8: Testing & Debugging

- [ ] Test character integration
- [ ] Comprehensive test suite for interpreter
- [ ] Integration tests for reactive system
- [ ] Performance benchmarks
- [ ] Error message quality review

### Future Enhancements

- [ ] Visual node-based editor (compiles to QBScript)
- [ ] Auto-complete in script editor
- [ ] Documentation tooltips
- [ ] Script templates library
- [ ] Community script sharing
