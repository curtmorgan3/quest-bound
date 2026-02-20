---
sidebar_position: 3
---

# QBScript Reference

QBScript is a dynamically typed, interpreted language for automating Quest Bound rulesets. It uses Python-like structure (indentation-based blocks, simple syntax) with C-like operators (`&&`, `||`, `//`, etc.), so it stays approachable for designers with some technical background.

## Script types

Scripts can be attached to:

- **Attributes** — Reactive scripts that recompute values when dependencies change
- **Actions** — Event-driven scripts that run when triggered from the UI
- **Items** — Event handlers for equip, unequip, consume, etc.
- **Archetypes** — Event handlers for `on_add` and `on_remove` when an archetype is added to or removed from a character
- **Global** — Utility modules that provide shared functions and variables

## Basic syntax

### Strings

Use single or double quotes. Prefer double quotes when the text contains apostrophes.

```javascript
column_key = 'Spells';
chart_name = 'Wizard Spells';
shop_name = "Tabby's Tavern";
```

**String methods:**

- `.toUpperCase()` — returns the string in upper case
- `.toLowerCase()` — returns the string in lower case

**String interpolation:** Embed variables in any string with `{{variable}}`:

```javascript
message = 'You have {{hp}} health';
announce('Damage: {{damage}}');
```

### Variables

No keyword is needed; assignment creates or updates a variable.

```javascript
hit_points = Owner.Attribute('Hit Points');
damage = 10;
name = 'Fireball';
```

### Comments

```javascript
// Single-line comment

/*
Multi-line
comment
*/
```

### Operators

**Math:** `+` `-` `*` `/` `**` (exponentiation, e.g. `2**3` = 8) `/` (integer division) `%` (modulo)

**Comparison:** `>` `<` `>=` `<=` `==` `!=`

**Boolean:** `&&` (and) `||` (or) `!` (not)

### Arrays

```javascript
list = [];
```

**Array methods:**

| Method               | Return Value                                       |
| -------------------- | -------------------------------------------------- |
| `list.count()`       | Number of items                                    |
| `list.first()`       | First item                                         |
| `list.last()`        | Last item                                          |
| `list.push(item)`    | Add item to end                                    |
| `list.pop()`         | Remove and return last item                        |
| `list.random()`      | Random element                                     |
| `list.filter()`      | Copy with only truthy values                       |
| `list.filterEmpty()` | Copy with non-empty values (excludes `''`, `null`) |
| `list[index]`        | Access by zero-based index                         |

### Loops

**For-in over an array:**

```javascript
for arrow in arrows:
  arrow.consume()
```

**For-in over a number (0 to N-1):**

```javascript
for i in 10:
  do_something()
```

### Control flow

Indentation defines blocks; there is no `end` keyword. Parentheses around conditions are optional.

```javascript
if condition:
  // body
else if other_condition:
  // body
else:
  // body
```

### Functions

Define with a name and parameters; there is no `function` keyword. Use `return` to provide a result
or halt execution.

```javascript
calculateModifier(score):
  return (score - 10) / 2

getMaxHP(con, level):
  base = 10
  return base + (con * 2) + (level * 5)
```

---

## Built-in functions

### Dice

| Function           | Description                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `roll(expression)` | Roll dice from a string (e.g. `'1d8'`, `'2d6+4'`). Returns a number. Expression can use interpolation: `roll('{{level}}d4')`. |

**Examples:**

```javascript
roll('1d8');
roll('2d6+4');
damage = roll('1d8');
```

### Math

| Function    | Description                              |
| ----------- | ---------------------------------------- |
| `floor(x)`  | Round down (e.g. `floor(3.7)` → 3)       |
| `ceil(x)`   | Round up (e.g. `ceil(3.2)` → 4)          |
| `round(x)`  | Round to nearest (e.g. `round(3.5)` → 4) |
| `abs(x)`    | Absolute value                           |
| `min(a, b)` | Smaller of two values                    |
| `max(a, b)` | Larger of two values                     |

### UI and debugging

| Function            | Description                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `announce(message)` | Show a message to the player. Arguments are joined with spaces.                                                        |
| `log(...)`          | Send output to the debug console and game log. Multiple arguments supported; strings are wrapped in quotes in the log. |

---

## Accessing character data

### Accessors

| Accessor  | Meaning                                                                                    |
| --------- | ------------------------------------------------------------------------------------------ |
| `Owner`   | The character that initiated the script                                                    |
| `Ruleset` | Ruleset-level entities (attributes, charts, items, actions)                                |
| `Self`    | The entity to which the script is attached — same as `Owner.Attribute('<this attribute>')` |

### Getters

Use these to resolve entities by name:

| Call                                     | Returns                                                 |
| ---------------------------------------- | ------------------------------------------------------- |
| `<Accessor>.Attribute('attribute name')` | Attribute reference (character or ruleset)              |
| `getAttr('attribute name)`               | Shorthand for `Owner.Attribute('attribute name').value` |
| `Owner.hasArchetype('archetype name')`   | Whether the character has the given archetype           |
| `<Accessor>.Action('action name')`       | Action reference                                        |
| `<Accessor>.Item('item name')`           | First matching item instance                            |
| `<Accessor>.Items('item name')`          | Array of matching item instances                        |
| `Ruleset.Chart('chart name')`            | Chart reference                                         |
| `getChart('chart name')`                 | Shorthand for `Ruleset.Chart('chart name')`             |

**Examples:**

```javascript
Owner.Attribute('Hit Points'); // Character's Hit Points
Owner.Action('Attack'); // Character's Attack action
Ruleset.Attribute('Strength'); // Attribute definition (ruleset)
```

### Character (Owner)

**Identity:**

- `Owner.name` — character's name
- `Owner.title` — same as `name`

**Archetypes:**

- `Owner.archetypes` - returns an array of all the character's archetype names
- `Owner.hasArchetype('archetype name')` — whether the character has the given archetype
- `Owner.addArchetype('archetype name')` - adds the archetype to the character
- `Owner.removeArchetype('archetype name')` - removes the archetype from the character

**Items:**

- `Owner.Item('item name')` — first matching item
- `Owner.Items('item name')` — array of matching items
- `Owner.hasItem('item name')` — whether the character has at least one
- `Owner.addItem('item name', quantity)` — add to inventory (quantity defaults to 1)
- `Owner.removeItem('item name', quantity)` — remove from inventory
- `Owner.setItem('item name', quantity)` — set total quantity (consolidates to one stack; 0 removes all)

**Attributes:**

- `Owner.Attribute('attribute name')` — character's attribute instance
- `getAttr('attribute name')` — character's attribute instance's value, shorthand for `Owner.Attribute('attribute name').value`

### Attribute API

Attribute scripts are reactive: they re-run when subscribed dependencies change and must `return` a value to set the attribute.

**Reading and writing:**

| Member             | Description                               |
| ------------------ | ----------------------------------------- |
| `attr.value`       | Current value (use in expressions)        |
| `attr.max`         | Maximum value                             |
| `attr.min`         | Minimum value                             |
| `attr.random`      | Returns a random option (list attributes) |
| `attr.set(value)`  | Set value                                 |
| `attr.add(n)`      | Add to current value (numeric)            |
| `attr.subtract(n)` | Subtract (numeric)                        |
| `attr.multiply(n)` | Multiply current value                    |
| `attr.divide(n)`   | Divide current value                      |
| `attr.setMax(n)`   | Set maximum value                         |
| `attr.setMin(n)`   | Set min value                             |
| `attr.setRandom()` | Sets to a random option (list attributes) |
| `attr.next()`      | Set to next option (list)                 |
| `attr.prev()`      | Set to previous option (list)             |

**Attribute subscriptions (attribute scripts only):** Declare dependencies so the script re-runs when they change. You can pass string literals or variables.

```javascript
subscribe('attribute one', 'attribute two'); // Re-run when these change
subscribe('action name'); // Re-run when this action is activated

attr_name = 'Constitution';
subscribe(attr_name, 'Level');
```

### Charts

Get a chart with `getChart('chart name')`, then use:

| Method                                                               | Description                                                                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chart.get('column name')`                                           | All values in that column (array)                                                                                                                                  |
| `chart.randomColumn()`                                               | All values from a random column                                                                                                                                    |
| `chart.randomCell()`                                                 | Value of a random cell                                                                                                                                             |
| `chart.randomNonEmptyCell()`                                         | Value of a random non-empty cell                                                                                                                                   |
| `chart.valueInColumn('column name')`                                 | Value from that column in the first data row (row immediately after the header row)                                                                                |
| `chart.rowWhere('column name', value)`                               | A row proxy for the first row where the given column equals `value` (or an empty row if not found); chain with `.valueInColumn('other column')` to read a value.   |
| `chart.rowWhere('column name', value).valueInColumn('other column')` | Convenience pattern: find a row by one column and read a value from another column in that same row (returns `''` if the row is empty or the column is not found). |

**Examples:**

```javascript
spell_damage = getChart('Spells').rowWhere('Spell Name', 'Fireball').valueInColumn('Damage');

xp_needed = getChart('Level Table').rowWhere('Level', 5).valueInColumn('XP Required');
```

### Items

**Reading item data:**

- `item.title` — item title
- `item.description` — item description
- `item.count()` — quantity
- `item.isEquipped` — whether the item is equipped
- `item.isConsumable` — whether the item is consumable

**Custom properties (defined on the Item):** Access by property name. Use `.property('label')` for names with spaces.

```javascript
armor = Owner.Item('Plate Mail');
armor_value = armor.property('Armor Value'); // Read custom property
Owner.Item('item name').property('Armor value').set(15); // Set instance custom property
```

### Actions

- `Owner.Action('action name')` — get action reference
- `action.activate()` — run the action’s `on_activate()`

---

## Quick reference

**Ruleset:**

- `Ruleset.Chart('chart name')`
- `Ruleset.Attribute('attribute name')`
- `Ruleset.Item('item name')`
- `Ruleset.Action('action name')`

**Attribute script:** Use `subscribe(...)` and `return <value>`.

**Item events:** `on_activate`, `on_equip`, `on_unequip`, `on_consume` — each handler should end with `return`.

**Archetype events:** `on_add()` and `on_remove()` — run when the archetype is added to or removed from a character. Can alter attributes, add/remove items, etc.

**Action events:** `on_activate()` and optionally `on_deactivate()`. Include `Target` in the signature when the action needs a target character.

**Global scripts:** Mark a script as global; its variables and functions are available to all other scripts in the ruleset.
