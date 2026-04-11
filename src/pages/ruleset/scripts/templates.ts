import type { ScriptEntityType } from '@/types';

/**
 * Default source code templates for new scripts, keyed by entity type.
 * Used to prepopulate the editor when creating a new script.
 */
export const SCRIPT_TEMPLATES: Record<ScriptEntityType, string> = {
  attribute: `
// Attribute scripts run on load and when subscribed attributes change
// Subscribe to other attributes to trigger this script when they change
subscribe('Fear') 

// Access other attributes with Owner accessor
fear_level = Owner.Attribute('Fear').value

// Read Ruleset entities like charts
random_dream = Ruleset.Chart('Bad Dreams').randomCell()

// Access this attribute with Self
if fear_level > 5:
    Self.set(random_dream)
`,
  gameManager: `
// Game Manager scripts are not attached to a specific entity and have no Self.
// They run when subscribed attributes change on any character.
// In this context, Owner is the character whose attribute changed.

// Subscribe to attributes that should trigger this script
subscribe('Health')

// Example: when a character's Health drops to 0 or below, announce a message
current_health = Owner.Attribute('Health').value

if current_health <= 0:
    announce('{{Owner.name}} has fallen!')
`,
  action: `
// Action scripts hold an action's activation event

// runs when the action is activated
on_activate():
    Owner.Attribute('Cursed').set(true)
    
`,
  item: `
// Item scripts hold item events (activate, equip, unequip, consume).

// runs when the item is activated
on_activate():
    announce('You get a bad feeling...')

on_add():
    if Self.is_cursed:
        Owner.Attribute('Cursed').set(true)

on_remove():
    Owner.Attribute('Weight').subtract(10)

// runs when the item is equipped
on_equip():
    Owner.Action('Hex').activate()
    
// runs when the item is unequipped
on_unequip():
    Owner.Attribute('Hit Points').subtract(100)

// runs when the item is consumed    
on_consume():
    roll_for_poison = roll('1d6')
    if roll_for_poison <= 3:
        Owner.Attribute('Poisoned').set(true)
    
`,
  global: `
// Accessible to all scripts. Use as a library of utility functions.
// Global scripts are loaded in alphabetical order.
`,
  archetype: `
// Archetype scripts run when the archetype is added to or removed from a character

on_add():
    Owner.Attribute('Health').set(10)

on_remove():
    Owner.Attribute('Health').subtract(5)
`,
  characterLoader: `
// Character Loader runs once per character at creation, before attribute scripts and archetype on_add.
// Only one Character Loader script is allowed per ruleset. Owner.archetypes are available.

// Example: set initial values based on archetypes
if Owner.hasArchetype('Warrior'):
    Owner.Attribute('Health').set(12)
else:
    Owner.Attribute('Health').set(8)
`,
};
