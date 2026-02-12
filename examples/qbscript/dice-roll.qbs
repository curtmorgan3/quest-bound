// Dice rolling example
log("Rolling dice...")

attack_roll = roll("1d20")
damage_roll = roll("2d6+4")

announce("Attack roll: {{attack_roll}}")
announce("Damage: {{damage_roll}}")

if attack_roll >= 15:
    announce("Critical hit!")
else:
    announce("Normal hit")
