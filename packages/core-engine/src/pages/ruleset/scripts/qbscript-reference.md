---
sidebar_position: 3
---

# QBScript Reference

A comprehensive guide to QBScript, the scripting language for automating Quest Bound rulesets. QBScript is dynamically typed and interpreted, with Python-style structure (indentation-based blocks) and C-style operators.

## Table of contents

1. [Primitives](#1-primitives)
2. [Math](#2-math)
3. [Variables](#3-variables)
4. [Logical operators](#4-logical-operators)
5. [Conditions](#5-conditions)
6. [Arrays](#6-arrays)
7. [Loops](#7-loops)
8. [Functions](#8-functions)
9. [Accessors](#9-accessors)
10. [Proxies API](#10-proxies-api)
11. [Built-in functions](#built-in-functions)
12. [Comments](#comments)

---

## 1. Primitives

### Numbers

Numeric literals are written as integers or decimals. No type declaration is needed.

```javascript
health = 100;
ratio = 3.14;
level = 5;
```

### Strings

Use single or double quotes. Prefer double quotes when the text contains apostrophes.

```javascript
name = 'Fireball';
message = "Tabby's Tavern";
empty = '';
```

**String methods:**

| Method              | Description                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `.toUpperCase()`    | Returns the string in upper case                                                                                            |
| `.toLowerCase()`    | Returns the string in lower case                                                                                            |
| `.split(separator)` | Splits the string by the given separator and returns an array of substrings (e.g. `'a,b,c'.split(',')` → `['a', 'b', 'c']`) |

**String interpolation:** Embed expressions in strings with `{{variable}}`. Interpolation uses the current script environment (variables in scope).

```javascript
hp = 50;
message = 'You have {{hp}} health';
announce('Damage: {{damage}}');
```

### Booleans

The literals `true` and `false` represent boolean values.

```javascript
alive = true;
hidden = false;
```

### Truthiness

In conditions and logical expressions, values are treated as truthy or falsy:

- **Falsy:** `null`, `undefined`, `0`, empty string `''`, `false`
- **Truthy:** Any other number (including negatives), non-empty string, `true`, non-empty arrays, objects

---

## 2. Math

### Arithmetic operators

| Operator | Meaning                   | Example      |
| -------- | ------------------------- | ------------ |
| `+`      | Addition                  | `a + b`      |
| `-`      | Subtraction               | `a - b`      |
| `*`      | Multiplication            | `a * b`      |
| `/`      | Division (floating-point) | `a / b`      |
| `**`     | Exponentiation            | `2 ** 3` → 8 |
| `%`      | Modulo (remainder)        | `10 % 3` → 1 |

Division is always floating-point. For integer division, use `floor(a / b)`.

### Built-in math functions

| Function    | Description           | Example          |
| ----------- | --------------------- | ---------------- |
| `floor(x)`  | Round down            | `floor(3.7)` → 3 |
| `ceil(x)`   | Round up              | `ceil(3.2)` → 4  |
| `round(x)`  | Round to nearest      | `round(3.5)` → 4 |
| `abs(x)`    | Absolute value        | `abs(-5)` → 5    |
| `min(a, b)` | Smaller of two values | `min(3, 7)` → 3  |
| `max(a, b)` | Larger of two values  | `max(3, 7)` → 7  |

### Type conversion

| Function    | Description                                                              | Example                                                                |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `number(x)` | Parse to number. For strings, commas are removed first (e.g. thousands). | `number("42")` → 42, `number("1,000")` → 1000, `number("3.14")` → 3.14 |
| `text(x)`   | Convert to string                                                        | `text(42)` → `"42"`                                                    |

---

## 3. Variables

Variables are created by assignment. No keyword (e.g. `let` or `var`) is used.

```javascript
hit_points = Owner.Attribute('Hit Points').value;
damage = 10;
name = 'Fireball';
```

- Assignment creates the variable in the current scope if it does not exist, or updates it if it does.
- Variables are dynamically typed; the same variable can hold a number, string, or other value over time.

---

## 4. Logical operators

| Operator | Meaning     | Example    |
| -------- | ----------- | ---------- |
| `&&`     | Logical AND | `a && b`   |
| `\|\|`   | Logical OR  | `a \|\| b` |
| `!`      | Logical NOT | `!flag`    |

Short-circuit evaluation applies: in `a && b`, `b` is not evaluated if `a` is falsy; in `a || b`, `b` is not evaluated if `a` is truthy.

### Comparison operators

| Operator | Meaning               |
| -------- | --------------------- |
| `==`     | Equal (value)         |
| `!=`     | Not equal             |
| `>`      | Greater than          |
| `<`      | Less than             |
| `>=`     | Greater than or equal |
| `<=`     | Less than or equal    |

---

## 5. Conditions

Blocks are defined by indentation; there is no `end` keyword. Parentheses around the condition are optional.

```javascript
if condition:
  // body when condition is truthy

if hp <= 0:
  announce('You have fallen')
```

### else and else if

```javascript
if condition:
  // body
else if other_condition:
  // body
else:
  // body
```

Example:

```javascript
if score >= 90:
  grade = 'A'
else if score >= 80:
  grade = 'B'
else:
  grade = 'C'
```

---

## 6. Arrays

### Array literals

Arrays are created with square brackets. Elements can be any type.

```javascript
list = [];
numbers = [1, 2, 3];
mixed = [1, 'two', true];
```

### Indexing

Arrays are zero-based. Use `array[index]` to read an element.

```javascript
first = numbers[0];
last = numbers[2];
```

Accessing an index out of bounds (negative or ≥ length) causes a runtime error.

### Object literals and property access

Objects are created with curly braces; keys are bare identifiers, values are expressions.

```javascript
dice_mod = { source: 'Blinded', duration: 3 };
effect = { name: 'Poison', stats: { damage: 5, turns: 2 } };
```

**Property access:**

- **Dot notation** — `obj.key` for a fixed property name (e.g. `dice_mod.source` → `'Blinded'`).
- **Bracket notation** — `obj['key']` for a string key; useful when the key is in a variable or contains special characters (e.g. `dice_mod['duration']` → `3`).

Nested objects and objects in arrays work as expected: `effect.stats.turns`, `modifiers[0].source`.

### Array methods

| Method                  | Return value       | Notes                                                                                                                                                                        |
| ----------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list.count()`          | Number of elements | number of items in array                                                                                                                                                     |
| `list.first()`          | First element      |                                                                                                                                                                              |
| `list.last()`           | Last element       |                                                                                                                                                                              |
| `list.push(item)`       | —                  | Adds item to the end (mutates)                                                                                                                                               |
| `list.pop()`            | Last element       | Removes and returns last (mutates)                                                                                                                                           |
| `list.random()`         | Random element     |                                                                                                                                                                              |
| `list.filter()`         | Same array         | No argument: keep only truthy values (mutates in place, returns the same array).                                                                                             |
| `list.filter(filterFn)` | Same array         | Keep only elements for which `filterFn(item)` returns truthy (mutates in place, returns the same array). `filterFn` receives each element; return a truthy value to keep it. |
| `list.filterEmpty()`    | New array          | Copy with non-empty values (excludes `''`, `null`)                                                                                                                           |
| `list.sort()`           | Same array         | Sorts in place; default is string comparison                                                                                                                                 |
| `list.sort(compareFn)`  | Same array         | Sorts in place using comparator                                                                                                                                              |

**Filter examples:**

```javascript
values = [0, 1, '', 'hello', null, 42]
values.filter()   // no arg: keep truthy → [1, 'hello', 42]

isPositive(n):
  return n > 0
scores = [-5, 10, 0, 3, -1]
scores.filter(isPositive)   // → [10, 3]

isAlive(char):
  return char.Attribute('HP').value > 0
chars = Scene.characters()
living = chars.filter(isAlive)
```

**Comparator for `sort(compareFn)`:** Pass a function `compareFn(a, b)`. Return a negative number if `a` should come before `b`, zero if equal, or a positive number if `a` should come after `b`.

```javascript
compareNumeric(a, b):
  return a - b

scores = [10, 3, 25]
scores.sort()              // string order: [10, 25, 3]
scores.sort(compareNumeric) // numeric order: [3, 10, 25]
```

Sorting by a property (e.g. character name):

```javascript
byName(a, b):
  if text(a.name) < text(b.name):
    return -1
  else if text(a.name) > text(b.name):
    return 1
  return 0

chars = Scene.characters()
chars.sort(byName)
```

---

## 7. Loops

### for-in over an array

Iterates over each element; the loop variable holds the element value.

```javascript
for item in Owner.items():
  log(item.name)
```

### for-in over a number

Iterates from `0` to `N - 1`; the loop variable is the index.

```javascript
for i in 10:
  do_something()
```

### while

Repeats while the condition is truthy. Limited to 100,000 iterations; exceeding that throws a runtime error to prevent infinite loops.

```javascript
while condition:
  // body
```

---

## 8. Functions

Define a function by name and parameters. There is no `function` keyword. Use `return` to produce a value or exit early.

```javascript
calculateModifier(score):
  return (score - 10) / 2

getMaxHP(con, level):
  base = 10
  return base + (con * 2) + (level * 5)
```

- Parameters are positional.
- Functions can call other functions and access variables from enclosing scope (closures).
- Returning without a value (or reaching the end without `return`) yields `null`.

---

## 9. Accessors

Accessors are top-level objects that represent the current context and give you access to ruleset and character data.

### Available accessors

| Accessor  | When available                           | Meaning                                                                                                                                             |
| --------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Owner`   | Script has a character context           | The character that initiated the script (e.g. the character whose attribute or action is running)                                                   |
| `Ruleset` | Script has a ruleset                     | Ruleset-level definitions: attributes, charts, items, actions                                                                                       |
| `Self`    | Script is attached to an entity          | The entity the script is attached to: same as `Owner.Attribute('…')`, `Owner.Action('…')`, or `Owner.Item('…')` for that entity                     |
| `Scene`   | Script runs in a campaign with a scene   | The active campaign scene (for scene characters, spawning, turn order)                                                                              |
| `Caller`  | Script runs in an action or item context | The entity that fired the action: when the action is run from an item's context menu, `Caller` is that item instance; otherwise `Caller` is `Owner` |

### Resolving entities by name

Use these on the appropriate accessor to get a **reference** (proxy) you can then read or modify:

| Call                                     | Returns                                                 |
| ---------------------------------------- | ------------------------------------------------------- |
| `<Accessor>.Attribute('attribute name')` | Attribute reference (character or ruleset definition)   |
| `<Accessor>.Action('action name')`       | Action reference (use `.activate()` to run it)          |
| `<Accessor>.Item('item name')`           | First matching item instance (or undefined)             |
| `<Accessor>.Items('item name')`          | Array of matching item instances                        |
| `Ruleset.Chart('chart name')`            | Chart reference                                         |
| `getAttr('attribute name')`              | Shorthand for `Owner.Attribute('attribute name').value` |
| `getChart('chart name')`                 | Shorthand for `Ruleset.Chart('chart name')`             |

Examples:

```javascript
Owner.Attribute('Hit Points');
Owner.Action('Attack');
Ruleset.Attribute('Strength');
getAttr('Hit Points');
getChart('Level Table');
```

### Scene (campaign context)

When a script runs in a campaign with an active scene (e.g. Game Manager or campaign event), the `Scene` accessor is available.

**Methods:**

| Method                                   | Description                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Scene.characters()`                     | Array of character accessors in the current scene (player characters and active NPCs)      |
| `Scene.spawnCharacter('Archetype Name')` | Creates an active NPC in the scene from the archetype; returns a character accessor for it |

Example:

```javascript
npcs = Scene.characters()
for npc in npcs:
  announce('{{npc.name}} is in the scene.')

spawned = Scene.spawnCharacter('Goblin')
announce('Spawned {{spawned.name}}.')
```

**Turn-based mode:**

| Method / property            | Description                                                            |
| ---------------------------- | ---------------------------------------------------------------------- |
| `Scene.currentTurnCycle()`   | Current turn cycle (1-based). 0 when not in turn-based mode.           |
| `Scene.currentStepInCycle()` | 0-based index of whose turn it is. 0 when not in turn-based mode.      |
| `Scene.advanceTurnOrder()`   | Advance to the next character; runs cycle and onTurnAdvance callbacks. |
| `Scene.startTurnBasedMode()` | Enable turn-based mode and assign default turn order.                  |
| `Scene.stopTurnBasedMode()`  | Disable turn-based mode and clear callbacks.                           |
| `Scene.inTurns(n):` …        | Register a block to run in `n` cycles (colon and indented block).      |
| `Scene.onTurnAdvance():` …   | Register a block to run on every advance.                              |

**Character in scene:**

- `char.turnOrder` — This character's position in turn order (0 = unset). Read-only.
- `char.setTurnOrder(num)` — Set this character's turn order (0 = unset; gaps allowed).

**Component style and animation (sheet components):**

You can target sheet components by **reference label** (the component’s reference ID set in the editor). These apply to the character’s sheet in the viewer.

- **`char.setComponentStyle(referenceLabel, styleProp, value)`** — Set a style override for all components on that character’s sheet with the given reference label. The override is persisted on the character and merged when the sheet is rendered. Example: `Owner.setComponentStyle('healthBar', 'backgroundColor', 'red')` or `Owner.setComponentStyle('title', 'color', '#333')`.
- **`char.animateComponent(referenceLabel, animationName)`** — Trigger a one-off animation for all components with that reference label. The animation is delivered when the script run completes and applied in the sheet viewer. Example: `Owner.animateComponent('healthBar', 'shake')`. Supported animation names include those available in the component editor (e.g. `shake`, `pop`, `highlight`, `glow`, `shimmer`, `fade`).

Both work on `Owner` and on any character reference (e.g. from `Scene.characters()`). They are applied when the script run finishes (e.g. after an action’s `on_activate` or when a reactive script runs).

**Available style names for `setComponentStyle(referenceLabel, styleProp, value)`:**

| styleProp                       | Value type | Description                                                                                                                                      |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Background & fill**           |            |                                                                                                                                                  |
| `backgroundColor`               | string     | Solid color (e.g. `'red'`, `'#333'`) or `linear-gradient(angle deg, color1, color2)`. For gradients the runtime may use `background` internally. |
| `background`                    | string     | Use when the fill is a linear gradient (set by the editor when `backgroundColor` is gradient).                                                   |
| **Appearance**                  |            |                                                                                                                                                  |
| `opacity`                       | number     | Opacity 0–1.                                                                                                                                     |
| `outline`                       | string     | Outline style.                                                                                                                                   |
| `outlineWidth`                  | number     | Outline width in pixels.                                                                                                                         |
| `outlineColor`                  | string     | Outline color.                                                                                                                                   |
| **Border radius**               |            |                                                                                                                                                  |
| `borderRadius`                  | string     | Shorthand (e.g. `'8px'`).                                                                                                                        |
| `borderRadiusTopLeft`           | number     | Top-left corner radius in pixels.                                                                                                                |
| `borderRadiusTopRight`          | number     | Top-right corner radius in pixels.                                                                                                               |
| `borderRadiusBottomLeft`        | number     | Bottom-left corner radius in pixels.                                                                                                             |
| `borderRadiusBottomRight`       | number     | Bottom-right corner radius in pixels.                                                                                                            |
| **Padding**                     |            |                                                                                                                                                  |
| `paddingTop`                    | number     | Top padding in pixels.                                                                                                                           |
| `paddingRight`                  | number     | Right padding in pixels.                                                                                                                         |
| `paddingBottom`                 | number     | Bottom padding in pixels.                                                                                                                        |
| `paddingLeft`                   | number     | Left padding in pixels.                                                                                                                          |
| **Text (text components only)** |            |                                                                                                                                                  |
| `color`                         | string     | Text color (solid or gradient string).                                                                                                           |
| `fontSize`                      | number     | Font size in pixels.                                                                                                                             |
| `fontFamily`                    | string     | Font family (e.g. `'sans-serif'`).                                                                                                               |
| `fontWeight`                    | string     | e.g. `'normal'`, `'bold'`.                                                                                                                       |
| `fontStyle`                     | string     | e.g. `'normal'`, `'italic'`.                                                                                                                     |
| `textDecoration`                | string     | e.g. `'none'`, `'underline'`.                                                                                                                    |
| `textAlign`                     | string     | `'start'`, `'center'`, or `'end'`.                                                                                                               |
| `verticalAlign`                 | string     | `'start'`, `'center'`, or `'end'`.                                                                                                               |
| `lineHeight`                    | number     | Line height.                                                                                                                                     |

---

## 10. Proxies API

Proxies are objects returned by accessor methods (e.g. `Owner.Attribute('HP')`, `Owner.Item('Sword')`, `getChart('Table')`). They wrap ruleset/character data and expose a script-friendly API.

### Attribute proxy

Obtained via `Owner.Attribute('name')` (or `Ruleset.Attribute('name')` for the definition only). Character attributes support reading and writing; changes are applied when the script run completes.

**Reading:**

| Member             | Description                         |
| ------------------ | ----------------------------------- |
| `attr.value`       | Current value                       |
| `attr.max`         | Maximum (if defined)                |
| `attr.min`         | Minimum (if defined)                |
| `attr.options`     | Options list (list-type attributes) |
| `attr.title`       | Attribute title                     |
| `attr.description` | Attribute description               |

**Writing (character attributes):**

| Method             | Description                                       |
| ------------------ | ------------------------------------------------- |
| `attr.set(value)`  | Set value                                         |
| `attr.add(n)`      | Add to current value (numeric)                    |
| `attr.subtract(n)` | Subtract (numeric)                                |
| `attr.multiply(n)` | Multiply current value                            |
| `attr.divide(n)`   | Divide current value                              |
| `attr.setMax(n)`   | Set maximum                                       |
| `attr.setMin(n)`   | Set minimum                                       |
| `attr.setToMax()`  | Set value to max                                  |
| `attr.setToMin()`  | Set value to min                                  |
| `attr.flip()`      | Toggle boolean                                    |
| `attr.setRandom()` | Set to a random option (list); returns that value |
| `attr.next()`      | Set to next option (list); wraps                  |
| `attr.prev()`      | Set to previous option (list); wraps              |

**List attributes:**

- `attr.random` — Returns (does not set) a random option.
- `attr.setRandom()` — Sets to a random option and returns it.

**Attribute scripts (reactive):** In an attribute or game manager script, use `subscribe('attribute one', 'attribute two')` so the script re-runs when those attributes change. End the script with `return <value>` to set the attribute's value.

:::tip
You can assign an attribute to a variable for easier access.

```javascript
attr = Owner.Attribute('attr name');
attr.set(10);
```

:::

### Chart proxy

Obtained via `getChart('chart name')` or `Ruleset.Chart('chart name')`.

| Method                                 | Description                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `chart.columnWhere('column name')`     | All values in that column (array)                                                                   |
| `chart.randomColumn()`                 | All values from a random column                                                                     |
| `chart.randomCell()`                   | Value of a random cell                                                                              |
| `chart.randomNonEmptyCell()`           | Value of a random non-empty cell                                                                    |
| `chart.randomRow()`                    | Row proxy for a random data row; chain `.valueInColumn('column name')`                              |
| `chart.valueInColumn('column name')`   | Value from that column in the **first data row**                                                    |
| `chart.rowWhere('column name', value)` | Row proxy for the first row where the column equals `value`; chain `.valueInColumn('other column')` |

Cell values are coerced: numbers and booleans (`'true'`/`'false'`) become number/boolean; otherwise string.

Examples:

```javascript
spell_damage = getChart('Spells').rowWhere('Spell Name', 'Fireball').valueInColumn('Damage');
xp_needed = getChart('Level Table').rowWhere('Level', 5).valueInColumn('XP Required');
```

### Item instance proxy

Obtained via `Owner.Item('item name')` (single instance) or `Owner.Items('item name')` (array). Represents one stack/instance of an item in a character's inventory.

**Reading:**

| Member                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `item.title`                        | Display name (instance label or definition title) |
| `item.description`                  | Description                                       |
| `item.count()` / `item.quantity`    | Quantity in this stack                            |
| `item.isEquipped`                   | Whether equipped                                  |
| `item.getProperty('property name')` | Custom property value (null if not found)         |

**Writing (use a single instance from `Owner.Item('name')`; not on results of `Items()`):**

| Method                             | Description                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `item.setProperty('name', value)`  | Set custom property                                                                           |
| `item.setTitle(value)`             | Set display name                                                                              |
| `item.setDescription(value)`       | Set description                                                                               |
| `item.addAction('action name')`    | Add action to item's context menu                                                             |
| `item.removeAction('action name')` | Remove action from context menu                                                               |
| `item.destroy()`                   | Remove this instance from inventory (e.g. in item event scripts when `Self` is this instance) |

**Character item helpers:**

| Call                                      | Description                                      |
| ----------------------------------------- | ------------------------------------------------ |
| `Owner.hasItem('item name')`              | Whether the character has at least one           |
| `Owner.addItem('item name', quantity)`    | Add to inventory (quantity defaults to 1)        |
| `Owner.removeItem('item name', quantity)` | Remove from inventory                            |
| `Owner.setItem('item name', quantity)`    | Set total quantity (consolidates; 0 removes all) |

You can optionally specify inventory component and position: `Owner.addItem('item name', quantity, inventoryId, x, y)`.

### Action proxy

Obtained via `Owner.Action('action name')`.

| Method              | Description                              |
| ------------------- | ---------------------------------------- |
| `action.activate()` | Run the action's `on_activate()` handler |

Example:

```javascript
Owner.Action('Attack').activate();
```

### Character (Owner) summary

**Identity:** `Owner.name`, `Owner.title` (same as name).

**Archetypes:** `Owner.archetypes` (array of names), `Owner.hasArchetype('name')`, `Owner.addArchetype('name')`, `Owner.removeArchetype('name')`, `Owner.variant`.

**Custom properties:** `Owner.getProperty('name')`, `Owner.setProperty('name', value)`.

**Sheet:** `Owner.addPage('label')`, `Owner.removePage('label')`, `Owner.navigateToPage('label')`, `Owner.openWindow('label')`, `Owner.closeWindow('label')`.

**Image:** `Owner.setImage(urlOrAssetFilename)`.

---

## Built-in functions

### Dice

- **`roll(expression, rerollMessage?)`** — Roll dice (e.g. `'1d8'`, `'2d6+4'`). Uses the script runner's roll (e.g. dice panel or 3D dice when available). Expression can use `{{variable}}`. Returns a number. Optional **rerollMessage**: when provided, this message is shown in a modal with inputs for entering rerolls.
- **`rollQuiet(expression)`** — Same as `roll` but always uses the default local roll (no UI, no script-runner override). Use for hidden or internal rolls. Returns a number.
- **`rollSplit(expression, rerollMessage?)`** — Like `roll` but returns an array of individual die values in dice syntax order (e.g. `'1d6,2d20'` → `[d6, d20_1, d20_2]`). Optional **rerollMessage** has the same meaning as for `roll`.

### UI and debugging

- **`announce(message)`** — Show a toast notification to the player. Multiple arguments are joined with spaces.
- **`log(...)`** — Send output to the debug console and game log.

### Character selection

- **`selectCharacter(title?, description?)`** — Dialog to pick one active character in the Scene. Returns a character accessor or `null`.
- **`selectCharacters(title?, description?)`** — Dialog to pick one or more active characters in the Scene. Returns an array of character accessors (empty on cancel).

### Prompt

- **`prompt(msg, choices)`** — Show a modal with message and choice buttons. Returns the selected choice string.

---

## Comments

```javascript
// Single-line comment

/*
  Multi-line
  comment
*/
```

---

## Quick reference

**Ruleset:** `Ruleset.Chart('chart name')`, `Ruleset.Attribute('attribute name')`, `Ruleset.Item('item name')`, `Ruleset.Action('action name')`.

**Attribute script:** Use `subscribe(...)` and `return <value>`.

**Item events:** `on_activate`, `on_equip`, `on_unequip`, `on_consume` — each handler should end with `return`.

**Archetype events:** `on_add()` and `on_remove()` — run when the archetype is added to or removed from a character.

**Action events:** `on_activate()` and optionally `on_deactivate()`. Include `Target` in the signature when the action needs a target character.

**Global scripts:** Mark a script as global; its variables and functions are available to all other scripts in the ruleset.
