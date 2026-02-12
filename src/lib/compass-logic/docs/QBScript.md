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
- **Service Worker execution** - Non-blocking, efficient interpreter

## Syntax

```txt
// ===== ACCESSORS =====
Owner      // The character that initiated the script
Target     // A character reference (required if in function signature)
Ruleset    // Access to ruleset-level entities

// ===== GETTERS =====
<Accessor>.Attribute('attribute name')  // Get attribute reference
<Accessor>.Action('action name')        // Get action reference
<Accessor>.Item('item name')            // Get first matching item
<Accessor>.Items('item name')           // Get array of matching items
Ruleset.Chart('chart name')             // Get chart reference

// Examples:
Owner.Attribute('Hit Points')      // Returns CharacterAttribute record
Target.Attribute('Armor Class')    // Returns target's CharacterAttribute record
Ruleset.Attribute('Strength')      // Returns Attribute definition record

// ===== VARIABLES =====
// No keyword needed - assignment creates or updates
hit_points = Owner.Attribute('Hit Points')
damage = 10
name = 'Fireball'

// ===== ARRAYS =====
list = []
arrows = Owner.Items('Arrow')

// Array methods (all use parentheses)
arrows.count()      // Returns number of items
arrows.first()      // Returns first item
arrows.last()       // Returns last item
arrows.push(item)   // Adds item to end
arrows.pop()        // Removes and returns last item
arrows[index]       // Access by zero-based index

// ===== LOOPS =====
// For-in loop (iterate over array)
for arrow in arrows:
  arrow.consume()

// For-in loop (iterate N times, 0 to N-1)
for i in 10:
  do_something()

// ===== FUNCTIONS =====
// No keyword needed - just name and parameters
calculateModifier(score):
  return (score - 10) / 2

getMaxHP(con, level):
  base = 10
  return base + (con * 2) + (level * 5)

// ===== STRING INTERPOLATION =====
// Works in all string contexts
message = 'You have {{hp}} health'
announce('Damage: {{damage}}')

// ===== OPERATORS =====
// Math
+ - * / **    // ** is exponentiation (e.g., 2**3 = 8)
%             // modulo

// Comparison
> < >= <= == !=

// Boolean
&&    // and
||    // or
!     // not

// ===== DICE ROLLING =====
// Use roll() function with string argument
roll('1d8')
roll('2d6+4')
roll('{{Owner.Attribute('Level').value}}d4')

damage = roll('1d8')

// ===== CONTROL FLOW =====
// If/else if/else (indentation-based, no 'end' keyword)
if condition:
  // body
else if other_condition:
  // body
else:
  // body

// ===== BUILT-IN FUNCTIONS =====
// Dice
roll('1d8')              // Rolls dice, returns number

// Math
floor(3.7)               // Returns 3
ceil(3.2)                // Returns 4
round(3.5)               // Returns 4

// UI
announce('message')      // Shows message to player
log('debug')     // Logs to debug console

// ===== ENTITY PROPERTIES =====
// All Entities
.description    // Entity description
.title          // Entity title

// ===== RULESET METHODS =====
Ruleset.Chart('chart name')
Ruleset.Attribute('attribute name')
Ruleset.Item('item name')
Ruleset.Action('action name')

// ===== CHARACTER METHODS (Owner, Target) =====
Owner.hasItem('item name')              // Returns boolean
Owner.addItem('item name', quantity)    // Adds items to inventory
Owner.removeItem('item name', quantity) // Removes items from inventory
Owner.Attribute('attribute name')       // Gets CharacterAttribute
Owner.Item('item name')                 // Gets first matching item
Owner.Items('item name')                // Gets array of matching items

// ===== ATTRIBUTE METHODS =====
attr = Owner.Attribute('Hit Points')

attr.value              // Read current value (use in expressions)
attr.set(100)           // Set value to 100
attr.add(10)            // Add 10 to current value
attr.subtract(5)        // Subtract 5 from current value
attr.multiply(2)        // Multiply current value by 2
attr.divide(2)          // Divide current value by 2
attr.max()              // Set to attribute's max property
attr.min()              // Set to attribute's min property
attr.flip()             // Toggle boolean attribute
attr.random()           // Set to random option (list attributes)
attr.next()             // Set to next option (list attributes)
attr.prev()             // Set to previous option (list attributes)

// ===== ITEM METHODS =====
item = Owner.Item('Sword')
items = Owner.Items('Arrow')

items.count()           // Returns number of items
items.first()           // Returns first item
items.last()            // Returns last item
items.push(item)        // Adds item to array
items.pop()             // Removes and returns last item
items[0]                // Access by index

// Item custom properties (defined on Item record)
armor = Owner.Item('Plate Mail')
armor.armor_value       // Access custom property

// ===== ACTION METHODS =====
action = Owner.Action('Mage Armor')

action.activate()       // Triggers on_activate() handler
action.deactivate()     // Triggers on_deactivate() handler

// ===== CHART METHODS =====
chart = Ruleset.Chart('Spell List')

chart.get('column name')                              // Returns array of all values in column
chart.where('source column', source_value, 'target column')  // Finds row where source column equals source_value, returns target column value (or empty string if not found)

// Examples:
spell_damage = Ruleset.Chart('Spells').where('Spell Name', 'Fireball', 'Damage')
xp_needed = Ruleset.Chart('Level Table').where('Level', 5, 'XP Required')

// ===== SUBSCRIPTIONS =====
// Only for attribute scripts - fires when dependencies change
// Supports string literals or variable references
subscribe('attribute one', 'attribute two')  // Re-run when these attributes change
subscribe('action name')                      // Re-run when action.activate() fires

// Variable reference example
attr_name = 'Constitution'
subscribe(attr_name, 'Level')

// ===== COMMENTS =====
// Single-line comment

/*
  Multi-line
  comment
*/

```

## Attribute Scripts

Attribute scripts are reactive - they re-run when subscribed dependencies change. They must `return` a value to set the attribute's value.

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

## Item Scripts

Item scripts use event handlers that fire when players interact with items through the UI. All handlers should end with `return` (even though they don't return values).

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

## Action Scripts

Action scripts execute when triggered through UI. They can have `on_activate()` and `on_deactivate()` handlers. If `Target` is in the signature, the UI will prompt the user to select a character.

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

## Global Scripts

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

// Get total weight of inventory
getTotalWeight(character):
  total = 0
  all_items = character.Items('*')  // Get all items

  for item in all_items:
    total = total + (item.weight * item.quantity)

  return total

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

## Complete Example: D&D-Style Character

This example shows how QBScript can implement D&D 5e mechanics across multiple scripts.

### Global Utilities (utils.qbs)

```javascript
// Global utility functions available to all scripts

calculateModifier(score):
  return floor((score - 10) / 2)

rollAdvantage(dice):
  roll1 = roll(dice)
  roll2 = roll(dice)
  if roll1 > roll2:
    return roll1
  return roll2

rollDisadvantage(dice):
  roll1 = roll(dice)
  roll2 = roll(dice)
  if roll1 < roll2:
    return roll1
  return roll2
```

### Attribute Scripts

**strength_modifier.qbs** (Attribute: Strength Modifier)

```javascript
subscribe('Strength');

str = Owner.Attribute('Strength').value;
return calculateModifier(str);
```

**armor_class.qbs** (Attribute: Armor Class)

```javascript
subscribe('Dexterity', 'Armor Type')

base_ac = 10
dex = Owner.Attribute('Dexterity').value
dex_mod = calculateModifier(dex)

armor_type = Owner.Attribute('Armor Type').value

if armor_type == 'None':
  return base_ac + dex_mod
else if armor_type == 'Light':
  armor = Owner.Item('Equipped Armor')
  if armor:
    return armor.base_ac + dex_mod
  return base_ac + dex_mod
else if armor_type == 'Medium':
  armor = Owner.Item('Equipped Armor')
  if armor:
    // Medium armor caps dex bonus at +2
    capped_dex_mod = dex_mod
    if capped_dex_mod > 2:
      capped_dex_mod = 2
    return armor.base_ac + capped_dex_mod
  return base_ac + dex_mod
else if armor_type == 'Heavy':
  armor = Owner.Item('Equipped Armor')
  if armor:
    return armor.base_ac
  return base_ac

return base_ac + dex_mod
```

**max_hp.qbs** (Attribute: Max Hit Points)

```javascript
subscribe('Constitution', 'Level', 'Class');

con = Owner.Attribute('Constitution').value;
con_mod = calculateModifier(con);
level = Owner.Attribute('Level').value;
class_name = Owner.Attribute('Class').value;

// Get hit die from chart
hit_die = Ruleset.Chart('Classes').where('Class', class_name, 'Hit Die');

// First level gets max + con mod
// Each additional level gets average + con mod
first_level_hp = hit_die + con_mod;
additional_levels = level - 1;
avg_per_level = floor(hit_die / 2) + 1 + con_mod;

total = first_level_hp + additional_levels * avg_per_level;

return total;
```

### Action Scripts

**melee_attack.qbs** (Action: Melee Attack)

```javascript
on_activate(Target):
  // Roll attack
  attack_roll = roll('1d20')
  str = Owner.Attribute('Strength').value
  prof = Owner.Attribute('Proficiency Bonus').value
  str_mod = calculateModifier(str)

  attack_total = attack_roll + str_mod + prof
  target_ac = Target.Attribute('Armor Class').value

  // Check for critical hit
  if attack_roll == 20:
    // Critical hit - double damage dice
    damage = roll('2d8') + str_mod
    Target.Attribute('Hit Points').subtract(damage)
    announce('CRITICAL HIT! {{damage}} damage to {{Target.title}}!')
    return

  // Check for critical miss
  if attack_roll == 1:
    announce('Critical miss!')
    return

  // Normal hit check
  if attack_total >= target_ac:
    damage = roll('1d8') + str_mod
    Target.Attribute('Hit Points').subtract(damage)
    announce('Hit {{Target.title}} for {{damage}} damage!')
  else:
    announce('Attack missed {{Target.title}}.')

  return
```

**cast_spell.qbs** (Action: Cast Spell)

```javascript
on_activate(Target):
  // Get spell details from chart
  spell_name = Owner.Attribute('Selected Spell').value
  spell_level = Ruleset.Chart('Spells').where('Spell', spell_name, 'Level')
  mana_cost = spell_level * 2

  // Check if enough spell slots
  current_mana = Owner.Attribute('Mana').value
  if current_mana < mana_cost:
    announce('Not enough mana!')
    return

  // Spend mana
  Owner.Attribute('Mana').subtract(mana_cost)

  // Get spell effect
  spell_type = Ruleset.Chart('Spells').where('Spell', spell_name, 'Type')

  if spell_type == 'Damage':
    damage_dice = Ruleset.Chart('Spells').where('Spell', spell_name, 'Dice')
    int_mod = calculateModifier(Owner.Attribute('Intelligence').value)
    damage = roll(damage_dice) + int_mod
    Target.Attribute('Hit Points').subtract(damage)
    announce('{{spell_name}} hits {{Target.title}} for {{damage}} damage!')
  else if spell_type == 'Heal':
    healing_dice = Ruleset.Chart('Spells').where('Spell', spell_name, 'Dice')
    healing = roll(healing_dice)
    Target.Attribute('Hit Points').add(healing)
    announce('{{spell_name}} heals {{Target.title}} for {{healing}} HP!')

  return
```

### Item Scripts

**health_potion.qbs** (Item: Health Potion)

```javascript
on_consume():
  healing = roll('2d4+2')
  current_hp = Owner.Attribute('Hit Points').value
  max_hp = Owner.Attribute('Max Hit Points').value

  // Don't overheal
  new_hp = current_hp + healing
  if new_hp > max_hp:
    actual_healing = max_hp - current_hp
    Owner.Attribute('Hit Points').set(max_hp)
    announce('Healed {{actual_healing}} HP (full health)')
  else:
    Owner.Attribute('Hit Points').add(healing)
    announce('Healed {{healing}} HP')

  return
```

**plate_armor.qbs** (Item: Plate Armor)

```javascript
on_equip():
  Owner.Attribute('Armor Type').set('Heavy')
  announce('You don the heavy plate armor.')
  return

on_unequip():
  Owner.Attribute('Armor Type').set('None')
  announce('You remove the plate armor.')
  return
```

This example demonstrates:

- Global utility functions
- Reactive attribute calculations
- Complex conditional logic
- Chart lookups for game data
- Dice rolling with modifiers
- Cross-character interactions (Target)
- Item event handlers
- String interpolation in messages
