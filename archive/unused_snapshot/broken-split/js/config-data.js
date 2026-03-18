  'use strict';

  const WIDTH = 12;
  const HEIGHT = 8;
  const BREACH_LANES = {
    top: [{ x: 0, y: 0 }, { x: 0, y: 1 }],
    middle: [{ x: 0, y: 2 }, { x: 0, y: 3 }, { x: 0, y: 4 }],
    bottom: [{ x: 0, y: 5 }, { x: 0, y: 6 }, { x: 0, y: 7 }],
  };
  const LANE_NAMES = ['top', 'middle', 'bottom'];
  const DIRECTIONS = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  const SETUP_PHASES = {
    PORTAL: 'place-portal',
    OBSTACLES: 'place-obstacles',
    WARRIOR: 'place-warrior',
    BATTLE: 'battle',
    GAME_OVER: 'game-over',
  };

  const RARITIES = ['Common', 'Uncommon', 'Rare', 'Legendary', 'Mythic'];
  const HIRE_COSTS = [20, 40, 70, 110];
  const UPGRADE_COST_MULTIPLIER = 1.15;
  const ENEMY_JEWEL_MULTIPLIER = 0.95;
  const BARRIER_REBUILD_COST = 120;
  const WAVE_REBUILD_INTERVAL = 15;
  const UPDATE_MS = 200;
  const WAVE_BREAK_SECONDS = 6;
  const RANDOM_OBSTACLE_COUNT = 6;
  const PLAYER_OBSTACLE_COUNT = 12;

  const TOWER_TEMPLATES = {
    warrior: {
      name: 'Warrior',
      letter: 'WAR',
      hp: 660,
      damage: 35,
      attackInterval: 1.33,
      range: 1,
      autoAttack: true,
      abilities: [
        { key: 'gladiator_strike', name: 'Gladiator Strike', cooldown: 5 },
        { key: 'whirlwind', name: 'Whirlwind', cooldown: 8 },
        { key: 'rapid_onslaught', name: 'Rapid Onslaught', cooldown: 12 },
        { key: 'taunt', name: 'Taunt', cooldown: 10 },
      ],
    },
    archer: {
      name: 'Archer',
      letter: 'ARC',
      hp: 242,
      damage: 28,
      attackInterval: 0.9,
      range: 4,
      autoAttack: true,
      abilities: [
        { key: 'multi_shot', name: 'Multi-Shot', cooldown: 6 },
        { key: 'rapid_shot', name: 'Rapid Shot', cooldown: 10 },
        { key: 'piercing_shot', name: 'Piercing Shot', cooldown: 7 },
        { key: 'hunters_mark', name: "Hunter's Mark", cooldown: 10 },
      ],
    },
    wizard: {
      name: 'Wizard',
      letter: 'WIZ',
      hp: 286,
      damage: 30,
      attackInterval: 1.425,
      range: 3,
      autoAttack: true,
      abilities: [
        { key: 'firebolt', name: 'Firebolt', cooldown: 5 },
        { key: 'frost_bolt', name: 'Frost Bolt', cooldown: 5 },
        { key: 'fireball', name: 'Fireball', cooldown: 7 },
        { key: 'frost_lance', name: 'Frost Lance', cooldown: 9 },
      ],
    },
    priest: {
      name: 'Priest',
      letter: 'PRS',
      hp: 264,
      damage: 0,
      attackInterval: 2.0,
      range: 3,
      autoAttack: false,
      abilities: [
        { key: 'prayer_of_healing', name: 'Prayer of Healing', cooldown: 8 },
        { key: 'freedom', name: 'Freedom', cooldown: 12 },
        { key: 'swiftness', name: 'Swiftness', cooldown: 10 },
        { key: 'healing_aura', name: 'Healing Aura', cooldown: 0, passive: true },
      ],
    },
    pirate: {
      name: 'Pirate',
      letter: 'PIR',
      hp: 308,
      damage: 35.28,
      attackInterval: 1.2,
      range: 3,
      autoAttack: true,
      abilities: [
        { key: 'warning_shot', name: 'Warning Shot', cooldown: 7 },
        { key: 'starboard_cannons', name: 'Starboard Cannons', cooldown: 10 },
        { key: 'kraken', name: 'Kraken', cooldown: 20 },
      ],
      passive: 'Steal: +15% JEWEL from Pirate kills',
    },
  };

  const ENEMY_TEMPLATES = {
    grunt: { name: 'Grunt', hp: 120, damage: 12, moveInterval: 0.665, attackInterval: 1.2, jewel: 6, typeClass: 'grunt' },
    runner: { name: 'Runner', hp: 80, damage: 10, moveInterval: 0.4275, attackInterval: 1.0, jewel: 5, typeClass: 'runner' },
    brute: { name: 'Brute', hp: 420, damage: 35, moveInterval: 0.95, attackInterval: 1.3, jewel: 20, typeClass: 'brute' },
  };

  const BOSSES = [
    {
      id: 'ogre',
      name: 'Ogre Warlord',
      hp: 1800,
      damage: 60,
      moveInterval: 0.9,
      attackInterval: 1.5,
      jewel: 120,
      abilityInterval: 6,
      useAbility(enemy, game) {
        const hits = game.enemies.filter(e => false);
        const targetTiles = adjacentTiles(enemy.x, enemy.y);
        let didHit = false;
        for (const tile of targetTiles) {
          const tower = game.towers.find(t => t.x === tile.x && t.y === tile.y);
          if (tower) {
            didHit = true;
            damageTower(game, tower, 80, `${enemy.name} used Ground Slam on ${tower.name}`);
          }
        }
        if (didHit) showBanner(`${enemy.name} used Ground Slam`);
      },
    },
    {
      id: 'frost',
      name: 'Frost Warden',
      hp: 4200,
      damage: 55,
      moveInterval: 0.85,
      attackInterval: 1.4,
      jewel: 300,
      abilityInterval: 10,
      useAbility(enemy, game) {
        let hit = false;
        for (const tower of game.towers) {
          if (dist(enemy, tower) <= 4) {
            applyBuff(tower, 'blizzardSlow', 4, { speedMult: 0.5 });
            hit = true;
          }
        }
        if (hit) showBanner('Frost Warden cast Blizzard');
      },
    },
    {
      id: 'golem',
      name: 'Siege Golem',
      hp: 6500,
      damage: 120,
      moveInterval: 1.1,
      attackInterval: 2.0,
      jewel: 300,
      abilityInterval: 10,
      useAbility(enemy) {
        enemy.reductionUntil = now() + 5000;
        showBanner('Siege Golem hardened its armor');
      },
    },
    {
      id: 'kraken_caller',
      name: 'Kraken Caller',
      hp: 5200,
      damage: 70,
      moveInterval: 0.9,
      attackInterval: 1.6,
      jewel: 300,
      abilityInterval: 10,
      useAbility(enemy, game) {
        const candidates = game.towers.filter(t => t.type !== 'warrior');
        if (!candidates.length) return;
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        damageTower(game, target, 90, `${enemy.name} summoned a tentacle under ${target.name}`);
        applyDebuff(target, 'rooted', 2, {});
        showBanner('Kraken Caller summoned tentacles');
      },
    },
  ];

  const RELICS = [
    { id: 'sharpened_arrows', name: 'Sharpened Arrows', desc: 'Archer damage +12%', cost: 120, apply: game => buffTowerType(game, 'archer', { damageMult: 1.12 }) },
    { id: 'balanced_quiver', name: 'Balanced Quiver', desc: 'Archer attack speed +10%', cost: 120, apply: game => buffTowerType(game, 'archer', { speedMult: 1.10 }) },
    { id: 'arcane_focus', name: 'Arcane Focus', desc: 'Wizard spell damage +12%', cost: 130, apply: game => game.modifiers.wizardSpellDamage *= 1.12 },
    { id: 'mana_efficiency', name: 'Mana Efficiency', desc: 'Wizard cooldowns reduced by 10%', cost: 130, apply: game => game.modifiers.wizardCooldown *= 0.90 },
    { id: 'reinforced_armor', name: 'Reinforced Armor', desc: 'Warrior max HP +20%', cost: 130, apply: game => buffTowerType(game, 'warrior', { hpMult: 1.20, healToMatchPercent: true }) },
    { id: 'battle_discipline', name: 'Battle Discipline', desc: 'Warrior cooldowns recover 10% faster', cost: 120, apply: game => game.modifiers.warriorCooldown *= 0.90 },
    { id: 'radiant_faith', name: 'Radiant Faith', desc: 'Priest healing +15%', cost: 125, apply: game => game.modifiers.priestHealing *= 1.15 },
    { id: 'sacred_aura', name: 'Sacred Aura', desc: 'Towers near Priest gain +8% attack speed', cost: 140, apply: game => game.modifiers.sacredAura = true },
    { id: 'smugglers_ledger', name: "Smuggler's Ledger", desc: 'Pirate steal bonus rises to +20%', cost: 140, apply: game => game.modifiers.pirateSteal = 0.20 },
    { id: 'powder_reserves', name: 'Powder Reserves', desc: 'Starboard Cannons fires +1 cannonball', cost: 150, apply: game => game.modifiers.extraCannons += 1 },
    { id: 'shield_wall', name: 'Shield Wall', desc: 'Warrior takes 10% less damage if Priest is adjacent', cost: 150, apply: game => game.modifiers.shieldWall = true },
    { id: 'ranger_line', name: 'Ranger Line', desc: 'Archers behind Warrior deal +10% damage', cost: 140, apply: game => game.modifiers.rangerLine = true },
  ];

  const MUTATIONS = [
    { id: 'swift_horde', name: 'Swift Horde', desc: 'Enemies move 20% faster', apply: enemy => { enemy.moveInterval *= 0.8; } },
    { id: 'thick_hide', name: 'Thick Hide', desc: 'Enemies gain 25% HP', apply: enemy => { enemy.maxHp *= 1.25; enemy.hp *= 1.25; } },
    { id: 'relentless', name: 'Relentless', desc: 'Enemies attack 20% faster', apply: enemy => { enemy.attackInterval *= 0.8; } },
    { id: 'reinforcements', name: 'Reinforcements', desc: 'Wave size increases by 30%', waveModifier: wave => { wave.sizeMultiplier *= 1.3; } },
    { id: 'determined', name: 'Determined', desc: 'Enemies resist slows by 50%', apply: enemy => { enemy.slowResistance = 0.5; } },
    { id: 'jewel_rush', name: 'Jewel Rush', desc: 'Enemies drop 25% more JEWEL', apply: enemy => { enemy.jewel *= 1.25; } },
  ];

  const els = {
