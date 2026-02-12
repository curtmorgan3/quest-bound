// D&D-style character stat calculator

calculateModifier(score):
    return floor((score - 10) / 2)

// Character stats
strength = 16
dexterity = 14
constitution = 15
intelligence = 10
wisdom = 12
charisma = 8

// Calculate modifiers
str_mod = calculateModifier(strength)
dex_mod = calculateModifier(dexterity)
con_mod = calculateModifier(constitution)
int_mod = calculateModifier(intelligence)
wis_mod = calculateModifier(wisdom)
cha_mod = calculateModifier(charisma)

// Display results
announce("=== Character Stats ===")
announce("STR: {{strength}} ({{str_mod}})")
announce("DEX: {{dexterity}} ({{dex_mod}})")
announce("CON: {{constitution}} ({{con_mod}})")
announce("INT: {{intelligence}} ({{int_mod}})")
announce("WIS: {{wisdom}} ({{wis_mod}})")
announce("CHA: {{charisma}} ({{cha_mod}})")

// Calculate derived stats
level = 5
base_hp = 10
max_hp = base_hp + (con_mod * 2) + (level * 5)

announce("")
announce("Level: {{level}}")
announce("Max HP: {{max_hp}}")

return max_hp
