# QBScript

QBScript is a dynamically typed, interpreted language for automating Quest Bound rulesets. It features Python-like structure (indentation-based blocks, simple syntax) with C-like operators (&&, ||, //, etc.), making it approachable for game designers with some technical knowledge.

## Script Types

Scripts can be attached to:

- **Attributes** - Reactive scripts that recompute values when dependencies change
- **Actions** - Event-driven scripts that execute when triggered through UI
- **Items** - Event handlers that fire on equip, unequip, consume, etc.
- **Global** - Utility modules that provide shared functions and variables

## Language Features

- **Dynamically typed** - No type declarations needed
- **Lexical scoping** - Variables scoped to functions and blocks
- **Reactive execution** - Attribute scripts auto-rerun on dependency changes
- **Event-driven** - Item and action scripts respond to user interactions
- **Built-in game APIs** - Native access to attributes, items, actions, and charts
- **String interpolation** - Embed variables in strings with `{{variable}}`
- **Dice rolling** - Built-in `roll()` function for dice notation
- **Multi-threaded** - Non-blocking, efficient interpreter

## Syntax

### Strings

// Use single or double quotes
column_key = 'Spells'
chart_name = "Wizard Spells"

// Use double quotes to wrap text with quote characters
shop_name = "Tabby's Tavern"

// ===== STRING METHODS =====
.toUpperCase() // returns the string in all upper case letters
.toLowerCase() // returns the string in all lower case letters

// ===== STRING INTERPOLATION =====
// Works in all string contexts
message = 'You have {{hp}} health'
announce('Damage: {{damage}}')

### Variables

// ===== VARIABLES =====
// No keyword needed - assignment creates or updates
hit_points = Owner.Attribute('Hit Points')
damage = 10
name = 'Fireball'

### Comments

// ===== COMMENTS =====
// Single-line comment

/_
Multi-line
comment
_/

### Operators

// ===== OPERATORS =====
// Math

- - - / ** // ** is exponentiation (e.g., 2\*\*3 = 8)
      % // modulo

// Comparison

> < >= <= == !=

// Boolean
&& // and
|| // or
! // not

### Arrays

// ===== ARRAYS =====
list = []

// Array methods
list.count() // Returns number of items
list.first() // Returns first item
list.last() // Returns last item
list.push(item) // Adds item to end
list.pop() // Removes and returns last item
list.random() // Returns a random value in the array
list.filter() // Returns a copy of the array filtered for truthy values
list.filterEmpty() // Returns a copy of the array filtered for non-empty values ('', null)
list[index] // Access by zero-based index

### Loops

// ===== LOOPS =====
// For-in loop (iterate over array)
for arrow in arrows:
arrow.consume()

// For-in loop (iterate N times, 0 to N-1)
for i in 10:
do_something()

### Control Flow

// ===== CONTROL FLOW =====
// If/else if/else (indentation-based, no 'end' keyword)
if condition:
// body
else if other_condition:
// body
else:
// body
// Parenthesis wrapping condition are optional
if (condition):

### Functions

// ===== FUNCTIONS =====
// No keyword needed - just name and parameters
calculateModifier(score):
return (score - 10) / 2

getMaxHP(con, level):
base = 10
return base + (con _ 2) + (level _ 5)

### Built-ins

// ===== BUILT-IN FUNCTIONS =====
// Dice
roll('1d8') // Rolls dice, returns number
// Use roll() function with string argument
roll('1d8')
roll('2d6+4')
roll('{{Owner.Attribute('Level').value}}d4')

damage = roll('1d8')

// Math
floor(3.7) // Returns 3
ceil(3.2) // Returns 4
round(3.5) // Returns 4

// UI
announce('message') // Shows message to player
log('debug') // Logs to debug console and game log
// Log messages will wrap their output in "" if it is a string type

### Accessing Data

// ===== ACCESSORS =====
Owner // The character that initiated the script
Target // A character reference (required if in function signature)
Ruleset // Access to ruleset-level entities
Self // (Attribute scripts only) This attribute — same as Owner.Attribute('<this attribute>')

// ===== GETTERS =====
<Accessor>.Attribute('attribute name') // Get attribute reference
<Accessor>.Action('action name') // Get action reference
<Accessor>.Item('item name') // Get first matching item
<Accessor>.Items('item name') // Get array of matching items
Ruleset.Chart('chart name') // Get chart reference

// Examples:
Owner.Attribute('Hit Points') // Returns CharacterAttribute record
Target.Attribute('Armor Class') // Returns target's CharacterAttribute record
Ruleset.Attribute('Strength') // Returns Attribute definition record

### Attribute Subscriptions

// ===== SUBSCRIPTIONS =====
// Only for attribute scripts - fires when dependencies change
// Supports string literals or variable references
subscribe('attribute one', 'attribute two') // Re-run when these attributes change
subscribe('action name') // Re-run when action.activate() fires

// Variable reference example
attr_name = 'Constitution'
subscribe(attr_name, 'Level')

#### Charts

// ===== CHART METHODS =====
chart = Ruleset.Chart('Spell List')

chart.get('column name') // Returns array of all values in column
chart.randomColumn() // Returns an array of all values in a random column
chart.randomCell() // Returns the value of a random cell in the chart
chart.randomNonEmptyCell() // Returns the value of a non-empty ('', null) random cell in the chart
chart.where('source column', source_value, 'target column') // Finds row where source column equals source_value, returns target column value (or empty string if not found)

// Examples:
spell_damage = Ruleset.Chart('Spells').where('Spell Name', 'Fireball', 'Damage')
xp_needed = Ruleset.Chart('Level Table').where('Level', 5, 'XP Required')

## Ruleset

// ===== RULESET METHODS =====
Ruleset.Chart('chart name')
Ruleset.Attribute('attribute name')
Ruleset.Item('item name')
Ruleset.Action('action name')

## Object APIs

### Attributes

Attribute scripts are reactive - they re-run when subscribed dependencies change. They must `return` a value to set the attribute's value.

// ===== ATTRIBUTE METHODS =====
attr = Owner.Attribute('Hit Points')

attr.value // Read current value (use in expressions)
attr.set(100) // Set value to 100
attr.add(10) // Add 10 to current value
attr.subtract(5) // Subtract 5 from current value
attr.multiply(2) // Multiply current value by 2
attr.divide(2) // Divide current value by 2
attr.max() // Set to attribute's max property
attr.min() // Set to attribute's min property
attr.flip() // Toggle boolean attribute
attr.random() // Set to random option (list attributes)
attr.next() // Set to next option (list attributes)
attr.prev() // Set to previous option (list attributes)

```javascript
// Max Hit Points (computed attribute)
subscribe('Constitution', 'Level')

base = 10
con = Owner.Attribute('Constitution').value
level = Owner.Attribute('Level').value
con_bonus = con * 2
level_bonus = level * 5

return base + con_bonus + level_bonus


// Armor Class (with conditional logic and item properties)
subscribe('Dexterity')

dex = Owner.Attribute('Dexterity').value
dex_modifier = floor((dex - 10) / 2)
base_ac = 10

// Check if player has armor equipped
if Owner.hasItem('Equipped Armor'):
  armor = Owner.Item('Equipped Armor')
  return armor.armor_value + dex_modifier
else:
  return base_ac + dex_modifier


// Attack Modifier (D&D-style)
subscribe('Strength', 'Proficiency Bonus')

str = Owner.Attribute('Strength').value
prof = Owner.Attribute('Proficiency Bonus').value
str_modifier = floor((str - 10) / 2)

return str_modifier + prof


// Carrying Capacity (computed from inventory)
subscribe('Strength')

str = Owner.Attribute('Strength').value
base_capacity = str * 15

return base_capacity


// Spell Save DC
subscribe('Intelligence', 'Proficiency Bonus')

int = Owner.Attribute('Intelligence').value
prof = Owner.Attribute('Proficiency Bonus').value
int_modifier = floor((int - 10) / 2)

return 8 + int_modifier + prof


// Level-based calculation with chart lookup
subscribe('Experience Points')

xp = Owner.Attribute('Experience Points').value
current_level = 1

// Find level based on XP thresholds from chart
for i in 20:
  required_xp = Ruleset.Chart('Level Table').where('Level', i + 1, 'XP Required')
  if xp >= required_xp:
    current_level = i + 1

return current_level
```

### Character

// ===== CHARACTER METHODS (Owner, Target) =====
Owner.name // Returns character's name

// Character Items
Owner.Item('item name') // Gets first matching item
Owner.Items('item name') // Gets array of matching items

Owner.hasItem('item name') // Returns boolean
Owner.addItem('item name', quantity) // Adds items to inventory
Owner.removeItem('item name', quantity) // Removes items from inventory
Owner.setItem('item name', quantity) // Sets the quantity of that item, consolidated to a single stack

// Character attributes
Owner.Attribute('attribute name') // Gets CharacterAttribute

### Items

Item scripts use event handlers that fire when players interact with items through the UI. All handlers should end with `return` (even though they don't return values).

// ===== ITEM METHODS =====
item = Owner.Item('Sword') // Single item
items = Owner.Items('Arrow') // Array of items

item.title // Item title
item.description // Item description
item.count() // Quantity of item

// Item custom properties (defined on Item record)
armor = Owner.Item('Plate Mail')
armor.armor_value // Access custom property

// ===== ITEM EVENTS =====
on_equip // Fires when the player equips an item

on_unquip // Fires when the player unequips an item

on_consume // Fires when the player consumes an item

```javascript
// Ring of Armor - activates spell effect when equipped
on_equip():
  Owner.Action('Mage Armor').activate()
  announce('The ring glows and protects you!')
  return

on_unequip():
  Owner.Action('Mage Armor').deactivate()
  announce('The magical protection fades.')
  return


// Health Potion - restores HP when consumed
on_consume():
  healing = roll('2d4+2')
  Owner.Attribute('Hit Points').add(healing)
  announce('Healed {{healing}} HP!')
  return


// Cursed Amulet - damages player on pickup, can't be dropped
on_equip():
  Owner.Attribute('Hit Points').subtract(10)
  announce('The amulet burns your skin!')
  return

on_unequip():
  // Cursed - automatically re-equips
  Owner.addItem('Cursed Amulet', 1)
  announce('The amulet refuses to leave you!')
  return


// Amulet of Curse Breaking - removes cursed items
on_consume():
  Owner.removeItem('Cursed Amulet', 1)
  announce('The curse has been lifted!')
  return


// Magic Sword - bonus damage scales with level
on_equip():
  level = Owner.Attribute('Level').value
  bonus = floor(level / 5) + 1
  Owner.Attribute('Attack Bonus').add(bonus)
  return

on_unequip():
  level = Owner.Attribute('Level').value
  bonus = floor(level / 5) + 1
  Owner.Attribute('Attack Bonus').subtract(bonus)
  return


// Torch - provides light for limited time
on_equip():
  Owner.Attribute('Light Duration').set(60)
  announce('The torch flickers to life.')
  return

on_unequip():
  Owner.Attribute('Light Duration').set(0)
  return


// Rations - restore hunger
on_consume():
  Owner.Attribute('Hunger').max()
  announce('You feel satisfied.')
  return
```

### Actions

Action scripts execute when triggered through UI. They can have `on_activate()` and `on_deactivate()` handlers. If `Target` is in the signature, the UI will prompt the user to select a character.

// ===== ACTION METHODS =====
action = Owner.Action('Mage Armor')

action.activate() // Triggers on_activate() handler
action.deactivate() // Triggers on_deactivate() handler

```javascript
// Mage Armor - buff that can be toggled on/off
// Target required - must select who to buff
on_activate(Target):
  Target.Attribute('Armor Class').add(3)
  announce('{{Target.title}} gains magical armor!')
  return

on_deactivate(Target):
  Target.Attribute('Armor Class').subtract(3)
  announce('The magical armor fades from {{Target.title}}.')
  return


// Self Buff - no target, only affects Owner
on_activate():
  Owner.Attribute('Strength').add(2)
  Owner.Attribute('Dexterity').add(2)
  announce('You feel empowered!')
  return

on_deactivate():
  Owner.Attribute('Strength').subtract(2)
  Owner.Attribute('Dexterity').subtract(2)
  announce('The power fades.')
  return


// Attack Action - requires target
on_activate(Target):
  // Calculate if attack hits
  attack_roll = roll('1d20')
  attack_power = Owner.Attribute('Attack Bonus').value
  defense = Target.Attribute('Armor Class').value

  hit = (attack_roll + attack_power) >= defense

  if hit:
    // Calculate damage
    str = Owner.Attribute('Strength').value
    str_modifier = floor((str - 10) / 2)
    damage = roll('1d6') + str_modifier

    Target.Attribute('Hit Points').subtract(damage)
    announce('Hit {{Target.title}} for {{damage}} damage!')
  else:
    announce('Attack missed!')

  return


// Fireball - costs mana, requires target
on_activate(Target):
  // Check mana
  current_mana = Owner.Attribute('Mana').value
  mana_cost = 5

  if current_mana < mana_cost:
    announce('Not enough mana!')
    return

  // Spend mana
  Owner.Attribute('Mana').subtract(mana_cost)

  // Deal damage
  damage = roll('8d6')
  Target.Attribute('Hit Points').subtract(damage)

  announce('Fireball hits {{Target.title}} for {{damage}} damage!')
  return


// Heal - requires target, uses chart for scaling
on_activate(Target):
  // Get healing amount from chart based on caster level
  level = Owner.Attribute('Level').value
  base_healing = Ruleset.Chart('Spell Effects').where('Spell', 'Heal', 'Base Healing')
  bonus = roll('{{level}}d4')

  total_healing = base_healing + bonus
  Target.Attribute('Hit Points').add(total_healing)

  announce('Healed {{Target.title}} for {{total_healing}} HP!')
  return


// Rest - restores resources
on_activate():
  Owner.Attribute('Hit Points').max()
  Owner.Attribute('Mana').max()
  Owner.Attribute('Hunger').max()

  announce('You feel fully rested.')
  return


// Rage - toggle ability with duration tracking
on_activate():
  Owner.Attribute('Strength').add(4)
  Owner.Attribute('Defense').subtract(2)
  Owner.Attribute('Rage Duration').set(10)

  announce('You enter a rage!')
  return

on_deactivate():
  Owner.Attribute('Strength').subtract(4)
  Owner.Attribute('Defense').add(2)
  Owner.Attribute('Rage Duration').set(0)

  announce('Your rage subsides.')
  return
```

### Global Scripts

Global scripts are not associated with any specific entity. They are marked as "global" and serve as utility modules. All variables and functions declared in global scripts are available to all other scripts in the ruleset.

```javascript
// utils.qbs - marked as global

// Calculate ability modifier (D&D 5e style)
calculateModifier(score):
  return floor((score - 10) / 2)

// Roll with advantage (roll twice, take higher)
rollAdvantage(dice_expression):
  roll1 = roll(dice_expression)
  roll2 = roll(dice_expression)

  if roll1 > roll2:
    return roll1
  else:
    return roll2

// Roll with disadvantage (roll twice, take lower)
rollDisadvantage(dice_expression):
  roll1 = roll(dice_expression)
  roll2 = roll(dice_expression)

  if roll1 < roll2:
    return roll1
  else:
    return roll2

// Check if character is alive
isAlive(character):
  hp = character.Attribute('Hit Points').value
  return hp > 0

// Clamp value between min and max
clamp(value, min_val, max_val):
  if value < min_val:
    return min_val
  else if value > max_val:
    return max_val
  else:
    return value
```

**Using global functions in other scripts:**

```javascript
// In an attribute script (attack_bonus.qbs)
subscribe('Strength', 'Proficiency Bonus')

str = Owner.Attribute('Strength').value
prof = Owner.Attribute('Proficiency Bonus').value

// Use global function
str_mod = calculateModifier(str)

return str_mod + prof


// In an action script (advantage_attack.qbs)
on_activate(Target):
  // Use global function for advantage roll
  attack = rollAdvantage('1d20')
  attack_bonus = Owner.Attribute('Attack Bonus').value

  if (attack + attack_bonus) >= Target.Attribute('Armor Class').value:
    damage = roll('1d8')
    Target.Attribute('Hit Points').subtract(damage)
    announce('Hit for {{damage}} damage!')
  else:
    announce('Miss!')

  return
```
