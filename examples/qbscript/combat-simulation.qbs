// Simple combat simulation

// Character stats
player_hp = 50
player_attack = 5
player_defense = 12

enemy_hp = 30
enemy_attack = 3
enemy_defense = 10

announce("=== Combat Start ===")
announce("Player HP: {{player_hp}}")
announce("Enemy HP: {{enemy_hp}}")
announce("")

round = 1

// Combat loop
for i in 10:
    if player_hp <= 0:
        announce("Player defeated!")
        return 0
    
    if enemy_hp <= 0:
        announce("Enemy defeated!")
        return 1
    
    announce("--- Round {{round}} ---")
    
    // Player attacks
    attack_roll = roll("1d20")
    hit = attack_roll + player_attack >= enemy_defense
    
    if hit:
        damage = roll("1d8") + 2
        enemy_hp = enemy_hp - damage
        announce("Player hits for {{damage}} damage! Enemy HP: {{enemy_hp}}")
    else:
        announce("Player misses!")
    
    // Check if enemy is defeated
    if enemy_hp <= 0:
        announce("")
        announce("Victory! Enemy defeated in round {{round}}!")
        return 1
    
    // Enemy attacks
    enemy_roll = roll("1d20")
    enemy_hit = enemy_roll + enemy_attack >= player_defense
    
    if enemy_hit:
        enemy_damage = roll("1d6") + 1
        player_hp = player_hp - enemy_damage
        announce("Enemy hits for {{enemy_damage}} damage! Player HP: {{player_hp}}")
    else:
        announce("Enemy misses!")
    
    announce("")
    round = round + 1

announce("Combat ended in a draw!")
return -1
