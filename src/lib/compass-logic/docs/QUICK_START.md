# QBScript Quick Start Guide

A 5-minute introduction to QBScript for game designers.

## What is QBScript?

QBScript lets you add automatic calculations and behaviors to your Quest Bound ruleset. For example:

- Calculate Max HP from Constitution and Level
- Reduce mana when casting a spell
- Add armor bonus when equipping armor

## Basic Syntax

QBScript looks like simplified JavaScript or Python:

```javascript
// Variables - no keyword needed
hp = 100
name = 'Warrior'

// Math
total = 10 + 5 * 2  // 20

// Comparisons
if hp > 50:
  announce('Healthy!')
else:
  announce('Low health!')

// Functions
calculateBonus(score):
  return (score - 10) / 2
```

## Three Script Types

### 1. Attribute Scripts - Auto-Calculate Values

Attached to Attributes. Recalculates whenever dependencies change.

```javascript
// Max Hit Points (auto-updates when CON or Level change)
subscribe('Constitution', 'Level');

con = Owner.Attribute('Constitution').value;
level = Owner.Attribute('Level').value;

return 10 + con * 2 + level * 5;
```

**When to use:** Derived values, modifiers, anything that should auto-update.

### 2. Action Scripts - Do Something When Clicked

Attached to Actions. Runs when player clicks the action button.

```javascript
// Cast Fireball (costs mana, damages target)
on_activate(Target):
  // Check and spend mana
  if Owner.Attribute('Mana').value < 5:
    announce('Not enough mana!')
    return

  Owner.Attribute('Mana').subtract(5)

  // Deal damage
  damage = roll('8d6')
  Target.Attribute('Hit Points').subtract(damage)
  announce('Fireball hits for {{damage}} damage!')
  return
```

**When to use:** Spells, attacks, abilities, any player action.

### 3. Item Scripts - React to Equip/Consume

Attached to Items. Runs when player equips, unequips, or consumes.

```javascript
// Health Potion (restores HP when consumed)
on_consume():
  healing = roll('2d4+2')
  Owner.Attribute('Hit Points').add(healing)
  announce('Healed {{healing}} HP!')
  return

// Armor (bonus AC when equipped)
on_equip():
  Owner.Attribute('Armor Class').add(5)
  return

on_unequip():
  Owner.Attribute('Armor Class').subtract(5)
  return
```

**When to use:** Item effects, equipment bonuses, consumables.

## Key Concepts

### Owner, Target, Ruleset

- **Owner** - The character using the script
- **Target** - Another character (selected by player)
- **Ruleset** - Access game data (charts, item definitions)

```javascript
Owner.Attribute('Hit Points').value; // Get Owner's HP
Target.Attribute('Hit Points').subtract(10); // Damage target
Ruleset.Chart('Spells').where('Name', 'Fireball', 'Damage'); // Look up data
```

### Reading vs Writing Attributes

```javascript
// Read - use .value
hp = Owner.Attribute('Hit Points').value;

// Write - use methods
Owner.Attribute('Hit Points').set(100); // Set to 100
Owner.Attribute('Hit Points').add(10); // Add 10
Owner.Attribute('Hit Points').subtract(5); // Subtract 5
```

### Rolling Dice

```javascript
damage = roll('1d8'); // Roll 1d8
healing = roll('2d6+4'); // Roll 2d6 and add 4
scaled = roll('{{level}}d4'); // Roll based on variable
```

### String Interpolation

```javascript
damage = 15;
announce('You deal {{damage}} damage!'); // "You deal 15 damage!"
```

### Subscriptions (Attribute Scripts Only)

Tell the script when to recalculate:

```javascript
subscribe('Constitution', 'Level'); // Re-run when these change
```

## Common Patterns

### Computed Attribute (D&D Modifier)

```javascript
subscribe('Strength');

str = Owner.Attribute('Strength').value;
return floor((str - 10) / 2);
```

### Attack with Hit Calculation

```javascript
on_activate(Target):
  attack = roll('1d20')
  bonus = Owner.Attribute('Attack Bonus').value
  target_ac = Target.Attribute('Armor Class').value

  if (attack + bonus) >= target_ac:
    damage = roll('1d8')
    Target.Attribute('Hit Points').subtract(damage)
    announce('Hit for {{damage}} damage!')
  else:
    announce('Miss!')

  return
```

### Consumable with Resource Check

```javascript
on_activate():
  cost = 5
  current = Owner.Attribute('Mana').value

  if current < cost:
    announce('Not enough mana!')
    return

  Owner.Attribute('Mana').subtract(cost)
  announce('Spell cast!')
  return
```

### Chart Lookup

```javascript
// Get spell damage from chart
spell = 'Fireball';
damage = Ruleset.Chart('Spells').where('Spell', spell, 'Damage');
```

## Global Scripts (Utilities)

Create reusable functions in global scripts:

```javascript
// utils.qbs (marked as global)
calculateModifier(score):
  return floor((score - 10) / 2)

rollAdvantage(dice):
  roll1 = roll(dice)
  roll2 = roll(dice)
  if roll1 > roll2:
    return roll1
  return roll2
```

Then use in any script:

```javascript
str = Owner.Attribute('Strength').value;
str_mod = calculateModifier(str); // Uses global function
```

## Debugging

Use `log()` to debug:

```javascript
damage = roll('1d8');
log('Rolled damage:', damage);

Target.Attribute('Hit Points').subtract(damage);
log('Target HP after damage:', Target.Attribute('Hit Points').value);
```

View logs in the console panel (designers only).

## Tips

1. **Start simple** - Single attribute calculation, then build up
2. **Test with test characters** - Don't risk real character data
3. **Use global scripts** - Share common calculations
4. **Log liberally** - log() is your friend
5. **Check the examples** - See QBScript.md for complete D&D example

## Full Reference

For complete syntax and examples, see:

- **QBScript.md** - Full language reference with examples
- **README.md** - System architecture and design decisions
- **SUMMARY.md** - Overview and implementation roadmap

## Next Steps

1. Read the complete D&D example in QBScript.md
2. Try writing a simple attribute script (Max HP)
3. Create an action script (basic attack)
4. Experiment with item scripts (healing potion)
5. Build global utilities for your game system

Happy scripting!
