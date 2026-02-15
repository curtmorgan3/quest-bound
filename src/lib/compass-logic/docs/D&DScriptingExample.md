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
