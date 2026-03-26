
const treeVariants = ["tree1.png","tree2.png","tree3.png"];
function getRandomTree(){
  return treeVariants[Math.floor(Math.random()*treeVariants.length)];
}
(() => {
  'use strict';

  const WIDTH = 14;
  const HEIGHT = 6;
  let BREACH_LANES = {
    top: [],
    middle: [],
    bottom: [],
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
  const HIRE_COSTS = [25, 50, 88, 138];
  const UPGRADE_COST_MULTIPLIER = 3.3062;
  const ARCHER_BASE_ATTACK_INTERVAL = 1.29657803625;
  const ARCHER_HP_LEVEL_MULTIPLIER = 1.065;
  const ARCHER_BASE_HP_MULTIPLIER = 0.9;
  const ARCHER_ATTACK_SPEED_GROWTH_PER_LEVEL = 0.027075;
  const PIRATE_ATTACK_SPEED_GROWTH_PER_LEVEL = 0.045;
  const WIZARD_ATTACK_SPEED_GROWTH_PER_LEVEL = 0.045;
  const REDUCED_DAMAGE_GROWTH_FACTOR = 0.85;
  const PIRATE_WIZARD_DAMAGE_GROWTH_PER_LEVEL = 1 + ((1.05 - 1) * REDUCED_DAMAGE_GROWTH_FACTOR);
  const ICE_AURA_BASE_SLOW = 0.12;
  const ICE_AURA_SLOW_PER_LEVEL = 0.004;
  const ICE_AURA_BASE_RANGE = 3;
  const ICE_AURA_BONUS_RANGE_AT_LEVEL_15 = 1;
  const SLOW_TOTEM_RANGE = 2;
  const SLOW_TOTEM_PERCENT = 0.35;
  const STARBOARD_CANNONS_BASE_DAMAGE = 40;
  const ABILITY_DAMAGE_PER_LEVEL = 3;
  const PRAYER_OF_HEALING_BASE_AMOUNT = 127;
  const KRAKEN_BASE_DAMAGE = 20;
  const MULTI_SHOT_BASE_DAMAGE_BONUS = 2;
  const BIG_ENEMY_HP_MULTIPLIER = 1.25;
  const BIG_ENEMY_SPEED_MULTIPLIER = 1.10;
  const ENEMY_TILE_LIMIT = 7;
  const SKITTER_EXPLOSION_DAMAGE_MULTIPLIER = 28.125;
  const EXPLODING_STATUE_RADIUS = 2;
  const EXPLODING_STATUE_DAMAGE_PERCENT = 0.20;
  const EXPLODING_STATUE_ANIMATION_MS = 3000;
  const ARCHER_PROJECTILE_ANIMATION_MS = 3000;
  const ARCHER_PROJECTILE_SIZE_MULTIPLIER = 0.85;
  const STATUE_EXPLOSION_GIF_SIZE_MULTIPLIER = 2.35;
  const GREEN_FIRE_GIF_PATH = 'assets/green-fire.gif';
  const RED_FIRE_GIF_PATH = 'assets/red-fire.gif';
  const SATELLITE_UPGRADE_COST_MULTIPLIER = 1.5;
  const SATELLITE_DAMAGE_MULTIPLIER = 0.75;
  const SATELLITE_DISSIPATE_AFTER_WAVES = 9;
  const SATELLITE_FADE_STAGE_ONE_WAVES = 3;
  const SATELLITE_FADE_STAGE_TWO_WAVES = 7;
  const ENEMY_JEWEL_MULTIPLIER = 0.95;
  const BARRIER_REBUILD_COST = 120;
  const WAVE_REBUILD_INTERVAL = 15;
  const UPDATE_MS = 200;
  const WAVE_BREAK_SECONDS = 6;
  const RANDOM_OBSTACLE_COUNT = 11;
  const PLAYER_OBSTACLE_COUNT = 9;

  const TOWER_TEMPLATES = {
    warrior: {
      name: 'Warrior',
      letter: 'WAR',
      hp: 1090,
      damage: 55.5,
      attackInterval: 1.33,
      range: 1,
      autoAttack: true,
      abilities: [
        { key: 'gladiator_strike', name: 'Gladiator Strike', cooldown: 0, passive: true },
        { key: 'new_blood', name: 'Statue', cooldown: 0, passive: true },
        { key: 'whirlwind', name: 'Whirlwind', cooldown: 7 },
        { key: 'rapid_onslaught', name: 'Rapid Onslaught', cooldown: 12 },
        
      ],
    },
    archer: {
      name: 'Archer',
      letter: 'ARC',
      hp: 242 * ARCHER_BASE_HP_MULTIPLIER,
      damage: 33,
      attackInterval: ARCHER_BASE_ATTACK_INTERVAL,
      range: 4,
      autoAttack: true,
      abilities: [
        { key: 'multi_shot', name: 'Multi-Shot', cooldown: 8 },
        { key: 'rapid_shot', name: 'Rapid Shot', cooldown: 20 },
        { key: 'piercing_shot', name: 'Piercing Shot', cooldown: 7 },
        { key: 'eagle_nest', name: 'Eagle Nest', cooldown: 0, passive: true },
      ],
    },
    wizard: {
      name: 'Wizard',
      letter: 'WIZ',
      hp: 286,
      damage: 33,
      attackInterval: 1.425,
      range: 3,
      autoAttack: true,
      abilities: [
        { key: 'firebolt', name: 'Firebolt', cooldown: 5 },
        { key: 'frost_bolt', name: 'Ice Aura', cooldown: 0, passive: true },
        { key: 'fireball', name: 'Fireball', cooldown: 9 },
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
        { key: 'prayer_of_healing', name: 'Prayer of Healing', cooldown: 6 },
        { key: 'slow_totem', name: 'Slow Totem', cooldown: 60, manualOnly: true },
        { key: 'swiftness', name: 'Swiftness', cooldown: 40 },
        { key: 'healing_aura', name: 'Healing Aura', cooldown: 0, passive: true },
      ],
      passive: 'Passive: starting at level 10, Prayer of Healing cooldown is reduced by 0.1s per level, to a minimum cooldown of 1.0s.',
    },
    pirate: {
      name: 'Pirate',
      letter: 'PIR',
      hp: 308,
      damage: 40,
      attackInterval: 1.45,
      range: 3,
      autoAttack: true,
      abilities: [
        { key: 'warning_shot', name: 'Warning Shot', cooldown: 7 },
        { key: 'starboard_cannons', name: 'Starboard Cannons', cooldown: 10 },
        { key: 'kraken', name: 'Kraken', cooldown: 20 },
      ],
      passive: 'Steal: +15% Gold from Pirate kills. Bloody Bastard: every 10th basic attack makes the target bleed for 10s, dealing 3% max HP per second and adding a 5% slow. Pirate basic attacks avoid bleeding enemies whenever possible.',
    },
  };

  const ENEMY_TEMPLATES = {
    grunt: { name: 'Grunt', hp: 150, damage: 12, moveInterval: 0.665, attackInterval: 1.2, jewel: 5.5, typeClass: 'grunt' },
    runner: { name: 'Runner', hp: 100, damage: 10, moveInterval: 0.57, attackInterval: 1.0, jewel: 4.75, typeClass: 'runner' },
    brute: { name: 'Brute', hp: 420, damage: 35, moveInterval: 0.95, attackInterval: 1.3, jewel: 19, typeClass: 'brute' },
    skitter: { name: 'Skitter', hp: 24, damage: 3, moveInterval: 0.18, attackInterval: 0.8, jewel: 2, typeClass: 'runner' },
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
          const activeTotem = getActiveSlowTotems().find(t => t.x === tile.x && t.y === tile.y);
      if (activeTotem) {
        const boardTile = tileAt(tile.x, tile.y);
        if (boardTile && boardTile.el) {
          const totemBadge = document.createElement('div');
          totemBadge.className = 'slow-totem-badge';
          totemBadge.textContent = 'TOTEM';
          boardTile.el.appendChild(totemBadge);
        }
      }

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
    { id: 'sense_weakness', name: 'Sense Weakness', desc: 'Archer auto-attacks prioritize slowed or debuffed enemies', cost: 135, apply: game => game.modifiers.senseWeakness = true },
    { id: 'exploding_statue', name: 'Exploding Statue', desc: "Statues explode on death, damaging all enemies within 2 tiles for 20% of the Statue's max HP", cost: 145, apply: game => game.modifiers.explodingStatue = true },
  ];

  const MUTATIONS = [
    { id: 'swift_horde', name: 'Swift Horde', desc: 'Enemies move 20% faster', apply: enemy => { enemy.moveInterval *= 0.8; } },
    { id: 'thick_hide', name: 'Thick Hide', desc: 'Enemies gain 25% HP', apply: enemy => { enemy.maxHp *= 1.25; enemy.hp *= 1.25; } },
    { id: 'relentless', name: 'Relentless', desc: 'Enemies attack 20% faster', apply: enemy => { enemy.attackInterval *= 0.8; } },
    { id: 'reinforcements', name: 'Reinforcements', desc: 'Wave size increases by 30%', waveModifier: wave => { wave.sizeMultiplier *= 1.3; } },
    { id: 'determined', name: 'Determined', desc: 'Enemies resist slows by 50%', apply: enemy => { enemy.slowResistance = 0.5; } },
    { id: 'jewel_rush', name: 'Jewel Rush', desc: 'Enemies drop 25% more Gold', apply: enemy => { enemy.jewel *= 1.25; } },
  ];

  const els = {
    grid: document.getElementById('grid'),
    portalHp: document.getElementById('portalHp'),
    jewelCount: document.getElementById('jewelCount'),
    mobileGoldCount: document.getElementById('mobileGoldCount'),
    mobilePortalHp: document.getElementById('mobilePortalHp'),
    waveCount: document.getElementById('waveCount'),
    patternLabel: document.getElementById('patternLabel'),
    mutationLabel: document.getElementById('mutationLabel'),
    countdownLabel: document.getElementById('countdownLabel'),
    phaseLabel: document.getElementById('phaseLabel'),
    instructionText: document.getElementById('instructionText'),
    log: document.getElementById('log'),
    speedToggleBtn: document.getElementById('speedToggleBtn'),
    mobileModeBtn: document.getElementById('mobileModeBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    introBtn: document.getElementById('introBtn'),
    bountyBtn: document.getElementById('bountyBtn'),
    heroesBtn: document.getElementById('heroesBtn'),
    introModal: document.getElementById('introModal'),
    bountyModal: document.getElementById('bountyModal'),
    bountyBody: document.getElementById('bountyBody'),
    closeBountyBtn: document.getElementById('closeBountyBtn'),
    introBody: document.getElementById('introBody'),
    introPageLabel: document.getElementById('introPageLabel'),
    introPrevBtn: document.getElementById('introPrevBtn'),
    introNextBtn: document.getElementById('introNextBtn'),
    closeIntroBtn: document.getElementById('closeIntroBtn'),
    introTitle: document.getElementById('introTitle'),
    introKicker: document.getElementById('introKicker'),
    walletPanel: document.getElementById('walletPanel'),
    walletPanelBody: document.getElementById('walletPanelBody'),
    walletPanelToggle: document.getElementById('walletPanelToggle'),
    bankPanel: document.getElementById('bankPanel'),
    bankPanelBody: document.getElementById('bankPanelBody'),
    bankPanelToggle: document.getElementById('bankPanelToggle'),
    selectedInfo: document.getElementById('selectedInfo'),
    abilitiesPanel: document.getElementById('abilitiesPanel'),
    hirePanel: document.getElementById('hirePanel'),
    relicPanel: document.getElementById('relicPanel'),
    mobileHud: document.getElementById('mobileHud'),
    mobileLeftRail: document.getElementById('mobileLeftRail'),
    mobileRightRail: document.getElementById('mobileRightRail'),
    mobileSideMenuToggleBtn: document.getElementById('mobileSideMenuToggleBtn'),
    mobileRightMenuToggleBtn: document.getElementById('mobileRightMenuToggleBtn'),
    mobileBankHost /* disabled */: document.getElementById('mobileBankHost /* disabled */'),
    mobileProfileHost: document.getElementById('mobileProfileHost'),
    mobileStatsHost: document.getElementById('mobileStatsHost'),
    mobileStatsPanel: document.getElementById('mobileStatsPanel'),
    mobileStatsPanelToggle: document.getElementById('mobileStatsPanelToggle'),
    mobileMenuOverlay: document.getElementById('mobileMenuOverlay'),
    mobileMenuShell: document.getElementById('mobileMenuShell'),
    mobileFuncMenu: document.getElementById('mobileFuncMenu'),
    mobileHeroMenu: document.getElementById('mobileHeroMenu'),
    mobileHireMenu: document.getElementById('mobileHireMenu'),
    mobileHeroHost: document.getElementById('mobileHeroHost'),
    mobileHireHost: document.getElementById('mobileHireHost'),
    mobileFuncMenuBtn: document.getElementById('mobileFuncMenuBtn'),
    mobileHeroMenuBtn: document.getElementById('mobileHeroMenuBtn'),
    mobileHireMenuBtn: document.getElementById('mobileHireMenuBtn'),
    mobileBarToggleBtn: document.getElementById('mobileBarToggleBtn'),
    mobileBarToggleNotice: document.getElementById('mobileBarToggleNotice'),
    mobileInstallPrompt: document.getElementById('mobileInstallPrompt'),
    mobileInstallText: document.getElementById('mobileInstallText'),
    mobileInstallBtn: document.getElementById('mobileInstallBtn'),
    mobileInstallDismissBtn: document.getElementById('mobileInstallDismissBtn'),
    mobileBottomBar: document.getElementById('mobileBottomBar'),
    mobileAbilityBtn1: document.getElementById('mobileAbilityBtn1'),
    mobileAbilityBtn2: document.getElementById('mobileAbilityBtn2'),
    mobileAbilityBtn3: document.getElementById('mobileAbilityBtn3'),
    mobileAbilityBtn4: document.getElementById('mobileAbilityBtn4'),
    mobileQuickRail: document.getElementById('mobileQuickRail'),
    mobileQuickStartBtn: document.getElementById('mobileQuickStartBtn'),
    mobileQuickUpgradeBtn: document.getElementById('mobileQuickUpgradeBtn'),
    mobileQuickMoveBtn: document.getElementById('mobileQuickMoveBtn'),
    mobileQuickSatelliteBtn: document.getElementById('mobileQuickSatelliteBtn'),
    mobileFuncEasyBtn: document.getElementById('mobileFuncEasyBtn'),
    mobileFuncChallengeBtn: document.getElementById('mobileFuncChallengeBtn'),
    mobileFuncPauseBtn: document.getElementById('mobileFuncPauseBtn'),
    mobileFuncIntroBtn: document.getElementById('mobileFuncIntroBtn'),
    mobileFuncBountyBtn: document.getElementById('mobileFuncBountyBtn'),
    mobileFuncHeroesBtn: document.getElementById('mobileFuncHeroesBtn'),
    mobileFuncStartBtn: document.getElementById('mobileFuncStartBtn'),
    mobileFuncSkipBtn: document.getElementById('mobileFuncSkipBtn'),
    mobileFuncRestartBtn: document.getElementById('mobileFuncRestartBtn'),
    premiumJewelCount: document.getElementById('premiumJewelCount'),
    relicModal: document.getElementById('relicModal'),
    relicModalBody: document.getElementById('relicModalBody'),
    banner: document.getElementById('banner'),
    abilityInfoPopup: null,
    startWaveBtn: document.getElementById('startWaveBtn'),
    skipSetupBtn: document.getElementById('skipSetupBtn'),
    restartBtn: document.getElementById('restartBtn'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    moveBtn: document.getElementById('moveBtn'),
    rebuildBarriersBtn: document.getElementById('rebuildBarriersBtn'),
    enemyLayer: null,
    portalArt: null,
    crashPanel: null,
    runLogToggleBtn: document.getElementById('runLogToggleBtn'),
    runLogPanel: document.getElementById('runLogPanel'),
  };

  const game = {
    phase: SETUP_PHASES.PORTAL,
    grid: [],
    tilesByKey: new Map(),
    portal: null,
    towers: [],
    enemies: [],
    waveNumber: 0,
    countdownMs: 0,
    runningWave: false,
    randomObstaclesPlaced: false,
    playerObstacleCount: 0,
    selectedId: null,
    movingTowerId: null,
    placingHeroType: null,
    placingHeroCost: 0,
    hoveredTowerId: null,
    lastTick: 0,
    realLastTick: 0,
    virtualNow: 0,
    timeScale: 2,
    mobileMode: true,
    paused: false,
    nextEnemyId: 1,
    nextTowerId: 1,
    nextWavePlan: null,
    activeMutation: null,
    recentMutations: [],
    recentLanes: [],
    hireCount: 0,
    bonusHeroHireCharges: 0,
    placingHeroUsesBonus: false,
    rebuildingBarriers: false,
    barrierRefitCount: 0,
    jewel: 0,
    premiumJewels: 0,
    runEntryCost: 3,
    milestoneJewelsGranted: {},
    portalHp: 2500,
    relicChoices: [],
    ownedRelics: [],
    attackLines: [],
    explosionEffects: [],
    projectileEffects: [],
    slowTotems: [],
    modifiers: {
      wizardSpellDamage: 1,
      wizardCooldown: 1,
      warriorCooldown: 1,
      priestHealing: 1,
      sacredAura: false,
      pirateSteal: 0.15,
      extraCannons: 0,
      shieldWall: false,
      rangerLine: false,
      senseWeakness: false,
      explodingStatue: false,
    },
    logLimit: 120,
    bannerTimeout: null,
    statusOverlayTimeout: null,
    mobileLeftRailCollapsed: true,
    mobileRightRailCollapsed: true,
    crashed: false,
    diagnostics: {
      recentEvents: [],
      lastProgressAt: 0,
      lastProgressHash: '',
      softLockTriggered: false,
      overlayVisible: false,
      lastReport: null,
    },
    introPageIndex: 0,
    introSet: 'intro',
    introOpen: false,
    introAutoShown: false,
    runTracking: {
      clientRunId: null,
      startedAt: null,
      submitted: false,
    },
  };

  function now() { return game.virtualNow || Date.now(); }

  function loadPremiumJewels() {
    try {
      const stored = localStorage.getItem('portalSiegePremiumJewels');
      game.premiumJewels = stored == null ? 500 : Number(stored || 0);
      if (!Number.isFinite(game.premiumJewels)) game.premiumJewels = 500;
      if (game.premiumJewels < 500) {
        game.premiumJewels = 500;
        localStorage.setItem('portalSiegePremiumJewels', String(game.premiumJewels));
      }
    } catch (e) {
      game.premiumJewels = 500;
    }
  }

  function savePremiumJewels() {
    try { localStorage.setItem('portalSiegePremiumJewels', String(game.premiumJewels)); } catch (e) {}
  }

  function awardPremiumJewels(amount, reason) {
    game.premiumJewels += amount;
    savePremiumJewels();
    if (reason) {
      log(`${reason}: +${amount} Jewel.`);
      showBanner(`${reason}: +${amount} Jewel`, 2200);
    }
  }

  function updatePremiumJewelInfo() {
    if (els.premiumJewelCount) els.premiumJewelCount.textContent = String(game.premiumJewels);
  }

  function buildRunTrackingHeroes() {
    const buckets = new Map();
    for (const tower of game.towers) {
      const key = tower.type || 'unknown';
      if (!buckets.has(key)) buckets.set(key, { type: key, count: 0, highestLevel: 0, satellites: 0 });
      const row = buckets.get(key);
      row.count += 1;
      row.highestLevel = Math.max(row.highestLevel, Number(tower.level || 1));
      if (tower.isSatellite) row.satellites += 1;
    }
    return Array.from(buckets.values()).sort((a, b) => a.type.localeCompare(b.type));
  }

  function buildCompletedRunPayload(result = 'loss') {
    return {
      clientRunId: game.runTracking.clientRunId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      runStartedAt: game.runTracking.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      gameVersion: 'V39',
      mode: game.mobileMode ? 'easy' : 'challenge',
      result,
      waveReached: Number(game.waveNumber || 0),
      wavesCleared: Number(game.waveNumber || 0),
      portalHpLeft: Math.max(0, Math.round(Number(game.portalHp || 0))),
      goldOnHand: Math.max(0, Math.round(Number(game.jewel || 0))),
      premiumJewels: Math.max(0, Math.round(Number(game.premiumJewels || 0))),
      heroes: buildRunTrackingHeroes(),
      stats: {
        towerCount: game.towers.length,
        satelliteCount: game.towers.filter(t => t.isSatellite).length,
        playerBarriersPlaced: Number(game.playerObstacleCount || 0),
        randomObstacles: Number(6),
        barrierRefits: Number(game.barrierRefitCount || 0),
        hireCount: Number(game.hireCount || 0),
        crashed: Boolean(game.crashed),
      },
    };
  }


  function hasTrackableRunInProgress() {
    return Boolean(
      game.runTracking
      && game.runTracking.clientRunId
      && !game.runTracking.submitted
      && game.phase !== SETUP_PHASES.GAME_OVER
    );
  }

  function isRunTrackingEnabled() {
    return Boolean(
      window.DFKRunTracker
      && typeof window.DFKRunTracker.isTrackingEnabled === 'function'
      && window.DFKRunTracker.isTrackingEnabled()
    );
  }

  function captureTrackedRunNow(result = 'abandoned') {
    if (!hasTrackableRunInProgress() || !isRunTrackingEnabled()) return false;
    game.runTracking.submitted = true;
    const payload = buildCompletedRunPayload(result);
    if (window.DFKRunTracker && typeof window.DFKRunTracker.submitCompletedRunKeepalive === 'function') {
      const queued = window.DFKRunTracker.submitCompletedRunKeepalive(payload);
      if (!queued) game.runTracking.submitted = false;
      return queued;
    }
    game.runTracking.submitted = false;
    return false;
  }

  async function maybeConfirmAndCaptureTrackedReset() {
    if (!hasTrackableRunInProgress() || !isRunTrackingEnabled()) return true;
    const confirmed = window.confirm('You are quitting this run and starting a new one, the score will be saved at the current wave. Are you sure?');
    if (!confirmed) return false;
    await submitCompletedRunOnce('abandoned');
    return true;
  }

  async function submitCompletedRunOnce(result = 'loss') {
    if (game.runTracking.submitted) return;
    if (!window.DFKRunTracker || typeof window.DFKRunTracker.submitCompletedRun !== 'function') return;
    game.runTracking.submitted = true;
    try {
      await window.DFKRunTracker.submitCompletedRun(buildCompletedRunPayload(result));
      log(`Run tracked at wave ${game.waveNumber}.`);
    } catch (error) {
      game.runTracking.submitted = false;
      log(`Run tracking failed: ${error && error.message ? error.message : 'Unknown error'}.`);
    }
  }

  function syncPremiumJewelsFromSettledBank(detail) {
    if (!detail || detail.balance == null) return;
    const parsed = Number(detail.balance);
    if (!Number.isFinite(parsed)) return;
    game.premiumJewels = parsed;
    updatePremiumJewelInfo();
    syncMobileQuickActions();
  }
  function key(x, y) { return `${x},${y}`; }
  function tileAt(x, y) { return game.tilesByKey.get(key(x, y)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  function chance(n) { return Math.random() < n; }
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function adjacentTiles(x, y) { return DIRECTIONS.map(d => ({ x: x + d.x, y: y + d.y })).filter(p => inBounds(p.x, p.y)); }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT; }
  function rarityForLevel(level) { return RARITIES[Math.min(4, Math.floor((level - 1) / 5))]; }

  function getRandomTreeVariant() {
    const variants = ['tree1'];
    return variants[Math.floor(Math.random() * variants.length)];
  }

  function getSpawnBounds() {
    const spawns = game.grid.filter(t => t.type === 'spawn');
    const xs = spawns.map(t => t.x);
    const ys = spawns.map(t => t.y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

  function createHitFlash(x, y, colorKey, text = '') {
    if (!inBounds(x, y)) return;
    const tile = tileAt(x, y);
    if (!tile) return;
    tile.hitFlash = {
      colorKey,
      text,
      until: now() + 360,
    };
  }

  function heroColorKey(type) {
    return ({
      warrior: 'warrior',
      archer: 'archer',
      wizard: 'wizard',
      priest: 'priest',
      pirate: 'pirate',
    })[type] || 'default';
  }

  function initGrid() {
    game.grid = [];
    game.tilesByKey.clear();
    els.grid.innerHTML = '';
    if (!els.enemyLayer) {
      els.enemyLayer = document.createElement('div');
      els.enemyLayer.id = 'enemyLayer';
      els.enemyLayer.className = 'enemy-layer';
    }
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const tile = {
          x,
          y,
          type: 'open',
          obstacle: null,
          treeVariant: null,
          towerId: null,
          portal: false,
          pathPreview: null,
          hitFlash: null,
          el: document.createElement('div'),
        };
        tile.el.className = 'tile';
        tile.el.dataset.x = String(x);
        tile.el.dataset.y = String(y);
        els.grid.appendChild(tile.el);
        game.grid.push(tile);
        game.tilesByKey.set(key(x, y), tile);
      }
    }
    if (els.enemyLayer) els.grid.appendChild(els.enemyLayer);
  }


  function assignRandomBreachTiles() {
    const startRow = randInt(0, HEIGHT - 3);
    BREACH_LANES = {
      top: [{ x: 0, y: startRow }],
      middle: [{ x: 0, y: startRow + 1 }],
      bottom: [{ x: 0, y: startRow + 2 }],
    };
    for (let y = 0; y < HEIGHT; y += 1) {
      const tile = tileAt(0, y);
      if (tile) tile.type = 'open';
    }
    for (const spawnTile of getSpawnTiles()) {
      const tile = tileAt(spawnTile.x, spawnTile.y);
      if (tile) tile.type = 'spawn';
    }
  }

  function hasMeaningfulRunInProgress() {
    return game.phase !== SETUP_PHASES.GAME_OVER && (
      game.runningWave
      || game.waveNumber > 0
      || !!game.portal
      || game.towers.length > 0
      || game.playerObstacleCount > 0
      || game.countdownMs > 0
    );
  }

  async function resetGame(options = {}) {
    const skipTrackedResetConfirm = !!(options && options.skipTrackedResetConfirm);
    if (!skipTrackedResetConfirm) {
      const canReset = await maybeConfirmAndCaptureTrackedReset();
      if (!canReset) return false;
    }
    loadPremiumJewels();
    if (game.premiumJewels < game.runEntryCost) {
      showBanner(`Not enough Jewel to start a run (${game.premiumJewels}/${game.runEntryCost})`, 2400);
      setInstruction(`Not enough Jewel to start a run (${game.premiumJewels}/${game.runEntryCost}).`);
      updatePremiumJewelInfo();
      return;
    }
    game.premiumJewels -= game.runEntryCost;
    savePremiumJewels();
    game.phase = SETUP_PHASES.PORTAL;
    game.runTracking = {
      clientRunId: (window.crypto && typeof window.crypto.randomUUID === 'function') ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      startedAt: new Date().toISOString(),
      submitted: false,
    };
    game.portal = null;
    game.towers = [];
    game.enemies = [];
    game.waveNumber = 0;
    game.countdownMs = 0;
    game.runningWave = false;
    game.playerObstacleCount = 0;
    game.selectedId = null;
    game.movingTowerId = null;
    game.placingHeroType = null;
    game.placingHeroCost = 0;
    game.placingSatelliteSourceId = null;
    game.hoveredTowerId = null;
    game.nextEnemyId = 1;
    game.nextTowerId = 1;
    game.nextWavePlan = null;
    game.activeMutation = null;
    game.recentMutations = [];
    game.recentLanes = [];
    game.hireCount = 0;
    game.bonusHeroHireCharges = 0;
    game.placingHeroUsesBonus = false;
    game.rebuildingBarriers = false;
    game.barrierRefitCount = 0;
    game.jewel = 0;
    game.portalHp = 2500;
    game.milestoneJewelsGranted = {};
    game.relicChoices = [];
    game.ownedRelics = [];
    game.attackLines = [];
    game.explosionEffects = [];
    game.projectileEffects = [];
    game.slowTotems = [];
    game.infoPopupPinned = false;
    game.infoPopupHover = false;
    if (game.infoPopupHideTimer) { clearTimeout(game.infoPopupHideTimer); game.infoPopupHideTimer = null; }
    if (els.abilityInfoPopup) { els.abilityInfoPopup.classList.add('hidden'); els.abilityInfoPopup.innerHTML = ''; }
    game.modifiers = {
      wizardSpellDamage: 1,
      wizardCooldown: 1,
      warriorCooldown: 1,
      priestHealing: 1,
      sacredAura: false,
      pirateSteal: 0.15,
      extraCannons: 0,
      shieldWall: false,
      rangerLine: false,
      senseWeakness: false,
      explodingStatue: false,
    };
    els.log.innerHTML = '';
    updatePremiumJewelInfo();
    if (els.portalArt && els.portalArt.parentNode) {
      els.portalArt.parentNode.removeChild(els.portalArt);
    }
    els.portalArt = null;
    initGrid();
    assignRandomBreachTiles();
    placeRandomObstacles();
    game.paused = false;
    game.timeScale = 2;
    game.mobileMode = true;
    updateModeButtons();
    updatePauseButton();
    setInstruction(`Place the 2x2 portal anywhere at least 3 tiles away from the breach. Then place ${PLAYER_OBSTACLE_COUNT} choke-point obstacles, then place your Warrior. Before wave 1 starts, you can click one of your barriers to move it.`);
    log('New run started. Random obstacles are already on the field.');
    updateTopbar();
      updateMobileBoardFit();
    showStatusOverlay();
    render();
    maybeShowIntroOnOpen();
    return true;
  }

  function placeRandomObstacles() {
    const placed = [];
    let guard = 0;
    while (placed.length < RANDOM_OBSTACLE_COUNT && guard < 3000) {
      guard += 1;
      const x = randInt(0, WIDTH - 1);
      const y = randInt(0, HEIGHT - 1);
      const tile = tileAt(x, y);
      if (!tile || tile.obstacle || tile.portal || tile.type === 'spawn') continue;
      if (placed.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) <= 1)) continue;
      tile.obstacle = 'random';
      placed.push({ x, y });
    }
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function setInstruction(text) {
    if (els.instructionText) els.instructionText.textContent = text;
    const phaseMap = {
      [SETUP_PHASES.PORTAL]: 'Setup: Place Portal',
      [SETUP_PHASES.OBSTACLES]: `Setup: Place Obstacles (${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT})`,
      [SETUP_PHASES.WARRIOR]: 'Setup: Place Warrior',
      [SETUP_PHASES.BATTLE]: game.runningWave ? 'Battle in Progress' : 'Preparation Phase',
      [SETUP_PHASES.GAME_OVER]: 'Game Over',
    };
    if (els.phaseLabel) els.phaseLabel.textContent = phaseMap[game.phase] || 'Ready';
    showStatusOverlay();
  }

  function log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    els.log.prepend(entry);
    while (els.log.children.length > game.logLimit) els.log.removeChild(els.log.lastChild);
  }

  function showBanner(message, duration = 1500) {
    // Disabled per user request (was covering UI)
    return;
}


  function pushDiagnosticEvent(message) {
    const stamp = new Date().toLocaleTimeString();
    game.diagnostics.recentEvents.push(`[${stamp}] ${message}`);
    if (game.diagnostics.recentEvents.length > 30) game.diagnostics.recentEvents.shift();
  }

  function markProgress(reason) {
    game.diagnostics.lastProgressAt = now();
    pushDiagnosticEvent(reason);
  }

  function getPendingSpawnCount() {
    return game.pendingSpawns ? game.pendingSpawns.filter(s => !s.spawned).length : 0;
  }

  function buildProgressHash() {
    const enemySnapshot = game.enemies
      .slice(0, 8)
      .map(e => `${e.id}:${e.x},${e.y}:${Math.round(e.hp)}:${e.attacking ? 1 : 0}`)
      .join('|');
    return [
      game.phase,
      game.runningWave ? 1 : 0,
      game.waveNumber,
      Math.round(game.portalHp),
      game.enemies.length,
      getPendingSpawnCount(),
      enemySnapshot,
    ].join('~');
  }

  function ensureCrashPanel() {
    if (els.crashPanel) return els.crashPanel;
    const panel = document.createElement('div');
    panel.id = 'crashPanel';
    panel.className = 'crash-panel hidden';
    panel.innerHTML = `
      <div class="crash-panel-header">
        <strong>Crash Report</strong>
        <button type="button" id="closeCrashPanelBtn" class="crash-close">×</button>
      </div>
      <div id="crashPanelBody" class="crash-panel-body"></div>
      <div class="crash-panel-actions">
        <button type="button" id="copyCrashReportBtn" class="small-action">Copy Report</button>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#closeCrashPanelBtn').addEventListener('click', hideCrashPanel);
    panel.querySelector('#copyCrashReportBtn').addEventListener('click', copyCrashReport);
    els.crashPanel = panel;
    return panel;
  }

  function hideCrashPanel() {
    if (!els.crashPanel) return;
    els.crashPanel.classList.add('hidden');
    game.diagnostics.overlayVisible = false;
  }

  function copyCrashReport() {
    const report = game.diagnostics.lastReport;
    if (!report) return;
    const lines = [
      `${report.title}`,
      `${report.summary}`,
      `State: ${report.stateLine}`,
      'Recent events:',
      ...report.events,
      report.errorLine ? `Error: ${report.errorLine}` : '',
    ].filter(Boolean);
    const payload = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(() => showBanner('Crash report copied', 1200)).catch(() => {});
    }
  }

  function inferCrashHint(reportType, errorObj) {
    if (reportType === 'softlock') {
      return 'The game state stopped changing during an active wave. This usually means pathing, aggro, or blocker placement created a deadlock.';
    }
    if (game.portalHp <= 0) {
      return 'The portal was destroyed. If the screen looked frozen, this was likely a game-over state rather than a true crash.';
    }
    const msg = String(errorObj?.message || errorObj || '');
    if (/undefined|null|Cannot read/i.test(msg)) {
      return 'A unit, tile, or UI element was missing when the game tried to use it.';
    }
    if (/path|move|portal|warrior/i.test(msg)) {
      return 'This likely happened during movement or path validation.';
    }
    return 'An unexpected runtime error occurred.';
  }

  function showCrashReport(reportType, errorObj, extra = {}) {
    if (game.diagnostics.overlayVisible && reportType !== 'softlock') return;
    const panel = ensureCrashPanel();
    const stateLine = `wave=${game.waveNumber} phase=${game.phase} runningWave=${game.runningWave} portalHp=${Math.round(game.portalHp)} enemies=${game.enemies.length} pendingSpawns=${getPendingSpawnCount()} towers=${game.towers.length}`;
    const events = [...game.diagnostics.recentEvents].slice(-10).reverse();
    const errorLine = errorObj ? String(errorObj.stack || errorObj.message || errorObj) : '';
    const title = reportType === 'softlock' ? 'Possible Soft Lock Detected' : 'Runtime Error Detected';
    const summary = extra.summary || inferCrashHint(reportType, errorObj);
    game.diagnostics.lastReport = { title, summary, stateLine, events, errorLine };
    const body = panel.querySelector('#crashPanelBody');
    body.innerHTML = `
      <div class="crash-summary">${summary}</div>
      <div class="crash-state"><strong>State:</strong> ${stateLine}</div>
      ${errorLine ? `<div class="crash-error"><strong>Error:</strong> ${escapeHtml(errorLine)}</div>` : ''}
      <div class="crash-events"><strong>Recent events:</strong><br>${events.map(e => escapeHtml(e)).join('<br>')}</div>
    `;
    panel.classList.remove('hidden');
    game.diagnostics.overlayVisible = true;
    game.runningWave = false;
    game.crashed = true;
    if (game.phase !== SETUP_PHASES.GAME_OVER) {
      setInstruction(reportType === 'softlock' ? 'The game detected a possible soft lock. Review the crash report or start a new run.' : 'The game hit an error. Review the crash report or start a new run.');
    }
    showBanner(reportType === 'softlock' ? 'Possible soft lock detected' : 'Runtime error detected', 2800);
    log(reportType === 'softlock' ? 'Possible soft lock detected. Crash report opened.' : 'Runtime error detected. Crash report opened.');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  function syncStatusOverlayVisibility(forceHidden = game.introOpen) {
    const overlay = document.getElementById('statusOverlay');
    if (!overlay) return;
    if (forceHidden) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';
      overlay.style.visibility = 'hidden';
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      return;
    }
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.style.display = '';
    overlay.style.visibility = '';
    overlay.style.opacity = '';
    overlay.style.pointerEvents = '';
  }

  function showStatusOverlay(duration = 2500) {
    const overlay = document.getElementById('statusOverlay');
    if (!overlay) return;
    if (game.statusOverlayTimeout) {
      clearTimeout(game.statusOverlayTimeout);
      game.statusOverlayTimeout = null;
    }
    if (game.introOpen || document.body.classList.contains('intro-open')) {
      syncStatusOverlayVisibility(true);
      return;
    }
    overlay.style.left = '';
    overlay.style.right = '';
    overlay.style.top = '';
    overlay.style.bottom = '';
    overlay.style.transform = '';
    syncStatusOverlayVisibility(false);
    game.statusOverlayTimeout = setTimeout(() => {
      syncStatusOverlayVisibility(true);
      game.statusOverlayTimeout = null;
    }, duration);
  }




  const BOUNTY_BOARD_ENTRIES = [
    {
      tier: '01',
      title: 'First player to beat wave 20',
      reward: '50J',
      status: 'open',
      detail: 'Live now. First verified tracked run to reach wave 20 claims the bounty.',
    },
    {
      tier: '02',
      title: 'Locked Bounty',
      reward: 'Locked',
      status: 'locked',
      detail: 'Complete earlier bounty to unlock the next.',
    },
    {
      tier: '03',
      title: 'Locked Bounty',
      reward: 'Locked',
      status: 'locked',
      detail: 'Complete earlier bounty to unlock the next.',
    },
    {
      tier: '04',
      title: 'Locked Bounty',
      reward: 'Locked',
      status: 'locked',
      detail: 'Complete earlier bounty to unlock the next.',
    },
    {
      tier: '05',
      title: 'Locked Bounty',
      reward: 'Locked',
      status: 'locked',
      detail: 'Complete earlier bounty to unlock the next.',
    },
    {
      tier: '06',
      title: 'Locked Bounty',
      reward: 'Locked',
      status: 'locked',
      detail: 'Complete earlier bounty to unlock the next.',
    },
    {
      tier: '07',
      title: 'Locked Bounty',
      reward: 'Locked',
      status: 'locked',
      detail: 'Complete earlier bounty to unlock the next.',
    },
  ];

  function renderBountyBoard() {
    if (!els.bountyBody) return;
    const cards = BOUNTY_BOARD_ENTRIES.map((entry, index) => `
      <article class="bounty-card ${entry.status === 'open' ? 'is-open' : 'is-locked'}">
        <div class="bounty-card-top">
          <div class="bounty-tier-wrap">
            <div class="bounty-tier-label">Bounty ${entry.tier}</div>
            <div class="bounty-tier-index">${index + 1}</div>
          </div>
          <div class="bounty-reward-pill ${entry.status === 'open' ? 'is-open' : 'is-locked'}">${entry.reward}</div>
        </div>
        <h3 class="bounty-card-title">${entry.title}</h3>
        <p class="bounty-card-copy">${entry.detail}</p>
        <div class="bounty-card-footer">
          <span class="bounty-state-chip ${entry.status === 'open' ? 'is-open' : 'is-locked'}">${entry.status === 'open' ? 'Open Now' : 'Locked'}</span>
          <span class="bounty-chain-note">Tracked run required</span>
        </div>
      </article>
    `).join('');
    els.bountyBody.innerHTML = `
      <div class="bounty-hero-strip">
        <div>
          <div class="bounty-strip-kicker">Community challenge ladder</div>
          <p class="bounty-strip-copy">Finish the current open bounty to reveal the next one. Rewards are paid manually by the game owner after the qualifying tracked run is verified.</p>
        </div>
        <div class="bounty-strip-badge">7 total bounties</div>
      </div>
      <div class="bounty-grid">${cards}</div>
    `;
  }

  function openBountyModal() {
    if (game.statusOverlayTimeout) {
      clearTimeout(game.statusOverlayTimeout);
      game.statusOverlayTimeout = null;
    }
    closeIntroModal();
    renderBountyBoard();
    game.introOpen = true;
    syncStatusOverlayVisibility(true);
    document.body.classList.add('intro-open');
    if (els.bountyModal) {
      els.bountyModal.classList.remove('hidden');
      els.bountyModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeBountyModal() {
    if (els.bountyModal) {
      els.bountyModal.classList.add('hidden');
      els.bountyModal.setAttribute('aria-hidden', 'true');
    }
    game.introOpen = false;
    document.body.classList.remove('intro-open');
    syncStatusOverlayVisibility(false);
    showStatusOverlay();
  }

  const INTRO_PAGES = [
    {
      title: 'Objective, Wallet, and Leaderboard',
      body: `
        <div class="intro-section-card">
          <p><span class="intro-highlight">Objective</span> — Defend the portal for as many waves as possible. Your main score is your <span class="intro-highlight">best wave reached</span>.</p>
          <p><span class="intro-highlight">Core loop</span> — Place heroes, kill enemies for Gold, strengthen your defense, and survive as long as you can.</p>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Wallet Connection and Run Tracking</p>
          <ul class="intro-compact-list">
            <li>Connect your wallet to link your runs to your wallet address.</li>
            <li>No transaction is required just to connect or track runs.</li>
            <li>If run tracking is enabled and you leave mid-run, the run ends and your current wave is saved.</li>
            <li>This prevents players from dodging bad endings by closing the game without recording the result.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Leaderboard</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Primary ranking</span> — Best Wave</li>
            <li><span class="intro-highlight">Secondary stat</span> — Runs</li>
            <li>Name priority is <span class="intro-highlight">Vanity Name → In-game Name → Wallet</span>.</li>
            <li>Sorting lets you compare peak performance or total attempts.</li>
          </ul>
        </div>
      `,
    },
    {
      title: 'Warrior and Statue',
      body: `
        <div class="intro-section-card">
          <p><span class="intro-highlight">Warrior</span> is your front-line tank and main path control tool.</p>
          <ul class="intro-compact-list">
            <li>The Warrior is the one hero built to block enemies directly.</li>
            <li>He can move <span class="intro-highlight">1 tile</span> at a time.</li>
            <li>He has a <span class="intro-highlight">5 second</span> move cooldown.</li>
            <li>He is allowed to move in ways that block the path.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Warrior Skills</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Gladiator Strike</span> — Passive bonus hit that also heals the Warrior.</li>
            <li><span class="intro-highlight">Whirlwind</span> — Heavy adjacent area damage.</li>
            <li><span class="intro-highlight">Rapid Onslaught</span> — Short burst of faster attacks.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Statue</p>
          <ul class="intro-compact-list">
            <li>Generated from the Warrior as a separate placement charge.</li>
            <li>Starts with <span class="intro-highlight">double the Warrior's current HP</span> when created.</li>
            <li>Cannot move.</li>
            <li>Cannot be healed.</li>
            <li>Enemies strongly prefer to attack a reachable Statue.</li>
            <li>If a Statue cannot realistically be reached, enemies ignore it.</li>
            <li>When a Statue dies, it triggers a <span class="intro-highlight">red fire explosion</span>.</li>
          </ul>
          <p>Use the Warrior and Statue to stall bosses, hold dangerous lanes, and buy time for your damage heroes.</p>
        </div>
      `,
    },
    {
      title: 'Archer and Satellite Archer',
      body: `
        <div class="intro-section-card">
          <p><span class="intro-highlight">Archer</span> is your main sustained ranged damage hero. Archers reward survival and positioning, not reckless trading.</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Multi-Shot</span> — 3 arrows for split burst damage.</li>
            <li><span class="intro-highlight">Rapid Shot</span> — Short burst of faster attacks.</li>
            <li><span class="intro-highlight">Piercing Shot</span> — Line shot that can hit up to 3 enemies.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Satellite Archer Rules</p>
          <ul class="intro-compact-list">
            <li>An Archer must survive for <span class="intro-highlight">12 cleared waves</span> before earning a Satellite Archer charge.</li>
            <li>The Satellite Archer is a temporary ethereal helper placed during prep.</li>
            <li>It starts at level 1 with half max HP.</li>
            <li>It deals <span class="intro-highlight">75% of the parent Archer's damage</span>.</li>
            <li>It lasts for <span class="intro-highlight">9 cleared waves total</span>.</li>
            <li>After 3 cleared waves it fades to about 25% translucency.</li>
            <li>After 7 cleared waves it fades to about 50% translucency.</li>
            <li>After 9 cleared waves it dissipates completely and triggers <span class="intro-highlight">green fire</span>.</li>
            <li>Once it is gone, that Archer must survive 12 more cleared waves before earning the next one.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p>Do not judge Archers only by current damage. If they die early, they never reach their satellite timing, and you lose a large part of their long-run value.</p>
        </div>
      `,
    },
    {
      title: 'Wizard, Priest, and Pirate',
      body: `
        <div class="intro-section-card">
          <p class="intro-page-subheading">Wizard</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Firebolt</span> — Reliable direct spell damage.</li>
            <li><span class="intro-highlight">Ice Aura</span> — Passive slow around the Wizard that grows stronger with level.</li>
            <li><span class="intro-highlight">Fireball</span> — Area damage for clustered enemies.</li>
            <li><span class="intro-highlight">Frost Lance</span> — Heavy hit that is stronger against slowed targets.</li>
          </ul>
          <p>The Wizard is strongest when enemies are stacked together by terrain, pathing, or Warrior control.</p>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Priest</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Prayer of Healing</span> — Heals nearby allies.</li>
            <li><span class="intro-highlight">Slow Totem</span> — Manual totem that slows enemies within 2 tiles for 45 seconds.</li>
            <li><span class="intro-highlight">Swiftness</span> — Attack speed boost for nearby allies.</li>
            <li><span class="intro-highlight">Healing Aura</span> — Passive healing at higher level.</li>
            <li><span class="intro-highlight">Divine Soldier</span> — Starting at level 10, reduces <span class="intro-highlight">Prayer of Healing</span> cooldown by 0.1s per level to a minimum of 1.0s.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Pirate</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Warning Shot</span> — Marks a target so it takes more damage.</li>
            <li><span class="intro-highlight">Starboard Cannons</span> — Splash damage into a small cluster.</li>
            <li><span class="intro-highlight">Kraken</span> — Damaging zone that also slows enemies.</li>
            <li><span class="intro-highlight">Bloody Bastard</span> — Passive bleed, slow, and extra Gold value on Pirate kills.</li>
          </ul>
        </div>
      `,
    },
    {
      title: 'Enemies and Targeting Rules',
      body: `
        <div class="intro-section-card">
          <p class="intro-page-subheading">Enemy Types</p>
          <ul class="intro-compact-list">
            <li><span class="intro-highlight">Standard enemies</span> — Balanced baseline pressure.</li>
            <li><span class="intro-highlight">Large enemies</span> — Higher health and more dangerous once scaling ramps up.</li>
            <li><span class="intro-highlight">Skitters</span> — Slower, high-HP enemies that explode on death.</li>
            <li><span class="intro-highlight">Bosses</span> — Major pressure spikes that test your control and damage.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Skitter Notes</p>
          <ul class="intro-compact-list">
            <li>Skitters are <span class="intro-highlight">50% slower</span> than before.</li>
            <li>They have much more health than a normal small enemy.</li>
            <li>They explode on death.</li>
            <li>Their explosion damage was reduced by <span class="intro-highlight">25%</span>.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Boss Pressure</p>
          <ul class="intro-compact-list">
            <li>Boss waves are the main survival checks.</li>
            <li>At <span class="intro-highlight">wave 30</span>, you get <span class="intro-highlight">2 full-size bosses</span>.</li>
            <li>That same wave pressure also adds about <span class="intro-highlight">33% more Skitters</span>.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Targeting Rules</p>
          <ul class="intro-compact-list">
            <li>Enemies want to reach the portal.</li>
            <li>If a Statue is reachable, they strongly prefer it.</li>
            <li>If a Statue is unreachable, they ignore it.</li>
            <li>Warriors are your main direct path-control unit.</li>
          </ul>
        </div>
      `,
    },
    {
      title: 'Scaling and Strategy Basics',
      body: `
        <div class="intro-section-card">
          <p class="intro-page-subheading">Economy and Scaling</p>
          <ul class="intro-compact-list">
            <li>Gold comes from kills.</li>
            <li>Early economy matters because weak early scaling usually turns into a failed midgame.</li>
            <li>As waves rise, enemy speed, health, and pressure increase.</li>
            <li>The <span class="intro-highlight">Level Cap This Wave</span> limits how high a hero can be upgraded right now.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p class="intro-page-subheading">Practical Strategy</p>
          <ul class="intro-compact-list">
            <li>Keep Archers alive long enough to earn satellites.</li>
            <li>Use Warrior and Statue to buy time, not just to soak damage.</li>
            <li>Do not let Skitter deaths happen carelessly inside your whole formation.</li>
            <li>Protect Wizards, Priests, Pirates, and Archers from direct collapse.</li>
            <li>Positioning matters more than raw damage once late waves start stacking threats together.</li>
          </ul>
        </div>
        <div class="intro-section-card">
          <p>The run usually ends when the defense loses structure, not when one number was slightly too low. Good runs come from stable lanes, protected damage, and smart use of your control tools.</p>
        </div>
      `,
    },
  ];


  const HERO_TILE_IMAGES = {
    warrior: 'assets/hero_tile_warrior.png',
    wizard: 'assets/hero_tile_wizard.png',
    archer: 'assets/hero_tile_archer.png',
    priest: 'assets/hero_tile_priest.png',
    pirate: 'assets/hero_tile_pirate.png',
  };

  const HERO_TILE_LABELS = {
    warrior: 'WARRIOR',
    wizard: 'WIZARD',
    archer: 'ARCHER',
    priest: 'PRIEST',
    pirate: 'PIRATE',
  };


  const HERO_PAGES = [
    {
      title: 'Warrior – Path Control',
      body: `
        <p>The Warrior is the only hero that <span class="intro-highlight">blocks enemy pathing</span>. He decides where enemies fight, buys room for your backline, and keeps the portal from getting mobbed too early.</p>
        <ul>
          <li><span class="intro-highlight">Gladiator Strike</span> — Passive. Every 9 Warrior basic attacks, Gladiator Strike triggers on the hit target for bonus damage and heals the Warrior.</li>
          <li><span class="intro-highlight">Statue</span> — Passive. Every 10 cleared waves, the Warrior gains 1 Statue charge. The Warrior uses old battle magic to create a statue of himself that stops enemies until they destroy it. A Statue does not attack, cannot be moved, cannot be healed, and enters the field at full strength. Its maximum health is equal to double the Warrior's current health when it is summoned, and it begins at 100% of that total.</li>
          <li><span class="intro-highlight">Whirlwind</span> — Hits adjacent enemies for heavy area damage.</li>
          <li><span class="intro-highlight">Rapid Onslaught</span> — Boosts Warrior attack speed for a short burst, which is ideal when a choke point is getting overloaded.</li>
        </ul>
        <p>The Warrior belongs at the front. He holds lanes, forces reroutes, and protects your damage dealers by making enemies crash into him first instead of slipping through to softer targets.</p>
      `,
    },
    {
      title: 'Aggro – Protect Your DPS',
      body: `
        <p>Enemies are drawn toward heroes that damage them instead of the portal. That means your ranged heroes can pull heat the moment they start contributing.</p>
        <ul>
          <li>Archers, Wizards, and Pirates will often take aggro once they start hitting.</li>
          <li>If they are exposed, they get focused and can fall fast.</li>
          <li>The Warrior's path block is what keeps those heroes alive long enough to matter.</li>
        </ul>
        <p>Your DPS wins fights, but only if you place it behind cover, behind the Warrior, or far enough away that enemies cannot instantly collapse on it.</p>
      `,
    },
    {
      title: 'Archer – Sustained Damage',
      body: `
        <p>The Archer keeps up steady pressure from range and helps thin waves before they ever reach your choke point.</p>
        <ul>
          <li><span class="intro-highlight">Multi-Shot</span> — Fires 3 arrows for split burst damage. Good for trimming packs.</li>
          <li><span class="intro-highlight">Rapid Shot</span> — Boosts attack speed for a short burst, letting the Archer dump damage quickly into a dangerous lane.</li>
          <li><span class="intro-highlight">Piercing Shot</span> — Hits up to 3 enemies in a line with falling damage through the targets, making it strong in tight traffic.</li>
          <li><span class="intro-highlight">Eagle Nest</span> — Passive. Every 12 cleared waves, Eagle Nest grants 1 Satellite Archer charge. During prep, you can place a level 1 helper Archer with half max HP, 75% of the parent hero's damage, and a higher upgrade cost. Satellite Archers are ethereal: after 3 cleared waves they fade to 25% translucency, after 7 cleared waves they fade to 50% translucency, and after 9 cleared waves they dissipate completely. The tile shows how many waves remain, and once the Satellite Archer is gone you must clear 12 more waves before summoning the next one.</li>
        </ul>
        <p>The Archer works best behind the Warrior, where she can fire safely into crowds instead of becoming the crowd's next target.</p>
      `,
    },
    {
      title: 'Wizard – Crowd Control',
      body: `
        <p>The Wizard is how you stop a wave from snowballing. He softens groups, slows pressure, and punishes enemies that bunch up in choke points.</p>
        <ul>
          <li><span class="intro-highlight">Firebolt</span> — Deals direct spell damage on a short cooldown.</li>
          <li><span class="intro-highlight">Ice Aura</span> — Passive. Every second, it slows nearby enemies. The slow grows stronger with Wizard level, and the aura range expands again later at higher level.</li>
          <li><span class="intro-highlight">Fireball</span> — Explodes in an area, making it one of the best answers to clustered enemies.</li>
          <li><span class="intro-highlight">Frost Lance</span> — Deals heavy damage, and it hits even harder against enemies that are already slowed.</li>
        </ul>
        <p>The Wizard is strongest when enemies are forced to stack up by Warrior positioning or terrain, because that turns every area spell into real control.</p>
      `,
    },
    {
      title: 'Priest – Sustain',
      body: `
        <p>The Priest does not win by burst. She wins by keeping the rest of your team alive long enough to finish the fight.</p>
        <ul>
          <li><span class="intro-highlight">Prayer of Healing</span> — Heals nearby allies in a solid chunk.</li>
          <li><span class="intro-highlight">Slow Totem</span> — Manual. Places an indestructible totem for 45 seconds. Enemies within 2 tiles of the totem are slowed, and the slow ends the moment they leave the area.</li>
          <li><span class="intro-highlight">Swiftness</span> — Boosts nearby allies' attack speed, helping your whole line push harder during key moments.</li>
          <li><span class="intro-highlight">Healing Aura</span> — Passive. At higher level, the Priest gains a healing aura that restores nearby allies every second, and it scales directly with her level.</li>
        </ul>
        <p>Use the Priest to support the Warrior, stabilize damaged heroes, and turn fights that should have collapsed into fights you still win.</p>
      `,
    },
    {
      title: 'Pirate – Bleed & Spread',
      body: `
        <p>The Pirate spreads pressure across the field. He rewards longer fights, packed lanes, and enemies that stay alive just long enough to suffer for it.</p>
        <ul>
          <li><span class="intro-highlight">Warning Shot</span> — Marks one enemy so it takes more damage from the rest of your team.</li>
          <li><span class="intro-highlight">Starboard Cannons</span> — Fires multiple cannonballs into a small splash zone, which is great for clustered lanes.</li>
          <li><span class="intro-highlight">Kraken</span> — Creates a damaging area that slows enemies hard over several seconds.</li>
          <li><span class="intro-highlight">Bloody Bastard</span> — Pirate kills steal extra Gold. Also, every 10th basic attack makes the target bleed, dealing percent max HP damage over time and adding a slow. The Pirate prefers targets that are not already bleeding so the effect spreads.</li>
        </ul>
        <p>The Pirate is at his best in longer waves where bleed, slows, and splash all have time to stack pressure across the board.</p>
      `,
    },
  ];

  function getActiveGuidePages() {
    return INTRO_PAGES;
  }

  function renderIntroPage() {
    if (!els.introBody) return;
    const pages = getActiveGuidePages();
    const safeIndex = Math.max(0, Math.min(pages.length - 1, game.introPageIndex));
    game.introPageIndex = safeIndex;
    const page = pages[safeIndex];
    if (els.introKicker) els.introKicker.textContent = 'DFK Defender Field Guide';
    if (els.introTitle) els.introTitle.textContent = 'Intro / Instructions';
    els.introBody.innerHTML = `<h3 class="intro-page-heading">${page.title}</h3>${page.body}`;
    if (els.introPageLabel) els.introPageLabel.textContent = `Page ${game.introPageIndex + 1} / ${pages.length}`;
    if (els.introPrevBtn) els.introPrevBtn.disabled = game.introPageIndex <= 0;
    if (els.introNextBtn) {
      els.introNextBtn.disabled = false;
      els.introNextBtn.textContent = game.introPageIndex >= pages.length - 1 ? 'Done' : 'Next →';
    }
  }

  function openIntroModal(pageIndex = game.introPageIndex || 0, setName = 'intro') {
    const pages = INTRO_PAGES;
    game.introSet = 'intro';
    game.introPageIndex = Math.max(0, Math.min(pages.length - 1, pageIndex));
    game.introOpen = true;
    if (game.statusOverlayTimeout) {
      clearTimeout(game.statusOverlayTimeout);
      game.statusOverlayTimeout = null;
    }
    syncStatusOverlayVisibility(true);
    if (els.bountyModal) {
      els.bountyModal.classList.add('hidden');
      els.bountyModal.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.add('intro-open');
    if (els.introModal) {
      els.introModal.classList.remove('hidden');
      els.introModal.setAttribute('aria-hidden', 'false');
    }
    renderIntroPage();
  }

  function closeIntroModal() {
    game.introOpen = false;
    document.body.classList.remove('intro-open');
    if (els.bountyModal) {
      els.bountyModal.classList.add('hidden');
      els.bountyModal.setAttribute('aria-hidden', 'true');
    }
    if (els.introModal) {
      els.introModal.classList.add('hidden');
      els.introModal.setAttribute('aria-hidden', 'true');
    }
    syncStatusOverlayVisibility(false);
    showStatusOverlay();
  }

  function maybeShowIntroOnOpen() {
    if (game.introAutoShown) return;
    game.introAutoShown = true;
    openIntroModal(0);
  }

  function updateTopbar() {
    const portalText = `${Math.max(0, Math.round(game.portalHp))}`;
    const goldText = formatJewel(game.jewel);
    els.portalHp.textContent = portalText;
    els.jewelCount.textContent = goldText;
    if (els.mobilePortalHp) els.mobilePortalHp.textContent = portalText;
    if (els.mobileGoldCount) els.mobileGoldCount.textContent = goldText;
    els.waveCount.textContent = `${game.waveNumber}`;
    els.patternLabel.textContent = game.nextWavePlan ? prettyPattern(game.nextWavePlan.pattern) : (game.runningWave ? prettyPattern(game.currentPattern || 'boss') : '--');
    els.mutationLabel.textContent = game.activeMutation ? game.activeMutation.name : (game.nextWavePlan?.mutation?.name || 'None');
    els.countdownLabel.textContent = game.runningWave ? 'Live' : (game.countdownMs > 0 ? `${Math.ceil(game.countdownMs / 1000)}s` : 'Ready');
    updatePremiumJewelInfo();
    syncMobileQuickActions();
  }

  function prettyPattern(pattern) {
    if (!pattern) return '--';
    return {
      uniform: 'Uniform',
      lane: 'Lane Pressure',
      burst: 'Burst Cluster',
      boss: 'Boss Wave',
    }[pattern] || pattern;
  }


  function getArcherDamageStepMultiplier(nextLevel) {
    if (nextLevel <= 1) return 1;
    const reductionSteps = Math.floor((nextLevel - 2) / 3);
    const baseIncrease = Math.max(0.05, 0.15 - (reductionSteps * 0.02));
    return 1 + (baseIncrease * REDUCED_DAMAGE_GROWTH_FACTOR);
  }

  function getArcherDamageMultiplierForLevel(level) {
    const safeLevel = Math.max(1, Number(level || 1));
    let multiplier = 1;
    for (let nextLevel = 2; nextLevel <= safeLevel; nextLevel += 1) {
      multiplier *= getArcherDamageStepMultiplier(nextLevel);
    }
    return multiplier;
  }

  function getArcherCooldownMultiplierForLevel(level) {
    const safeLevel = Math.max(1, Number(level || 1));
    const tierLevel = 1 + (Math.floor((safeLevel - 1) / 2) * 2);
    const speedSteps = Math.floor((tierLevel - 1) / 2);
    return Math.pow(1 + ARCHER_ATTACK_SPEED_GROWTH_PER_LEVEL, speedSteps);
  }

  function getPirateCooldownMultiplierForLevel(level) {
    const safeLevel = Math.max(1, Number(level || 1));
    const tierLevel = 1 + (Math.floor((safeLevel - 1) / 2) * 2);
    const speedSteps = Math.floor((tierLevel - 1) / 2);
    return Math.pow(1 + PIRATE_ATTACK_SPEED_GROWTH_PER_LEVEL, speedSteps);
  }

  function getWizardCooldownMultiplierForLevel(level) {
    const safeLevel = Math.max(1, Number(level || 1));
    const tierLevel = 1 + (Math.floor((safeLevel - 1) / 2) * 2);
    const speedSteps = Math.floor((tierLevel - 1) / 2);
    return Math.pow(1 + WIZARD_ATTACK_SPEED_GROWTH_PER_LEVEL, speedSteps);
  }

  function getBaseTowerStatsForLevel(type, level) {
    const template = TOWER_TEMPLATES[type];
    const safeLevel = Math.max(1, Number(level || 1));
    const hpMultiplier = type === 'archer'
      ? Math.pow(ARCHER_HP_LEVEL_MULTIPLIER, safeLevel - 1)
      : Math.pow(1.15, safeLevel - 1);
    const damageMultiplier = type === 'archer'
      ? getArcherDamageMultiplierForLevel(safeLevel)
      : ((type === 'pirate' || type === 'wizard') ? Math.pow(PIRATE_WIZARD_DAMAGE_GROWTH_PER_LEVEL, safeLevel - 1) : hpMultiplier);
    return {
      hp: template.hp * hpMultiplier,
      damage: template.damage * damageMultiplier,
      range: template.range,
    };
  }

  function normalizeArcherStats(tower, preserveHpRatio = false) {
    if (!tower || tower.type !== 'archer') return;
    const previousMaxHp = Number.isFinite(tower.maxHp) && tower.maxHp > 0 ? tower.maxHp : null;
    const previousHp = Number.isFinite(tower.hp) ? tower.hp : null;
    const hpRatio = preserveHpRatio && previousMaxHp ? Math.max(0, Math.min(1, previousHp / previousMaxHp)) : null;
    const base = getBaseTowerStatsForLevel('archer', tower.level || 1);
    tower.damage = tower.isSatellite ? base.damage * SATELLITE_DAMAGE_MULTIPLIER : base.damage;
    tower.range = base.range;
    const normalizedLevel = Math.max(1, Number(tower.level || 1));
    const speedTierLevel = 1 + (Math.floor((normalizedLevel - 1) / 2) * 2);
    tower.basicCooldown = (ARCHER_BASE_ATTACK_INTERVAL * 1000) / getArcherCooldownMultiplierForLevel(speedTierLevel);
    if (tower.isSatellite) {
      tower.maxHp = base.hp * 0.5;
    } else {
      tower.maxHp = base.hp;
    }
    if (!Number.isFinite(previousHp)) {
      tower.hp = tower.maxHp;
    } else if (hpRatio !== null) {
      tower.hp = tower.maxHp * hpRatio;
    } else {
      tower.hp = Math.min(previousHp, tower.maxHp);
    }
  }

  function formatJewel(value) {
    if (Math.abs(value - Math.round(value)) < 0.001) return `${Math.round(value)}`;
    return `${value.toFixed(1)}`;
  }

  function updateModeButtons() {
    const easyActive = game.timeScale > 1 && !!game.mobileMode;
    if (els.speedToggleBtn) {
      els.speedToggleBtn.classList.toggle('active', easyActive);
      els.speedToggleBtn.setAttribute('aria-pressed', easyActive ? 'true' : 'false');
      els.speedToggleBtn.textContent = '✨ Normal Mode' + (easyActive ? ' ON' : '');
      if (els.mobileFuncEasyBtn) els.mobileFuncEasyBtn.textContent = 'Easy Mode' + (easyActive ? ' ON' : '');
      els.speedToggleBtn.title = 'Normal Mode: 2× speed and auto-casting mobile play enabled.';
    }
    if (els.mobileModeBtn) {
      els.mobileModeBtn.classList.remove('active');
      els.mobileModeBtn.setAttribute('aria-pressed', 'false');
      els.mobileModeBtn.setAttribute('aria-disabled', 'true');
      els.mobileModeBtn.disabled = true;
      els.mobileModeBtn.textContent = '⚔️ Challenge Mode — Coming Soon';
      els.mobileModeBtn.title = 'Challenge Mode is coming soon.';
    }
    if (els.mobileFuncChallengeBtn) {
      els.mobileFuncChallengeBtn.disabled = true;
      els.mobileFuncChallengeBtn.setAttribute('aria-disabled', 'true');
      els.mobileFuncChallengeBtn.textContent = 'Challenge Mode — Coming Soon';
      els.mobileFuncChallengeBtn.title = 'Challenge Mode is coming soon.';
    }
  }

  function setPlayMode(mode, showNotice = true) {
    const easy = mode === 'easy';
    game.timeScale = easy ? 2 : 1;
    game.mobileMode = easy;
    updateModeButtons();
    if (showNotice) showBanner(easy ? 'Normal Mode enabled' : 'Challenge Mode enabled', 1400);
  }

  function setTimeScale(scale) {
    game.timeScale = scale;
    updateModeButtons();
  }

  function setMobileMode(enabled) {
    game.mobileMode = !!enabled;
    updateModeButtons();
  }
  function setRunLogCollapsed(collapsed) {
    const active = !!collapsed;
    document.body.classList.toggle('runlog-collapsed', active);
    if (els.runLogToggleBtn) {
      els.runLogToggleBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
      els.runLogToggleBtn.setAttribute('aria-label', active ? 'Open run log' : 'Collapse run log');
      els.runLogToggleBtn.setAttribute('title', active ? 'Open run log' : 'Collapse run log');
      els.runLogToggleBtn.textContent = active ? '◂' : '▸';
    }
    try { localStorage.setItem('dfkRunLogCollapsed', active ? '1' : '0'); } catch (e) {}
  }

  function initRunLogCollapse() {
    if (!els.runLogToggleBtn) return;
    let saved = false;
    try { saved = localStorage.getItem('dfkRunLogCollapsed') === '1'; } catch (e) {}
    setRunLogCollapsed(saved);
    window.DFKToggleRunLog = function(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      setRunLogCollapsed(!document.body.classList.contains('runlog-collapsed'));
      return false;
    };
    els.runLogToggleBtn.onclick = window.DFKToggleRunLog;
  }

  function updatePauseButton() {

    if (!els.pauseBtn) return;
    const active = !!game.paused;
    els.pauseBtn.classList.toggle('active', active);
    els.pauseBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    els.pauseBtn.textContent = active ? '⏸ Paused' : '⏸ Pause';
    if (els.mobileFuncPauseBtn) els.mobileFuncPauseBtn.textContent = active ? 'Resume' : 'Pause';
    els.pauseBtn.title = active ? 'Resume all activity' : 'Freeze all activity';
  }

  function setPaused(enabled) {
    game.paused = !!enabled;
    updatePauseButton();
    if (game.paused) {
      showBanner('Game paused', 1200);
      markProgress('Game paused.');
    } else {
      game.lastTick = now();
      game.diagnostics.lastProgressAt = now();
      showBanner('Game resumed', 1200);
      markProgress('Game resumed.');
    }
  }

  function getSatelliteWavesSurvived(tower) {
    if (!tower || !tower.isSatellite || tower.type !== 'archer') return 0;
    const summonedAtWave = Number.isFinite(tower.summonedAtWave) ? tower.summonedAtWave : Number(game.waveNumber || 0);
    return Math.max(0, Number(game.waveNumber || 0) - summonedAtWave);
  }

  function getSatelliteVisualOpacity(tower) {
    if (!tower || !tower.isSatellite || tower.type !== 'archer') return 1;
    const wavesSurvived = getSatelliteWavesSurvived(tower);
    if (wavesSurvived >= SATELLITE_FADE_STAGE_TWO_WAVES) return 0.5;
    if (wavesSurvived >= SATELLITE_FADE_STAGE_ONE_WAVES) return 0.75;
    return 1;
  }

  function removeTower(tower, reason = '') {
    if (!tower) return;
    if (tower.isSatellite && tower.type === 'archer') {
      createExplosionEffect(tower.x, tower.y, 'archer', 0.9, 3000, GREEN_FIRE_GIF_PATH);
      createTileFlashArea([{ x: tower.x, y: tower.y }], 'archer');
    }
    const tile = tileAt(tower.x, tower.y);
    if (tile) tile.towerId = null;
    game.towers = game.towers.filter(t => t.id !== tower.id);
    if (game.selectedId === tower.id) game.selectedId = null;
    if (reason) {
      markProgress(reason);
      log(reason);
    }
  }

  function dissipateExpiredSatelliteArchers() {
    const expiredSatellites = game.towers.filter(t => t.isSatellite && t.type === 'archer' && getSatelliteWavesSurvived(t) >= SATELLITE_DISSIPATE_AFTER_WAVES);
    for (const satellite of expiredSatellites) {
      removeTower(satellite, `${satellite.name} dissipated after 9 cleared waves.`);
    }
    if (expiredSatellites.length) {
      showBanner(`Eagle Nest: ${expiredSatellites.length} Satellite Archer${expiredSatellites.length === 1 ? '' : 's'} dissipated.`, 2600);
    }
  }

  function render() {
    for (const tower of game.towers) normalizeArcherStats(tower);
    renderGrid();
    renderSelection();
    renderHirePanel();
    renderRelics();
    updateTopbar();
      updateMobileBoardFit();
    updateMobileBarToggle();
    updateMobileInstallPrompt();
    renderMobileAbilityDock();
  }

  function renderGrid() {
    const selectedTower = getSelectedTower();
    const moveTargets = selectedTower && game.movingTowerId === selectedTower.id ? getMoveTargetsForTower(selectedTower) : [];
    const rangeTiles = selectedTower ? getSelectedRangeTiles(selectedTower) : [];

    for (const tile of game.grid) {
      tile.el.className = 'tile';
      tile.el.innerHTML = '';
      if (tile.type === 'spawn') {
        tile.el.classList.add('spawn');
      }
      if (tile.portal) tile.el.classList.add('portal');
      if (tile.obstacle === 'random') tile.el.classList.add('random-obstacle');
      if (tile.obstacle === 'player') {
        tile.el.classList.add('player-obstacle');
        if (!tile.treeVariant) tile.treeVariant = getRandomTreeVariant();
        tile.el.style.setProperty('--tree-img', `url(assets/${tile.treeVariant}.png)`);
      } else {
        tile.el.style.removeProperty('--tree-img');
      }
      if (tile.pathPreview === 'valid') tile.el.classList.add('preview-valid');
      if (tile.pathPreview === 'invalid') tile.el.classList.add('preview-invalid');
      if (tile.hitFlash && tile.hitFlash.until <= now()) tile.hitFlash = null;
      if (tile.hitFlash) tile.el.classList.add(`hit-${tile.hitFlash.colorKey}`);
      if (selectedTower && selectedTower.x === tile.x && selectedTower.y === tile.y) tile.el.classList.add('selected');
      if (rangeTiles.some(p => p.x === tile.x && p.y === tile.y)) tile.el.classList.add('range-tile', `range-${selectedTower.type}`);
      if (moveTargets.some(p => p.x === tile.x && p.y === tile.y)) tile.el.classList.add('move-target');
      const tower = tile.towerId ? game.towers.find(t => t.id === tile.towerId) : null;
      if (tower) tile.el.classList.add(`tile-hero-${tower.type}`);
      const enemiesHere = game.enemies.filter(e => e.x === tile.x && e.y === tile.y).slice(0, 3);

      if (tower) {
        const small = document.createElement('div');
        small.className = 'tile-small';
        small.textContent = `${tower.level}`;
        tile.el.appendChild(small);

        if (tower.isSatellite && tower.type === 'archer') {
          const wavesLeftBadge = document.createElement('div');
          wavesLeftBadge.className = 'tile-small tile-small-right';
          const wavesLeft = Math.max(0, SATELLITE_DISSIPATE_AFTER_WAVES - getSatelliteWavesSurvived(tower));
          wavesLeftBadge.textContent = `${wavesLeft}`;
          wavesLeftBadge.title = `${wavesLeft} wave${wavesLeft === 1 ? '' : 's'} left`;
          tile.el.appendChild(wavesLeftBadge);
        }

        const portrait = document.createElement('img');
        portrait.className = 'tile-hero-portrait';
        portrait.alt = tower.name;
        portrait.draggable = false;
        portrait.src = HERO_TILE_IMAGES[tower.type] || '';
        const satelliteOpacity = getSatelliteVisualOpacity(tower);
        portrait.style.opacity = `${satelliteOpacity}`;
        if (isStatueTower(tower)) {
          portrait.classList.add('tile-statue-hero');
        } else if (tower.isSatellite && tower.type === 'archer') {
          portrait.classList.add('tile-ethereal-hero');
          portrait.style.setProperty('--ethereal-glow', 'rgba(70, 255, 110, 1)');
        }
        tile.el.appendChild(portrait);

        const heroLabel = document.createElement('div');
        heroLabel.className = 'tile-hero-label';
        heroLabel.textContent = isStatueTower(tower) ? 'STATUE' : (HERO_TILE_LABELS[tower.type] || tower.type.toUpperCase());
        heroLabel.style.opacity = `${satelliteOpacity}`;
        if (isStatueTower(tower)) {
          heroLabel.classList.add('tile-statue-label');
        } else if (tower.isSatellite && tower.type === 'archer') {
          heroLabel.classList.add('tile-ethereal-label');
          heroLabel.style.setProperty('--ethereal-glow', 'rgba(70, 255, 110, 0.98)');
        }
        tile.el.appendChild(heroLabel);

        const hpBar = document.createElement('div');
        hpBar.className = isStatueTower(tower) ? 'hp-bar statue-hp-bar' : 'hp-bar';
        const hpFill = document.createElement('div');
        hpFill.className = 'hp-fill';
        hpFill.style.width = `${Math.max(0, (tower.hp / tower.maxHp) * 100)}%`;
        hpBar.appendChild(hpFill);
        tile.el.appendChild(hpBar);

        if (!isStatueTower(tower)) {
          const cdBar = document.createElement('div');
          cdBar.className = 'cooldown-bar';
          const cdFill = document.createElement('div');
          cdFill.className = 'cooldown-fill';
          const ratio = tower.basicCooldown > 0 ? 1 - clamp(tower.attackCooldownMs / tower.basicCooldown, 0, 1) : 1;
          cdFill.style.width = `${ratio * 100}%`;
          cdBar.appendChild(cdFill);
          tile.el.appendChild(cdBar);
        }

        const hover = document.createElement('div');
        hover.className = 'tile-hover-card';

        const hoverTitle = document.createElement('div');
        hoverTitle.className = 'tile-hover-title';
        hoverTitle.textContent = tower.name;
        hover.appendChild(hoverTitle);

        if (isStatueTower(tower)) {
          const statueNote = document.createElement('div');
          statueNote.className = 'tile-hover-meta';
          statueNote.textContent = 'Statue • Blocks enemies • Cannot move • Cannot be healed';
          hover.appendChild(statueNote);
        } else if (tower.isSatellite && tower.type === 'archer') {
          const etherealNote = document.createElement('div');
          etherealNote.className = 'tile-hover-meta';
          const wavesLeft = Math.max(0, SATELLITE_DISSIPATE_AFTER_WAVES - getSatelliteWavesSurvived(tower));
          etherealNote.textContent = `Ethereal • ${wavesLeft} wave${wavesLeft === 1 ? '' : 's'} left`;
          hover.appendChild(etherealNote);
        }

        const hoverSkills = document.createElement('div');
        hoverSkills.className = 'tile-hover-skills';
        for (const [idx, ability] of tower.abilities.entries()) {
          const locked = !isAbilityUnlocked(tower, ability.key);
          const unlockLevel = getAbilityUnlockLevel(tower, ability.key);
          const remain = Math.max(0, (tower.abilityReadyAt[ability.key] - now()) / 1000);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `tile-hover-skill-btn ${locked ? 'locked' : ''}`;
          btn.dataset.towerId = tower.id;
          btn.dataset.abilityKey = ability.key;
          const compact = `${idx + 1}. ${ability.name}`;
          const isPassive = !!ability.passive;
          btn.textContent = locked ? `${compact} (L${unlockLevel})` : (isPassive ? `${compact} (Passive)` : (remain > 0 ? `${compact} (${remain.toFixed(1)}s)` : compact));
          btn.disabled = isPassive || locked || remain > 0 || game.phase === SETUP_PHASES.GAME_OVER || (tower.type === 'priest' && game.runningWave === false && !['swiftness'].includes(ability.key));
          btn.title = getAbilityDescription(tower, ability.key);
          btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            game.selectedTowerId = tower.id;
            renderSelection();
            castAbility(tower, ability.key);
          });
          hoverSkills.appendChild(btn);
        }
        hover.appendChild(hoverSkills);
        tile.el.appendChild(hover);
      }


      if (tile.obstacle && !tower) {
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = '';
        tile.el.appendChild(label);
      }

      if (tile.type === 'spawn' && !tile.portal && !tile.obstacle) {
      }

      if (tile.hitFlash) {
        const flash = document.createElement('div');
        flash.className = `hit-flash hit-flash-${tile.hitFlash.colorKey}`;
        tile.el.appendChild(flash);
        if (tile.hitFlash.text) {
          const txt = document.createElement('div');
          txt.className = 'hit-text';
          txt.textContent = tile.hitFlash.text;
          tile.el.appendChild(txt);
        }
      }

      if (enemiesHere.length) {
        if (game.enemies.some(e => e.x === tile.x && e.y === tile.y && e.attacking)) tile.el.classList.add('attacking');
      }
    }
    renderPortalArt();
  }

  function renderPortalArt() {
    if (!els.portalArt) {
      const img = document.createElement('img');
      img.className = 'portal-art';
      img.alt = 'Portal';
      img.src = 'portal-trans.png';
      img.draggable = false;
      els.grid.appendChild(img);
      els.portalArt = img;
    }
    if (!game.portal) {
      els.portalArt.classList.add('hidden');
      return;
    }

    const topLeftTile = tileAt(game.portal.x, game.portal.y);
    const bottomRightTile = tileAt(game.portal.x + 1, game.portal.y + 1);
    if (!topLeftTile || !bottomRightTile || !topLeftTile.el || !bottomRightTile.el) {
      els.portalArt.classList.add('hidden');
      return;
    }

    const left = topLeftTile.el.offsetLeft;
    const top = topLeftTile.el.offsetTop;
    const width = (bottomRightTile.el.offsetLeft + bottomRightTile.el.offsetWidth) - left;
    const height = (bottomRightTile.el.offsetTop + bottomRightTile.el.offsetHeight) - top;

    const insetX = Math.max(2, width * 0.02);
    const insetTop = Math.max(2, height * 0.08);
    const insetBottom = Math.max(2, height * 0.02);

    els.portalArt.style.left = `${left + insetX}px`;
    els.portalArt.style.top = `${top + insetTop}px`;
    els.portalArt.style.width = `${Math.max(8, width - insetX * 2)}px`;
    els.portalArt.style.height = `${Math.max(8, height - insetTop - insetBottom)}px`;
    els.portalArt.classList.remove('hidden');
  }

  function ensureAbilityInfoPopup() {
    if (els.abilityInfoPopup) return els.abilityInfoPopup;
    const host = document.querySelector('.right-panel');
    if (!host) return null;
    const popup = document.createElement('div');
    popup.id = 'abilityInfoPopup';
    popup.className = 'ability-info-popup hidden';
    popup.addEventListener('mouseenter', () => {
      game.infoPopupHover = true;
      if (game.infoPopupHideTimer) {
        clearTimeout(game.infoPopupHideTimer);
        game.infoPopupHideTimer = null;
      }
    });
    popup.addEventListener('mouseleave', () => {
      game.infoPopupHover = false;
      if (!game.infoPopupPinned) scheduleAbilityInfoHide();
    });
    host.appendChild(popup);
    els.abilityInfoPopup = popup;
    return popup;
  }

  function renderAbilityInfoPopup(text) {
    const popup = ensureAbilityInfoPopup();
    if (!popup) return;
    popup.innerHTML = `<div class="ability-banner">${text}</div>`;
  }

  function scheduleAbilityInfoHide(delay = 120) {
    if (game.infoPopupHideTimer) clearTimeout(game.infoPopupHideTimer);
    game.infoPopupHideTimer = setTimeout(() => {
      if (!game.infoPopupPinned && !game.infoPopupHover) hideAbilityInfo();
    }, delay);
  }

  function hideAbilityInfo(force = false) {
    const popup = ensureAbilityInfoPopup();
    if (!popup) return;
    if (!force && (game.infoPopupPinned || game.infoPopupHover)) return;
    popup.classList.add('hidden');
    popup.innerHTML = '';
  }

  function showAbilityInfo(text, options = {}) {
    const popup = ensureAbilityInfoPopup();
    if (!popup) return;
    if (game.infoPopupHideTimer) {
      clearTimeout(game.infoPopupHideTimer);
      game.infoPopupHideTimer = null;
    }
    if (options.pinned !== undefined) game.infoPopupPinned = !!options.pinned;
    popup.dataset.text = text;
    renderAbilityInfoPopup(text);
    popup.classList.remove('hidden');
  }


  let deferredInstallPrompt = null;

  function setViewportUnits() {
    const viewHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const vh = Math.max(1, viewHeight * 0.01);
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  }

  function nudgeMobileChrome() {
    if (!isLandscapeMobileUi()) return;
    window.setTimeout(() => {
      try { window.scrollTo(0, 1); } catch (error) {}
    }, 120);
  }

  function isStandaloneDisplay() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIosHomeScreenFlow() {
    const ua = String(navigator.userAgent || '');
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    return isIOS && !window.matchMedia('(display-mode: standalone)').matches && window.navigator.standalone !== true;
  }

  function updateMobileInstallPrompt() {
    if (!els.mobileInstallPrompt || !els.mobileInstallBtn || !els.mobileInstallText) return;
    const canShow = isLandscapeMobileUi() && !game.mobileInstallDismissed && !isStandaloneDisplay();
    if (!canShow) {
      els.mobileInstallPrompt.classList.add('hidden');
      return;
    }
    els.mobileInstallPrompt.classList.remove('hidden');
    if (deferredInstallPrompt) {
      els.mobileInstallText.textContent = 'Add this game to your home screen for the best full-screen mobile experience.';
      els.mobileInstallBtn.textContent = 'Add';
      return;
    }
    if (isIosHomeScreenFlow()) {
      els.mobileInstallText.textContent = 'Best on iPhone: add this game to your home screen for full-screen play.';
      els.mobileInstallBtn.textContent = 'How to Add';
      return;
    }
    els.mobileInstallText.textContent = 'Best experience: install this game to your home screen when your browser allows it.';
    els.mobileInstallBtn.textContent = 'Install Tips';
  }

  async function handleMobileInstallAction() {
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      promptEvent.prompt();
      try { await promptEvent.userChoice; } catch (error) {}
      updateMobileInstallPrompt();
      return;
    }
    if (isIosHomeScreenFlow()) {
      showBanner('Safari: tap Share, then Add to Home Screen.', 3200);
      return;
    }
    showBanner('Install this from your browser menu when Add to Home Screen is available.', 3200);
  }



  function updateMobileBoardFit() {
    if (!isLandscapeMobileUi() || !els.grid) return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    const vw = Math.max(320, Math.round(vv ? vv.width : window.innerWidth || 0));
    const vh = Math.max(200, Math.round(vv ? vv.height : window.innerHeight || 0));
    const gap = 2;
    const safeLeft = 8;
    const safeRight = 8;
    const safeTop = 8;
    const safeBottom = 8;
    const railW = (els.mobileFlyoutStack && els.mobileFlyoutStack.offsetWidth) ? els.mobileFlyoutStack.offsetWidth : 64;
    const boardLeft = safeLeft + railW + 10;
    const boardRight = safeRight + 12;
    const bannerVisible = els.banner && !els.banner.classList.contains('hidden');
    const bannerH = isLandscapeMobileUi() ? 0 : (bannerVisible ? (els.banner.offsetHeight + 10) : 0);
    const bottomBarVisible = els.mobileBottomBar && getComputedStyle(els.mobileBottomBar).display !== 'none';
    const bottomBarH = bottomBarVisible ? Math.max(46, els.mobileBottomBar.offsetHeight) : 0;
    const statusVisible = els.statusOverlay && !els.statusOverlay.classList.contains('hidden');
    const statusH = statusVisible ? Math.max(36, els.statusOverlay.offsetHeight) : 0;
    const topOffset = safeTop + bannerH;
    const bottomOffset = safeBottom + 8;
    const boardFitFudgeX = isLandscapeMobileUi() ? 28 : 16;
    const boardFitFudgeY = isLandscapeMobileUi() ? 18 : 16;
    const availableW = Math.max(232, vw - boardLeft - boardRight - boardFitFudgeX);
    const availableH = Math.max(112, vh - topOffset - bottomOffset - Math.max(bottomBarH, 0) - boardFitFudgeY);
    const sizeFromW = Math.floor((availableW - (13 * gap)) / 14);
    const sizeFromH = Math.floor((availableH - (5 * gap)) / 6);
    const tileSize = Math.max(22, Math.min(72, sizeFromW, sizeFromH));
    const boardWidth = tileSize * 14 + gap * 13;
    const boardHeight = tileSize * 6 + gap * 5;

    root.style.setProperty('--mobile-safe-left', `${safeLeft}px`);
    root.style.setProperty('--mobile-safe-right', `${safeRight}px`);
    root.style.setProperty('--mobile-safe-top', `${safeTop}px`);
    root.style.setProperty('--mobile-safe-bottom', `${safeBottom}px`);
    root.style.setProperty('--mobile-rail-w', `${railW}px`);
    root.style.setProperty('--mobile-board-left', `${boardLeft}px`);
    root.style.setProperty('--mobile-board-right', `${boardRight}px`);
    root.style.setProperty('--mobile-top-offset', `${topOffset}px`);
    root.style.setProperty('--mobile-bottom-offset', `${bottomOffset}px`);
    root.style.setProperty('--mobile-bottom-reserve', `${bottomBarH}px`);
    root.style.setProperty('--mobile-status-reserve', `0px`);
    root.style.setProperty('--mobile-status-height', `${statusH}px`);
    root.style.setProperty('--tile-gap', `${gap}px`);
    root.style.setProperty('--tile-size', `${tileSize}px`);
    root.style.setProperty('--board-width', `${boardWidth}px`);
    root.style.setProperty('--board-height', `${boardHeight}px`);
  }
  function isLandscapeMobileUi() {
    return window.matchMedia('(max-width: 1024px) and (orientation: landscape)').matches;
  }

  function updateMobileBarToggle() {
    if (!els.mobileHud) return;
    els.mobileHud.classList.toggle('bar-collapsed', !!game.mobileBarCollapsed);
    if (!els.mobileBarToggleBtn) return;
    els.mobileBarToggleBtn.setAttribute('aria-pressed', game.mobileBarCollapsed ? 'true' : 'false');
    els.mobileBarToggleBtn.setAttribute('aria-label', game.mobileBarCollapsed ? 'Show mobile controls' : 'Hide mobile controls');
  }

  function toggleMobileBarCollapsed() {
    if (!isLandscapeMobileUi()) return;
    game.mobileBarCollapsed = !game.mobileBarCollapsed;
    if (game.mobileBarCollapsed) closeMobileMenus();
    updateMobileBarToggle();
  }

  function updateMobileLeftRail() {
    if (!els.mobileLeftRail || !els.mobileSideMenuToggleBtn) return;
    const active = isLandscapeMobileUi();
    els.mobileSideMenuToggleBtn.classList.toggle('hidden', !active);
    if (!active) {
      els.mobileLeftRail.classList.remove('collapsed');
      els.mobileSideMenuToggleBtn.setAttribute('aria-pressed', 'false');
      els.mobileSideMenuToggleBtn.textContent = '›';
      return;
    }
    els.mobileLeftRail.classList.toggle('collapsed', !!game.mobileLeftRailCollapsed);
    els.mobileSideMenuToggleBtn.setAttribute('aria-pressed', game.mobileLeftRailCollapsed ? 'true' : 'false');
    els.mobileSideMenuToggleBtn.setAttribute('aria-label', game.mobileLeftRailCollapsed ? 'Open side menu' : 'Close side menu');
    els.mobileSideMenuToggleBtn.textContent = game.mobileLeftRailCollapsed ? '›' : '‹';
  }

  function toggleMobileLeftRail() {
    if (!isLandscapeMobileUi()) return;
    game.mobileLeftRailCollapsed = !game.mobileLeftRailCollapsed;
    updateMobileLeftRail();
  }

  function updateMobileRightRail() {
    if (!els.mobileRightRail || !els.mobileRightMenuToggleBtn) return;
    const active = isLandscapeMobileUi();
    els.mobileRightMenuToggleBtn.classList.toggle('hidden', !active);
    if (!active) {
      els.mobileRightRail.classList.remove('collapsed');
      els.mobileRightMenuToggleBtn.setAttribute('aria-pressed', 'false');
      els.mobileRightMenuToggleBtn.textContent = '‹';
      return;
    }
    els.mobileRightRail.classList.toggle('collapsed', !!game.mobileRightRailCollapsed);
    els.mobileRightMenuToggleBtn.setAttribute('aria-pressed', game.mobileRightRailCollapsed ? 'true' : 'false');
    els.mobileRightMenuToggleBtn.setAttribute('aria-label', game.mobileRightRailCollapsed ? 'Open battle info' : 'Close battle info');
    els.mobileRightMenuToggleBtn.textContent = game.mobileRightRailCollapsed ? '‹' : '›';
  }

  function toggleMobileRightRail() {
    if (!isLandscapeMobileUi()) return;
    game.mobileRightRailCollapsed = !game.mobileRightRailCollapsed;
    updateMobileRightRail();
  }

  function updateMobileHireNotice(canHireNow) {
    const show = !!canHireNow && isLandscapeMobileUi();
    els.mobileHireMenuBtn?.classList.toggle('has-notice', show);
    els.mobileFuncMenuBtn?.classList.remove('has-notice');
    els.mobileBarToggleBtn?.classList.remove('has-notice');
    els.mobileBarToggleNotice?.classList.add('hidden');
  }

  function closeMobileMenus() {
    const map = [
      ['func', els.mobileFuncMenu, els.mobileFuncMenuBtn],
      ['hero', els.mobileHeroMenu, els.mobileHeroMenuBtn],
      ['hire', els.mobileHireMenu, els.mobileHireMenuBtn],
    ];
    map.forEach(([, panel, btn]) => {
      panel?.classList.add('hidden');
      panel?.setAttribute('aria-hidden', 'true');
      btn?.classList.remove('active');
      btn?.setAttribute('aria-expanded', 'false');
    });
    els.mobileMenuOverlay?.classList.add('hidden');
    els.mobileMenuShell?.classList.add('hidden');
    els.mobileMenuShell?.setAttribute('aria-hidden', 'true');
    game.mobileOpenMenu = null;
  }

  function toggleMobileMenu(name) {
    if (!isLandscapeMobileUi()) return;
    if (game.mobileBarCollapsed) {
      game.mobileBarCollapsed = false;
      updateMobileBarToggle();
    }
    if (game.mobileOpenMenu === name) {
      closeMobileMenus();
      return;
    }
    const map = {
      func: [els.mobileFuncMenu, els.mobileFuncMenuBtn],
      hero: [els.mobileHeroMenu, els.mobileHeroMenuBtn],
      hire: [els.mobileHireMenu, els.mobileHireMenuBtn],
    };
    closeMobileMenus();
    const pair = map[name];
    if (!pair) return;
    const [panel, btn] = pair;
    els.mobileMenuOverlay?.classList.remove('hidden');
    els.mobileMenuShell?.classList.remove('hidden');
    els.mobileMenuShell?.setAttribute('aria-hidden', 'false');
    panel?.classList.remove('hidden');
    panel?.setAttribute('aria-hidden', 'false');
    btn?.classList.add('active');
    btn?.setAttribute('aria-expanded', 'true');
    game.mobileOpenMenu = name;
  }

  function setPanelCollapsed(panelEl, toggleEl, collapsed) {
    if (!panelEl || !toggleEl) return;
    panelEl.classList.toggle('collapsed', !!collapsed);
    toggleEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }

  function enforceMobileSidePanelRule(preferred) {
    if (!isLandscapeMobileUi()) return;
    if (preferred === 'bank') {
      setPanelCollapsed(els.bankPanel, els.bankPanelToggle, false);
      setPanelCollapsed(els.walletPanel, els.walletPanelToggle, true);
      return;
    }
    if (preferred === 'profile') {
      setPanelCollapsed(els.bankPanel, els.bankPanelToggle, true);
      setPanelCollapsed(els.walletPanel, els.walletPanelToggle, false);
      return;
    }
    setPanelCollapsed(els.bankPanel, els.bankPanelToggle, true);
    setPanelCollapsed(els.walletPanel, els.walletPanelToggle, true);
  }

  function enforceMobileStatsPanelRule() {
    if (!els.mobileStatsPanel || !els.mobileStatsPanelToggle) return;
    setPanelCollapsed(els.mobileStatsPanel, els.mobileStatsPanelToggle, !isLandscapeMobileUi());
  }

  function syncMobileHosts() {
    if (!els.mobileHeroHost || !els.mobileHireHost || !els.selectedInfo || !els.hirePanel) return;
    const actionGroup = els.upgradeBtn?.closest('.action-group');
    const leftPanel = document.querySelector('.left-panel');
    const rightPanel = document.querySelector('.right-panel');
    const hireSection = document.querySelector('.hire-section');
    const leftPanelLog = els.log?.closest('.left-panel');
    const footerTopbarHome = document.querySelector('.controls-row.action-row');
    if (isLandscapeMobileUi()) {
      els.mobileHud?.classList.remove('hidden');
      els.mobileHud?.setAttribute('aria-hidden', 'false');
      document.getElementById('mobileFlyoutStack')?.setAttribute('aria-hidden', 'false');
      els.mobileQuickRail?.setAttribute('aria-hidden', 'false');
      els.mobileLeftRail?.setAttribute('aria-hidden', 'true');
      els.mobileRightRail?.setAttribute('aria-hidden', 'true');
      if (els.selectedInfo.parentElement !== els.mobileHeroHost) els.mobileHeroHost.appendChild(els.selectedInfo);
      if (actionGroup && actionGroup.parentElement !== els.mobileHeroHost) els.mobileHeroHost.appendChild(actionGroup);
      if (els.hirePanel.parentElement !== els.mobileHireHost) els.mobileHireHost.appendChild(els.hirePanel);
      if (els.bankPanel && els.mobileBankHost /* disabled */ && els.bankPanel.parentElement !== els.mobileBankHost /* disabled */) els.mobileBankHost /* disabled */.appendChild(els.bankPanel);
      if (els.walletPanel && els.mobileProfileHost && els.walletPanel.parentElement !== els.mobileProfileHost) els.mobileProfileHost.appendChild(els.walletPanel);
      const footerTopbar = document.querySelector('.footer-topbar');
      if (footerTopbar && els.mobileStatsHost && footerTopbar.parentElement !== els.mobileStatsHost) els.mobileStatsHost.appendChild(footerTopbar);
      enforceMobileSidePanelRule();
      enforceMobileStatsPanelRule();
      updateMobileBarToggle();
      updateMobileLeftRail();
      updateMobileRightRail();
    } else {
      game.mobileBarCollapsed = false;
      els.mobileHud?.classList.add('hidden');
      els.mobileHud?.setAttribute('aria-hidden', 'true');
      document.getElementById('mobileFlyoutStack')?.setAttribute('aria-hidden', 'true');
      els.mobileQuickRail?.setAttribute('aria-hidden', 'true');
      els.mobileLeftRail?.setAttribute('aria-hidden', 'true');
      els.mobileRightRail?.setAttribute('aria-hidden', 'true');
      game.mobileRightRailCollapsed = true;
      if (rightPanel && els.selectedInfo.parentElement !== rightPanel) {
        rightPanel.insertBefore(els.selectedInfo, rightPanel.firstChild);
      }
      if (rightPanel && actionGroup && actionGroup.parentElement !== rightPanel) {
        rightPanel.insertBefore(actionGroup, els.abilitiesPanel);
      }
      if (hireSection && els.hirePanel.parentElement !== hireSection) {
        hireSection.appendChild(els.hirePanel);
      }
      if (leftPanel && els.walletPanel && els.walletPanel.parentElement !== leftPanel) {
        leftPanel.insertBefore(els.walletPanel, leftPanel.children[1] || null);
      }
      if (leftPanel && els.bankPanel && els.bankPanel.parentElement !== leftPanel) {
        leftPanel.appendChild(els.bankPanel);
      }
      const footerTopbar = document.querySelector('.footer-topbar');
      if (footerTopbar && footerTopbarHome && footerTopbar.parentElement !== footerTopbarHome) {
        footerTopbarHome.appendChild(footerTopbar);
      }
      setPanelCollapsed(els.bankPanel, els.bankPanelToggle, true);
      enforceMobileStatsPanelRule();
      game.mobileLeftRailCollapsed = true;
      updateMobileLeftRail();
      updateMobileRightRail();
      closeMobileMenus();
    }
  }

  function bindMenuAutoClose(scope) {
    if (!scope || scope.dataset.mobileAutocloseBound === 'true') return;
    scope.addEventListener('click', (event) => {
      const clickedButton = event.target.closest('button');
      if (!clickedButton) return;
      if (clickedButton.id === 'mobileFuncMenuBtn' || clickedButton.id === 'mobileHeroMenuBtn' || clickedButton.id === 'mobileHireMenuBtn') return;
      window.setTimeout(() => {
        if (isLandscapeMobileUi()) closeMobileMenus();
      }, 0);
    });
    scope.dataset.mobileAutocloseBound = 'true';
  }

  function renderMobileAbilityDock() {
    const buttons = [els.mobileAbilityBtn1, els.mobileAbilityBtn2, els.mobileAbilityBtn3, els.mobileAbilityBtn4];
    const tower = getSelectedTower();
    normalizeArcherStats(tower);
    const abilities = tower ? tower.abilities.filter(ability => !ability.passive && !ability.manualOnly).slice(0, 4) : [];
    buttons.forEach((btn, index) => {
      if (!btn) return;
      const ability = abilities[index];
      if (!ability || !tower) {
        btn.innerHTML = `<span class="ability-name">A${index + 1}</span><span class="ability-meta">Select hero</span>`;
        btn.title = 'Select a hero first';
        btn.disabled = true;
        btn.onclick = null;
        return;
      }
      const remain = Math.max(0, (tower.abilityReadyAt[ability.key] - now()) / 1000);
      const locked = !isAbilityUnlocked(tower, ability.key);
      const unlockLevel = getAbilityUnlockLevel(tower, ability.key);
      const disabled = locked || remain > 0 || game.phase === SETUP_PHASES.GAME_OVER || (tower.type === 'priest' && game.runningWave === false && !['swiftness'].includes(ability.key));
      const meta = locked ? `Unlocks L${unlockLevel}` : (remain > 0 ? `${remain.toFixed(1)}s` : 'Ready');
      btn.innerHTML = `<span class="ability-name">${ability.name}</span><span class="ability-meta">${meta}</span>`;
      btn.title = locked ? `${ability.name} unlocks at level ${unlockLevel}` : (remain > 0 ? `${ability.name} (${remain.toFixed(1)}s)` : ability.name);
      btn.disabled = disabled;
      btn.onclick = disabled ? null : () => castAbility(tower, ability.key);
    });
    syncMobileQuickActions();
  }

  function syncMobileQuickActions() {
    const tower = getSelectedTower();
    const satelliteTowerReady = !!tower && !tower.isSatellite && (tower.type === 'warrior' || tower.type === 'archer') && !!getPassiveEntries(tower).find(entry => !entry.locked && (entry.key === 'new_blood' || entry.key === 'eagle_nest')) && (tower.satelliteCharges || 0) > 0 && game.phase !== SETUP_PHASES.GAME_OVER;
    if (els.mobileQuickUpgradeBtn) {
      els.mobileQuickUpgradeBtn.disabled = !tower || els.upgradeBtn.disabled;
      els.mobileQuickUpgradeBtn.classList.toggle('is-live', !!tower && !els.upgradeBtn.disabled);
    }
    if (els.mobileQuickMoveBtn) {
      els.mobileQuickMoveBtn.disabled = !tower || els.moveBtn.disabled;
      els.mobileQuickMoveBtn.classList.toggle('is-live', !!tower && !els.moveBtn.disabled);
    }
    if (els.mobileQuickStartBtn) {
      const canStart = !!els.startWaveBtn && !els.startWaveBtn.disabled && !els.startWaveBtn.classList.contains('hidden');
      els.mobileQuickStartBtn.disabled = !canStart;
      els.mobileQuickStartBtn.classList.toggle('is-live', canStart);
      els.mobileQuickStartBtn.textContent = game.runningWave ? 'Live' : 'Start';
    }
    if (els.mobileQuickSatelliteBtn) {
      const charges = tower && !tower.isSatellite ? (tower.satelliteCharges || 0) : 0;
      const satelliteLabel = tower?.type === 'archer' ? 'Sat Arc' : 'Statue';
      els.mobileQuickSatelliteBtn.disabled = !satelliteTowerReady;
      els.mobileQuickSatelliteBtn.classList.toggle('is-live', satelliteTowerReady);
      els.mobileQuickSatelliteBtn.textContent = satelliteTowerReady ? `${satelliteLabel} ${charges}` : 'Sat';
      els.mobileQuickSatelliteBtn.title = satelliteTowerReady ? `Place satellite (${charges} ready)` : 'Select a warrior or archer with a satellite charge';
    }
  }

  function renderSelection() {
    const tower = getSelectedTower();
    game.renderedSelectionTowerId = tower ? tower.id : null;
    if (!tower) {
      game.infoPopupPinned = false;
      hideAbilityInfo(true);
      els.selectedInfo.textContent = 'Nothing selected.';
      els.abilitiesPanel.innerHTML = '<div class="muted">Select a tower to level up, move, or cast abilities.</div>';
      els.upgradeBtn.disabled = true;
      els.moveBtn.disabled = true;
      els.rebuildBarriersBtn.disabled = !canStartBarrierRebuild();
      els.rebuildBarriersBtn.textContent = `Rebuild Barriers (${formatJewel(BARRIER_REBUILD_COST)} Gold)`;
      renderMobileAbilityDock();
      return;
    }
    const nextCost = getUpgradeCost(tower.level + 1, tower);
    const satelliteWavesRemaining = tower.isSatellite && tower.type === 'archer'
      ? Math.max(0, SATELLITE_DISSIPATE_AFTER_WAVES - getSatelliteWavesSurvived(tower))
      : null;
    const selectedHeader = tower.isSatellite && tower.type === 'archer'
      ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;"><span>${tower.type.toUpperCase()} • ${rarityForLevel(tower.level)} • Level ${tower.level}</span><span style="margin-left:auto;text-align:right;">${satelliteWavesRemaining} wave${satelliteWavesRemaining === 1 ? '' : 's'} left</span></div>`
      : `${tower.type.toUpperCase()} • ${rarityForLevel(tower.level)} • Level ${tower.level}`;
    els.selectedInfo.innerHTML = `
      ${selectedHeader}<br>
      HP: ${Math.round(tower.hp)} / ${Math.round(tower.maxHp)}<br>
      Damage: ${Math.round(tower.damage)}<br>
      Range: ${tower.range}<br>
      Attack Interval: ${tower.getAttackInterval().toFixed(2)}s<br>
      Move Cooldown: ${Math.max(0, (tower.moveReadyAt - now()) / 1000).toFixed(1)}s<br>
      Level Up Cost: ${formatJewel(nextCost, tower)} Gold<br>
      Level Cap This Wave: L${getUpgradeLevelCap()}<br>
      Relics Owned: ${game.ownedRelics.length}
    `;
    els.upgradeBtn.disabled = !canUpgradeTower(tower) || !(game.phase === SETUP_PHASES.BATTLE || game.phase === SETUP_PHASES.WARRIOR || game.phase === SETUP_PHASES.OBSTACLES);
    els.moveBtn.disabled = isStatueTower(tower) || now() < tower.moveReadyAt || !!tower.buffs.rooted || game.phase === SETUP_PHASES.GAME_OVER;
    els.rebuildBarriersBtn.disabled = !canStartBarrierRebuild();
    els.rebuildBarriersBtn.textContent = `Rebuild Barriers (${formatJewel(BARRIER_REBUILD_COST)} Gold)`;

    els.abilitiesPanel.innerHTML = '';
    for (const ability of tower.abilities) {
      if (ability.passive || ability.manualOnly) continue;
      const wrapper = document.createElement('div');
      wrapper.className = 'ability-row';
      const btn = document.createElement('button');
      const remain = Math.max(0, (tower.abilityReadyAt[ability.key] - now()) / 1000);
      const locked = !isAbilityUnlocked(tower, ability.key);
      const unlockLevel = getAbilityUnlockLevel(tower, ability.key);
      btn.dataset.abilityKey = ability.key;
      btn.dataset.abilityName = ability.name;
      btn.className = locked ? 'locked-skill' : '';
      const isPassive = !!ability.passive;
      const label = locked ? `${ability.name} (Unlocks L${unlockLevel})` : (isPassive ? `${ability.name} (Passive)` : (remain > 0 ? `${ability.name} (${remain.toFixed(1)}s)` : ability.name));
      btn.textContent = label;
      btn.disabled = isPassive || locked || remain > 0 || game.phase === SETUP_PHASES.GAME_OVER || (tower.type === 'priest' && game.runningWave === false && !['swiftness'].includes(ability.key));
      btn.addEventListener('click', () => castAbility(tower, ability.key));
      const icon = document.createElement('button');
      icon.type = 'button';
      icon.className = 'ability-info-icon';
      icon.textContent = 'ⓘ';
      icon.title = '';
      const infoText = () => getAbilityDescription(tower, ability.key);
      icon.addEventListener('mouseenter', () => showAbilityInfo(infoText(), { pinned: false }));
      icon.addEventListener('mouseleave', () => {
        if (!game.infoPopupPinned) scheduleAbilityInfoHide();
      });
      icon.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const popup = ensureAbilityInfoPopup();
        const sameTextPinned = popup && !popup.classList.contains('hidden') && popup.dataset.text === infoText() && game.infoPopupPinned;
        if (sameTextPinned) {
          game.infoPopupPinned = false;
          hideAbilityInfo(true);
        } else {
          if (popup) popup.dataset.text = infoText();
          showAbilityInfo(infoText(), { pinned: true });
        }
      });
      wrapper.appendChild(btn);
      wrapper.appendChild(icon);
      els.abilitiesPanel.appendChild(wrapper);
    }
    renderPassiveCards(tower);
    renderMobileAbilityDock();
  }

  function refreshSelectedPanelLive() {
    const tower = getSelectedTower();
    if (!tower) return;
    if (game.renderedSelectionTowerId !== tower.id) {
      renderSelection();
      return;
    }
    const nextCost = getUpgradeCost(tower.level + 1, tower);
    els.selectedInfo.innerHTML = `
      ${tower.type.toUpperCase()} • ${rarityForLevel(tower.level)} • Level ${tower.level}<br>
      HP: ${Math.round(tower.hp)} / ${Math.round(tower.maxHp)}<br>
      Damage: ${Math.round(tower.damage)}<br>
      Range: ${tower.range}<br>
      Attack Interval: ${tower.getAttackInterval().toFixed(2)}s<br>
      Move Cooldown: ${Math.max(0, (tower.moveReadyAt - now()) / 1000).toFixed(1)}s<br>
      Level Up Cost: ${formatJewel(nextCost, tower)} Gold<br>
      Level Cap This Wave: L${getUpgradeLevelCap()}<br>
      Relics Owned: ${game.ownedRelics.length}
    `;
    els.upgradeBtn.disabled = !canUpgradeTower(tower) || !(game.phase === SETUP_PHASES.BATTLE || game.phase === SETUP_PHASES.WARRIOR || game.phase === SETUP_PHASES.OBSTACLES);
    els.moveBtn.disabled = isStatueTower(tower) || now() < tower.moveReadyAt || !!tower.buffs.rooted || game.phase === SETUP_PHASES.GAME_OVER;
    els.rebuildBarriersBtn.disabled = !canStartBarrierRebuild();
    els.rebuildBarriersBtn.textContent = `Rebuild Barriers (${formatJewel(BARRIER_REBUILD_COST)} Gold)`;
    const rows = els.abilitiesPanel.querySelectorAll('.ability-row');
    rows.forEach(row => {
      const btn = row.querySelector('button[data-ability-key]');
      if (!btn) return;
      const abilityKey = btn.dataset.abilityKey;
      const abilityName = btn.dataset.abilityName;
      const remain = Math.max(0, (tower.abilityReadyAt[abilityKey] - now()) / 1000);
      const locked = !isAbilityUnlocked(tower, abilityKey);
      const unlockLevel = getAbilityUnlockLevel(tower, abilityKey);
      const abilityObj = tower.abilities.find(a => a.key === abilityKey);
      const isPassive = !!abilityObj?.passive;
      btn.textContent = locked ? `${abilityName} (Unlocks L${unlockLevel})` : (isPassive ? `${abilityName} (Passive)` : (remain > 0 ? `${abilityName} (${remain.toFixed(1)}s)` : abilityName));
      btn.disabled = isPassive || locked || remain > 0 || game.phase === SETUP_PHASES.GAME_OVER || (tower.type === 'priest' && game.runningWave === false && !['swiftness'].includes(abilityKey));
      btn.className = locked ? 'locked-skill' : (isPassive ? 'locked-skill passive-skill' : '');
    });
    renderMobileAbilityDock();
  }

  function getLivingHireCount(includePendingPlacement = false) {
    return game.towers.filter(t => t.type !== 'warrior').length + (includePendingPlacement && game.placingHeroType ? 1 : 0);
  }

  function getNextHireCost(includePendingPlacement = false) {
    const index = Math.min(getLivingHireCount(includePendingPlacement), HIRE_COSTS.length - 1);
    return HIRE_COSTS[index];
  }

  function renderHirePanel() {
    els.hirePanel.innerHTML = '';

    const heroTypes = ['warrior', 'archer', 'wizard', 'priest', 'pirate'];
    const normalAvailable = heroTypes.filter(type => !game.towers.some(t => t.type === type) && game.placingHeroType !== type);
    const bonusAvailable = game.bonusHeroHireCharges > 0
      ? heroTypes.filter(type => game.towers.some(t => t.type === type) && game.placingHeroType !== type)
      : [];
    const cost = getNextHireCost(false);
    const canHireNow = !game.placingHeroType && game.phase !== SETUP_PHASES.GAME_OVER && ((Number(game.jewel || 0) + 1e-9) >= cost) && (normalAvailable.length > 0 || bonusAvailable.length > 0);
    updateMobileHireNotice(canHireNow);

    function appendHireButton(type, usesBonus, forceDisabled = false) {
      const t = TOWER_TEMPLATES[type];
      const card = document.createElement('div');
      card.className = 'card hire-button-card';
      const btn = document.createElement('button');
      const pendingThisType = game.placingHeroType === type;
      const labelPrefix = usesBonus ? 'Hire Extra' : 'Hire';
      btn.textContent = forceDisabled
        ? `${t.name} Hired`
        : pendingThisType
          ? `Placing… ${formatJewel(game.placingHeroCost)} Gold`
          : `${labelPrefix} ${t.name} (${formatJewel(cost)} Gold)`;
      btn.disabled = forceDisabled || ((Number(game.jewel || 0) + 1e-9) < cost) || game.phase === SETUP_PHASES.GAME_OVER;
      if (!forceDisabled) {
        btn.addEventListener('click', () => {
          if (game.phase === SETUP_PHASES.GAME_OVER) return;
          if ((Number(game.jewel || 0) + 1e-9) < cost) {
            showBanner(`Not enough Gold. Need ${formatJewel(cost)}.`, 1400);
            return;
          }
          if (pendingThisType) {
            game.placingHeroType = null;
            game.placingHeroCost = 0;
            game.placingHeroUsesBonus = false;
            game.placingSatelliteSourceId = null;
            showBanner(`Cancelled ${t.name} placement`, 1000);
            render();
            return;
          }
          game.placingHeroType = type;
          game.placingHeroCost = cost;
          game.placingHeroUsesBonus = !!usesBonus;
          game.placingSatelliteSourceId = null;
          log(`Select a tile to place ${usesBonus ? 'an extra ' : ''}${t.name}. You can place hires during active rounds too.`);
          showBanner(game.runningWave ? `Place ${t.name} during the wave on any open tile` : `Place ${t.name} on any open tile`, 1400);
          render();
        });
      }
      card.appendChild(btn);
      els.hirePanel.appendChild(card);
    }

    if (!normalAvailable.length && !bonusAvailable.length && !game.placingHeroType) {
      heroTypes.forEach(type => appendHireButton(type, false, true));
      return;
    }

    for (const type of normalAvailable) appendHireButton(type, false);
    for (const type of bonusAvailable) appendHireButton(type, true);
  }


  function renderRelics() {
    if (els.relicPanel) {
      els.relicPanel.innerHTML = '';
      const owned = getOwnedRelicObjects();
      const ownedCard = document.createElement('div');
      ownedCard.className = 'card relic-owned-card';
      ownedCard.innerHTML = owned.length
        ? `<h4>Owned Relics</h4><p>${owned.map(r => `<span class="relic-pill" title="${r.desc}">${r.name}</span>`).join(' ')}</p>`
        : '<h4>Owned Relics</h4><p>No relics yet.</p>';
      els.relicPanel.appendChild(ownedCard);
    }
    if (!els.relicModalBody || !els.relicModal) return;
    els.relicModalBody.innerHTML = '';
    if (!game.relicChoices.length) {
      els.relicModal.classList.add('hidden');
      return;
    }
    const isFreeStartingRelic = !!game.startingRelicPending;
    for (const relic of game.relicChoices) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h4>${relic.name}</h4><p>${relic.desc}</p><p class="gold">${isFreeStartingRelic ? 'FREE STARTING RELIC' : `${formatJewel(relic.cost)} GOLD`}</p>`;
      const btn = document.createElement('button');
      btn.className = 'buy-btn';
      btn.textContent = isFreeStartingRelic ? `Choose ${relic.name}` : `Buy ${relic.name}`;
      btn.disabled = !isFreeStartingRelic && game.jewel < relic.cost;
      btn.addEventListener('click', () => buyRelic(relic.id));
      card.appendChild(btn);
      els.relicModalBody.appendChild(card);
    }
    if (!isFreeStartingRelic) {
      const skip = document.createElement('button');
      skip.className = 'secondary';
      skip.textContent = 'Skip relic shop';
      skip.addEventListener('click', () => {
        game.relicChoices = [];
        log('Skipped relic shop.');
        setCountdown(WAVE_BREAK_SECONDS);
        render();
      });
      els.relicModalBody.appendChild(skip);
    }
    els.relicModal.classList.remove('hidden');
  }

  function canPlacePortal(x, y) {
    const minPortalX = Math.max(4, Math.floor(WIDTH * 0.42));
    if (x < minPortalX || y > HEIGHT - 2 || x > WIDTH - 2) return false;
    const points = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
    return points.every(p => {
      const tile = tileAt(p.x, p.y);
      return tile && !tile.obstacle && !tile.towerId && tile.type !== 'spawn';
    });
  }

  function clearPortalTiles() {
    if (!game.portal) return;
    for (let py = game.portal.y; py < game.portal.y + 2; py += 1) {
      for (let px = game.portal.x; px < game.portal.x + 2; px += 1) {
        const tile = tileAt(px, py);
        if (tile) tile.portal = false;
      }
    }
  }

  function canRepositionWarriorPreStart() {
    return !game.runningWave && game.waveNumber === 0 && game.phase !== SETUP_PHASES.GAME_OVER;
  }

  function pickupWarriorForReposition(tower) {
    if (!tower || tower.type !== 'warrior' || !canRepositionWarriorPreStart()) return false;
    const tile = tileAt(tower.x, tower.y);
    if (tile) tile.towerId = null;
    game.towers = game.towers.filter(t => t.id !== tower.id);
    game.phase = SETUP_PHASES.WARRIOR;
    game.selectedId = null;
    setInstruction('Move the Warrior to a new tile before the first wave starts.');
    log('Warrior picked up for repositioning before wave 1.');
    return true;
  }

  function canRepositionPortal() {
    return !!game.portal && !game.runningWave && game.waveNumber === 0 && (game.phase === SETUP_PHASES.OBSTACLES || game.phase === SETUP_PHASES.WARRIOR || game.phase === SETUP_PHASES.BATTLE);
  }

  function pickupPortal() {
    if (!canRepositionPortal()) return false;
    clearPortalTiles();
    game.portal = null;
    game.phase = SETUP_PHASES.PORTAL;
    game.runTracking = {
      clientRunId: (window.crypto && typeof window.crypto.randomUUID === 'function') ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      startedAt: new Date().toISOString(),
      submitted: false,
    };
    setInstruction('Move the 2x2 portal to a new location. After placing it again, continue setup.');
    log('Portal picked up for repositioning before wave 1.');
    return true;
  }

  function placePortal(x, y) {
    if (!canPlacePortal(x, y)) return false;
    game.portal = { x, y, width: 2, height: 2 };
    game.portalHp = 2500;
    for (let py = y; py < y + 2; py += 1) {
      for (let px = x; px < x + 2; px += 1) {
        tileAt(px, py).portal = true;
      }
    }
    game.phase = SETUP_PHASES.OBSTACLES;
    setInstruction(`Place ${PLAYER_OBSTACLE_COUNT} obstacles. Do not block every path. You can move the portal before wave 1.`);
    log(`Portal placed at (${x + 1}, ${y + 1}) covering 2x2 tiles.`);
    return true;
  }

  function canPlacePlayerObstacle(x, y) {
    const tile = tileAt(x, y);
    if (!tile || tile.type === 'spawn' || tile.portal || tile.obstacle || tile.towerId) return false;
    tile.obstacle = 'player';
    const okay = existsPathFromBreachToPortal();
    tile.obstacle = null;
    return okay;
  }

  function placePlayerObstacle(x, y) {
    if (!canPlacePlayerObstacle(x, y)) return false;
    tileAt(x, y).obstacle = 'player';
    tileAt(x, y).treeVariant = getRandomTreeVariant();
    game.playerObstacleCount += 1;
    log(`Placed obstacle ${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT} at (${x + 1}, ${y + 1}).`);
    if (game.playerObstacleCount >= PLAYER_OBSTACLE_COUNT) {
      const hasWarrior = game.towers.some(t => t.type === 'warrior');
      if (game.rebuildingBarriers || hasWarrior) {
        game.phase = SETUP_PHASES.BATTLE;
        game.rebuildingBarriers = false;
        setInstruction(`Barrier placement complete. Wave ${game.waveNumber + 1} is ready when you are. Before the first wave starts, you can still click a barrier to move it.`);
        els.startWaveBtn.disabled = !!game.startingRelicPending;
        if (!game.nextWavePlan) prepareNextWave();
      } else {
        game.phase = SETUP_PHASES.WARRIOR;
        setInstruction('Place your starting Warrior on any open tile. Before the first wave starts, you can still click a barrier to move it.');
        els.skipSetupBtn.classList.remove('hidden');
      }
    } else {
      const prefix = game.rebuildingBarriers ? 'Rebuild your player barriers. Click one of your barriers to pick it back up.' : `Place ${PLAYER_OBSTACLE_COUNT} player obstacles. Click one of your barriers to pick it back up before the first wave starts.`;
      setInstruction(`${prefix} ${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT} placed.`);
      if (game.waveNumber === 0) els.startWaveBtn.disabled = true;
    }
    return true;
  }

  function canEditBarriersPreStart() {
    return !game.runningWave && game.waveNumber === 0 && (game.phase === SETUP_PHASES.OBSTACLES || game.phase === SETUP_PHASES.WARRIOR || game.phase === SETUP_PHASES.BATTLE);
  }

  function removePlayerObstacle(x, y) {
    const tile = tileAt(x, y);
    if (!tile || tile.obstacle !== 'player') return false;
    tile.obstacle = null;
    tile.treeVariant = null;
    game.playerObstacleCount = Math.max(0, game.playerObstacleCount - 1);
    if (game.rebuildingBarriers || canEditBarriersPreStart()) {
      game.phase = SETUP_PHASES.OBSTACLES;
      els.startWaveBtn.disabled = true;
      const prefix = game.rebuildingBarriers ? 'Rebuild your player barriers. Click one of your barriers to pick it back up.' : `Place ${PLAYER_OBSTACLE_COUNT} player obstacles. Click one of your barriers to pick it back up before the first wave starts.`;
      setInstruction(`${prefix} ${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT} placed.`);
      log(`Removed obstacle at (${x + 1}, ${y + 1}). Place it somewhere else.`);
      return true;
    }
    tile.obstacle = 'player';
    game.playerObstacleCount += 1;
    return false;
  }

  function beginBarrierRebuild() {
    if (!canStartBarrierRebuild()) {
      showBanner('Barrier rebuild is not available right now.', 1400);
      return;
    }
    game.jewel -= BARRIER_REBUILD_COST;
    for (const tile of game.grid) {
      if (tile.obstacle === 'player') { tile.obstacle = null; tile.treeVariant = null; }
    }
    game.playerObstacleCount = 0;
    game.rebuildingBarriers = true;
    game.barrierRefitCount += 1;
    game.phase = SETUP_PHASES.OBSTACLES;
    els.startWaveBtn.disabled = true;
    game.selectedId = null;
    game.movingTowerId = null;
    game.placingHeroType = null;
    game.placingHeroCost = 0;
    game.placingSatelliteSourceId = null;
    game.hoveredTowerId = null;
    setInstruction(`Barrier rebuild purchased for ${formatJewel(BARRIER_REBUILD_COST)} Gold. Place ${PLAYER_OBSTACLE_COUNT} new player barriers.`);
    log(`Barrier rebuild purchased for ${formatJewel(BARRIER_REBUILD_COST)} Gold.`);
    render();
  }

  function canStartBarrierRebuild(requireJewel = true) {
    const rebuildsUnlocked = Math.floor(game.waveNumber / WAVE_REBUILD_INTERVAL);
    return game.phase === SETUP_PHASES.BATTLE &&
      !game.runningWave &&
      !game.relicChoices.length &&
      game.waveNumber >= WAVE_REBUILD_INTERVAL &&
      !game.rebuildingBarriers &&
      rebuildsUnlocked > game.barrierRefitCount &&
      (!requireJewel || game.jewel >= BARRIER_REBUILD_COST);
  }

  function autoPlaceWarrior() {
    const candidates = [];
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 2; x < 7; x += 1) {
        if (isOpenForTower(x, y)) candidates.push({ x, y });
      }
    }
    candidates.sort((a, b) => portalDistance(a) - portalDistance(b));
    if (candidates.length) placeStartingWarrior(candidates[0].x, candidates[0].y);
  }

  function placeStartingWarrior(x, y) {
    if (!isOpenForTower(x, y)) return false;
    const warrior = createTower('warrior', x, y);
    game.towers.push(warrior);
    tileAt(x, y).towerId = warrior.id;
    if (!placementKeepsEnemiesReachable(warrior)) {
      tileAt(x, y).towerId = null;
      game.towers = game.towers.filter(t => t.id !== warrior.id);
      return false;
    }
    game.phase = SETUP_PHASES.BATTLE;
    setInstruction('Setup complete. Choose 1 free starting relic, then start the first wave.');
    offerStartingRelic();
    prepareNextWave();
    log(`Warrior placed at (${x + 1}, ${y + 1}).`);
    els.skipSetupBtn.classList.add('hidden');
    return true;
  }

  function portalDistance(pos) {
    const portalTargets = getPortalTargets();
    return Math.min(...portalTargets.map(t => Math.abs(t.x - pos.x) + Math.abs(t.y - pos.y)));
  }

  function isOpenForTower(x, y) {
    const tile = tileAt(x, y);
    return !!tile && !tile.obstacle && !tile.portal && !tile.towerId && tile.type !== 'spawn';
  }

  function existsPathFromBreachToTargets(targets) {
    if (!targets || !targets.length) return false;
    return getSpawnTiles().some(start => bfsHasPath(start, targets));
  }

  function placementKeepsEnemiesReachable(warriorLike) {
    return existsPathFromBreachToPortal() || existsPathFromBreachToTargets(getTowerApproachTiles(warriorLike));
  }

  function createTower(type, x, y) {
    const template = TOWER_TEMPLATES[type];
    const baseAttackInterval = template.attackInterval;
    const tower = {
      id: `t${game.nextTowerId++}`,
      type,
      name: template.name,
      template,
      x,
      y,
      level: 1,
      maxHp: template.hp,
      hp: template.hp,
      damage: template.damage,
      range: template.range,
      basicCooldown: baseAttackInterval * 1000,
      attackCooldownMs: 0,
      basicAttackCount: 0,
      moveReadyAt: now(),
      buffs: {},
      debuffs: {},
      abilityReadyAt: {},
      abilities: template.abilities,
      getAttackInterval() {
        let mult = 1;
        if (this.buffs.rapid_onslaught) mult *= (1 + (this.buffs.rapid_onslaught.strength ?? 1));
        if (this.buffs.rapid_shot) mult *= (1 + (this.buffs.rapid_shot.bonus ?? 0.8));
        if (this.buffs.swiftness) mult *= (1 + (this.buffs.swiftness.bonus ?? 0.25));
        if (this.buffs.blizzardSlow) mult *= 0.5;
        if (game.modifiers.sacredAura && isNearPriest(this)) mult *= 1.08;
        return Math.max(0.30, this.basicCooldown / 1000 / mult);
      },
    };
    for (const ability of template.abilities) tower.abilityReadyAt[ability.key] = 0;
    if (type === 'pirate') tower.basicCooldown = (TOWER_TEMPLATES.pirate.attackInterval * 1000) / getPirateCooldownMultiplierForLevel(tower.level || 1);
    return tower;
  }

  function isNearPriest(tower) {
    return game.towers.some(t => t.type === 'priest' && t.id !== tower.id && dist(t, tower) <= 2);
  }

  function getAbilityIndex(tower, abilityKey) {
    return tower.abilities.findIndex(a => a.key === abilityKey);
  }

  function getAbilityUnlockLevel(tower, abilityKey) {
    if (abilityKey === 'healing_aura' || abilityKey === 'frost_lance') return 15;
    if (abilityKey === 'eagle_nest') return 1;
    const idx = getAbilityIndex(tower, abilityKey);
    if (idx < 0) return 1;
    if (idx < 2) return 1;
    if (abilityKey === 'whirlwind') return 1;
    if (idx === 2) return 10;
    return 20;
  }

  function isAbilityUnlocked(tower, abilityKey) {
    return tower.level >= getAbilityUnlockLevel(tower, abilityKey);
  }

  function getAbilityPowerMultiplier(tower, abilityKey) {
    if (abilityKey === 'healing_aura') return 1;
    return getAbilityIndex(tower, abilityKey) >= 2 ? 2 : 1;
  }

  function getPriestDivineSoldierPrayerCooldown(tower) {
    const level = tower?.level ?? 1;
    if (level < 10) return 6;
    const reduction = Math.min(5, Math.max(0, level - 9) * 0.1);
    return Math.max(1, 6 - reduction);
  }

  function getAbilityCooldownSeconds(tower, abilityKey) {
    const base = tower.template.abilities.find(a => a.key === abilityKey)?.cooldown || 5;
    if (abilityKey === 'healing_aura') return 0;
    const scaledBase = abilityKey === 'prayer_of_healing'
      ? getPriestDivineSoldierPrayerCooldown(tower)
      : base;
    return getAbilityIndex(tower, abilityKey) >= 2 ? scaledBase * 1.5 : scaledBase;
  }

  function getUpgradeLevelCap() {
    return Math.max(9, game.waveNumber + 9);
  }

  function getAbilityLevelBonus(tower, perLevel = ABILITY_DAMAGE_PER_LEVEL) {
    const level = Math.max(1, tower?.level || 1);
    return Math.max(0, level - 1) * perLevel;
  }

  function canUpgradeTower(tower) {
    if (isStatueTower(tower)) return false;
    const nextLevel = tower.level + 1;
    return nextLevel <= getUpgradeLevelCap() && game.jewel >= getUpgradeCost(nextLevel, tower);
  }

  function getOwnedRelicObjects() {
    return game.ownedRelics.map(id => RELICS.find(r => r.id === id)).filter(Boolean);
  }

  function getPassiveEntries(tower) {
    const entries = tower.abilities
      .filter(ability => ability.passive)
      .map(ability => ({
        key: ability.key,
        name: ability.name,
        locked: !isAbilityUnlocked(tower, ability.key),
        unlockLevel: getAbilityUnlockLevel(tower, ability.key),
        description: getAbilityDescription(tower, ability.key),
      }));
    if (tower.template.passive) {
      entries.push({
        key: `${tower.type}_template_passive`,
        name: tower.type === 'priest' ? 'Divine Soldier' : tower.name,
        locked: false,
        unlockLevel: 1,
        description: tower.template.passive,
      });
    }
    return entries;
  }

  function renderPassiveCards(tower) {
    const passives = getPassiveEntries(tower);
    for (const passiveEntry of passives) {
      const passive = document.createElement('div');
      passive.className = `card passive-card ${passiveEntry.locked ? 'passive-card-locked' : ''}`;
      let subtitle = passiveEntry.locked
        ? `<div class="passive-subtitle">Unlocks at level ${passiveEntry.unlockLevel}</div>`
        : ``;
      if (passiveEntry.key === 'frost_bolt' && !passiveEntry.locked && tower.level >= 15) {
        subtitle += `<div class="passive-active-note">Enhanced Aura Active: +1 range</div>`;
      }
      passive.innerHTML = `<div class="passive-name">${passiveEntry.name}</div>${subtitle}<p>${passiveEntry.description}</p>`;
      if (!tower.isSatellite && (passiveEntry.key === 'new_blood' || passiveEntry.key === 'eagle_nest') && !passiveEntry.locked) {
        const charges = tower.satelliteCharges || 0;
        const btn = document.createElement('button');
        const satLabel = passiveEntry.key === 'eagle_nest' ? 'Satellite Archer' : 'Statue';
        btn.textContent = charges > 0 ? `Place ${satLabel} (${charges})` : (passiveEntry.key === 'eagle_nest' ? 'No Satellite Charges' : 'No Statue Charges');
        btn.disabled = charges <= 0 || game.phase === SETUP_PHASES.GAME_OVER;
        btn.addEventListener('click', () => beginSatellitePlacement(tower));
        passive.appendChild(btn);
      }
      els.abilitiesPanel.appendChild(passive);
    }
  }

  function getPrayerOfHealingAmount(tower) {
    const level = Math.max(1, tower?.level || 1);
    return (PRAYER_OF_HEALING_BASE_AMOUNT + ((level - 1) * 5)) * game.modifiers.priestHealing;
  }

  function getAbilityDescription(tower, abilityKey) {
    const powerMult = getAbilityPowerMultiplier(tower, abilityKey);
    const stronger = powerMult > 1 ? ' This is an unlock skill, so it is 100% stronger and has 50% longer cooldown.' : '';
    const common = ` Unlocks at level ${getAbilityUnlockLevel(tower, abilityKey)}. Cooldown: ${getAbilityCooldownSeconds(tower, abilityKey).toFixed(1)}s.`;
    const scale = '';
    const d = tower.damage;
    const hp = tower.maxHp;
    const map = {
      gladiator_strike: `Passive. Every 9 Warrior basic attacks, Gladiator Strike triggers on the hit target for ${Math.round(d * 2)} bonus damage and heals ${Math.round(hp * 0.05)} HP. This passive unlocks at level 1 and is always on.${scale}`,
      new_blood: `Passive. Every 10 cleared waves, the Warrior gains 1 Statue charge. The Warrior uses old battle magic to create a statue of himself that stops enemies until they destroy it. A Statue does not attack, cannot be moved, cannot be healed, and enters the field at full strength. Its maximum health equals double the Warrior's current health when summoned, and it begins at 100% of that total.${game.modifiers.explodingStatue ? ' Exploding Statue relic: when a Statue dies, it explodes in a 2-tile radius for 20% of its max HP.' : ''}${scale}`,
      whirlwind: `Hits adjacent enemies for ${Math.round(60 * powerMult)} damage.${stronger}${common}${scale}`,
      rapid_onslaught: `Boosts attack speed by ${Math.round((1 * powerMult) * 100)}% for 4s.${stronger}${common}${scale}`,

      multi_shot: `Fires 3 arrows for ${Math.round(d * 0.7)} damage each.${common}${scale}`,
      rapid_shot: `Boosts attack speed by ${Math.round((0.8 * powerMult) * 100)}% for 4s.${stronger}${common}${scale}`,
      piercing_shot: `Hits up to 3 enemies for ${Math.round((d + getAbilityLevelBonus(tower)) * 1 * powerMult)}, ${Math.round((d + getAbilityLevelBonus(tower)) * 0.8 * powerMult)}, and ${Math.round((d + getAbilityLevelBonus(tower)) * 0.6 * powerMult)} damage. Gains +${ABILITY_DAMAGE_PER_LEVEL} damage per level.${stronger}${common}${scale}`,
      eagle_nest: `Passive. Every 12 cleared waves, Eagle Nest grants 1 Satellite Archer charge. Use that charge during prep to place a level 1 Satellite Archer on any valid open tile. The Satellite Archer has half of a normal Archer's max HP at the same level, deals 75% of the parent hero's damage, and costs 50% more to level up. Satellite Archers are ethereal: after 3 cleared waves they fade to 25% translucency, after 7 cleared waves they fade to 50% translucency, and after 9 cleared waves they dissipate completely. The tile shows how many waves remain, and once the Satellite Archer is gone you must clear 12 more waves before summoning the next one.`,
      firebolt: `Deals ${Math.round(40 * game.modifiers.wizardSpellDamage)} spell damage.${common}${scale}`,
      frost_bolt: `Passive. Every 1 second, Ice Aura slows up to 10 enemies. Slow strength increases by ${(ICE_AURA_SLOW_PER_LEVEL * 100).toFixed(1)}% per Wizard level, starting at ${(ICE_AURA_BASE_SLOW * 100).toFixed(0)}%. Range is ${ICE_AURA_BASE_RANGE}, and at level 15 it expands to ${ICE_AURA_BASE_RANGE + ICE_AURA_BONUS_RANGE_AT_LEVEL_15} tiles. ${tower.level >= 15 ? 'Enhanced Aura Active: +1 range.' : 'Enhanced Aura inactive until level 15.'}`,
      fireball: `Explodes in a 2-tile area for ${Math.round((70 + getAbilityLevelBonus(tower)) * powerMult * game.modifiers.wizardSpellDamage)} damage. Gains +${ABILITY_DAMAGE_PER_LEVEL} damage per level.${stronger}${common}${scale}`,
      frost_lance: `Deals ${Math.round(90 * powerMult * game.modifiers.wizardSpellDamage)} damage, or double to slowed enemies.${stronger}${common}${scale}`,
      prayer_of_healing: `Heals nearby allies within 5 tiles for ${Math.round(getPrayerOfHealingAmount(tower))} HP. This scales by +5 HP per Priest level, starting at ${PRAYER_OF_HEALING_BASE_AMOUNT} HP on level 1.${common}${scale}`,
      slow_totem: `Manual only. Places an indestructible totem for 45s. All enemies within ${SLOW_TOTEM_RANGE} tiles are slowed by ${(SLOW_TOTEM_PERCENT * 100).toFixed(0)}%, and the slow ends immediately when they leave the area. Cooldown: 60.0s. Unlocks at level ${getAbilityUnlockLevel(tower, abilityKey)}.${scale}`,
      swiftness: `Boosts nearby allies' attack speed by ${Math.round(25 * powerMult)}% for 5s.${stronger}${common}${scale}`,
      healing_aura: `Passive. Unlocks at level 15. Heals nearby allies within 2 tiles for ${Math.round(2 * tower.level)} HP each second. This scales directly with Priest level, so every level adds +2 HP per second to the aura.${common}${scale}`,
      priest_template_passive: `Passive: Starting at level 10, Prayer of Healing cooldown is reduced by 0.1s per Priest level.<br><strong>Current Prayer of Healing cooldown: ${getPriestDivineSoldierPrayerCooldown(tower).toFixed(1)}s</strong><br>This caps at a minimum cooldown of 1.0s.`,
      warning_shot: `Marks one enemy to take 20% more damage for 6s.${common}${scale}`,
      starboard_cannons: `Fires ${4 + game.modifiers.extraCannons} cannonballs for ${Math.round(STARBOARD_CANNONS_BASE_DAMAGE + getAbilityLevelBonus(tower))} damage each in a small splash area. Gains +${ABILITY_DAMAGE_PER_LEVEL} damage per level.${common}${scale}`,
      kraken: `Applies a 10s kraken effect in a 2-tile cluster that deals ${Math.round(KRAKEN_BASE_DAMAGE * powerMult)} damage per second and slows by 50%.${stronger}${common}${scale}`,
    };
    if (tower.type === 'pirate') {
      map[`${tower.type}_template_passive`] = `Bloody Bastard. Every 10th Pirate basic attack makes the target bleed for 10s. Bleed deals 3% of the target's max HP per second and adds a 5% slow. Pirate basic attacks avoid already bleeding enemies whenever possible.`;
    }
    return map[abilityKey] || `${common}${scale}`;
  }

  function getUpgradeCost(nextLevel, tower = null) {
    let base = 15;
    if (nextLevel <= 5) base = 1;
    else if (nextLevel <= 10) base = 2;
    else if (nextLevel <= 15) base = 4;
    else if (nextLevel <= 20) base = 8;
    if (nextLevel > 10) base *= 1.5;

    const levelProgress = Math.max(0, Math.min((nextLevel - 2) / 38, 1));
    const baseMarkup = 1.05 + (0.10 * Math.pow(levelProgress, 1.35));
    const curvedMarkup = 1 + ((baseMarkup - 1) * 1.15);
    const satelliteMult = tower && tower.isSatellite ? SATELLITE_UPGRADE_COST_MULTIPLIER : 1;
    return Math.round(base * UPGRADE_COST_MULTIPLIER * curvedMarkup * satelliteMult * 10) / 10;
  }

  function upgradeTower(tower) {
    const nextLevel = tower.level + 1;
    const cost = getUpgradeCost(nextLevel, tower);
    if (nextLevel > getUpgradeLevelCap()) {
      showBanner(`Level cap reached for this wave. Max level is ${getUpgradeLevelCap()}.`, 1500);
      return;
    }
    if (game.jewel < cost) return;
    game.jewel -= cost;
    tower.level = nextLevel;
    if (tower.type === 'archer') {
      normalizeArcherStats(tower, true);
    } else if (tower.type === 'pirate') {
      const hpRatio = tower.hp / tower.maxHp;
      tower.maxHp *= 1.065;
      tower.hp = tower.maxHp * hpRatio;
      tower.damage *= PIRATE_WIZARD_DAMAGE_GROWTH_PER_LEVEL;
      tower.basicCooldown = (TOWER_TEMPLATES.pirate.attackInterval * 1000) / getPirateCooldownMultiplierForLevel(tower.level || 1);
    } else if (tower.type === 'wizard') {
      const hpRatio = tower.hp / tower.maxHp;
      tower.maxHp *= 1.065;
      tower.hp = tower.maxHp * hpRatio;
      tower.damage *= PIRATE_WIZARD_DAMAGE_GROWTH_PER_LEVEL;
      tower.basicCooldown = (TOWER_TEMPLATES.wizard.attackInterval * 1000) / getWizardCooldownMultiplierForLevel(tower.level || 1);
    } else {
      const hpRatio = tower.hp / tower.maxHp;
      tower.maxHp *= 1.065;
      tower.hp = tower.maxHp * hpRatio;
      tower.damage *= 1.05;
      tower.basicCooldown /= 1.05;
    }
    log(`${tower.name} leveled up to level ${tower.level} (${rarityForLevel(tower.level)}).`);
    render();
  }

  function getSelectedTower() {
    return game.towers.find(t => t.id === game.selectedId) || null;
  }

  function getActiveSatelliteCountForOwner(ownerId) {
    return game.towers.filter(t => t.isSatellite && t.satelliteOwnerId === ownerId).length;
  }

  function isStatueTower(tower) {
    return !!tower && tower.type === 'warrior' && tower.isSatellite && !!tower.isStatue;
  }

  function beginSatellitePlacement(tower) {
    if (!tower || (tower.type !== 'warrior' && tower.type !== 'archer') || (tower.satelliteCharges || 0) <= 0) return;
    if (getActiveSatelliteCountForOwner(tower.id) >= 1) {
      showBanner(tower?.type === 'warrior' ? 'That Warrior already has its maximum of 1 active Statue.' : 'That hero already has its maximum of 1 active satellite.', 1700);
      return;
    }
    game.placingHeroType = tower.type;
    game.placingHeroCost = 0;
    game.placingHeroUsesBonus = false;
    game.placingSatelliteSourceId = tower.id;
    const satLabel = tower.type === 'archer' ? 'Satellite Archer' : 'Statue';
    log(`Select an open tile to place a ${satLabel} from ${tower.name}.`);
    render();
  }

  function handleTileClick(x, y) {
    clearPathPreview();
    const tile = tileAt(x, y);

    if (tile && tile.portal && canRepositionPortal()) {
      pickupPortal();
      render();
      return;
    }

    if (game.placingHeroType) {
      placeHiredHero(x, y);
      return;
    }

    if (game.phase === SETUP_PHASES.PORTAL) {
      if (!placePortal(x, y)) showBanner('Invalid portal placement', 1200);
      render();
      return;
    }

    if (game.phase === SETUP_PHASES.OBSTACLES) {
      if (tile?.obstacle === 'player' && (game.rebuildingBarriers || canEditBarriersPreStart())) {
        removePlayerObstacle(x, y);
      } else if (!placePlayerObstacle(x, y)) {
        showBanner('Obstacle would block all paths or is invalid', 1500);
      }
      render();
      return;
    }

    if (tile?.obstacle === 'player' && canEditBarriersPreStart()) {
      removePlayerObstacle(x, y);
      render();
      return;
    }

    if (game.phase === SETUP_PHASES.WARRIOR) {
      if (!placeStartingWarrior(x, y)) showBanner('Pick an open tile for the Warrior', 1200);
      render();
      return;
    }

    const tower = tile.towerId ? game.towers.find(t => t.id === tile.towerId) : null;
    if (tower) {
      if (tower.type === 'warrior' && canRepositionWarriorPreStart()) {
        if (pickupWarriorForReposition(tower)) {
          showBanner('Warrior picked up. Place him on a new tile.', 1400);
          render();
          return;
        }
      }
      game.selectedId = tower.id;
      game.movingTowerId = null;
      render();
      return;
    }

    if (game.movingTowerId) {
      const moving = game.towers.find(t => t.id === game.movingTowerId);
      if (moving && moveTower(moving, x, y)) {
        game.movingTowerId = null;
      } else {
        showBanner(moving?.type === 'warrior' ? 'Warrior moves 1 tile onto any open space' : 'Move must be on an open tile that is not blocked by a barrier or hero', 1500);
      }
      render();
      return;
    }
  }

  function placeHiredHero(x, y) {
    const sourceTower = game.placingSatelliteSourceId
      ? game.towers.find(t => t.id === game.placingSatelliteSourceId)
      : null;
    const isSatellitePlacement = !!sourceTower;

    if (!isOpenForTower(x, y)) {
      showBanner(isSatellitePlacement ? (sourceTower?.type === 'warrior' ? 'Pick an open tile for the Statue' : 'Pick an open tile for the satellite hero') : 'Pick an open tile for the new hero', 1200);
      return;
    }

    const typeToPlace = game.placingHeroType;
    const usesBonusHire = !!game.placingHeroUsesBonus;
    const cost = isSatellitePlacement ? 0 : (Number.isFinite(game.placingHeroCost) && game.placingHeroCost > 0 ? game.placingHeroCost : getNextHireCost(false));

    if (isSatellitePlacement) {
      if (!sourceTower || (sourceTower.satelliteCharges || 0) <= 0) {
        showBanner(sourceTower?.type === 'warrior' ? 'No Statue charge is available for that Warrior.' : 'No satellite charge is available for that hero.', 1500);
        game.placingHeroType = null;
        game.placingHeroCost = 0;
        game.placingHeroUsesBonus = false;
        game.placingSatelliteSourceId = null;
        render();
        return;
      }
      if (getActiveSatelliteCountForOwner(sourceTower.id) >= 1) {
        showBanner(sourceTower?.type === 'warrior' ? 'That Warrior already has its maximum of 1 active Statue.' : 'That hero already has its maximum of 1 active satellite.', 1700);
        game.placingHeroType = null;
        game.placingHeroCost = 0;
        game.placingHeroUsesBonus = false;
        game.placingSatelliteSourceId = null;
        render();
        return;
      }
    } else if ((Number(game.jewel || 0) + 1e-9) < cost) {
      showBanner(`Not enough Gold. Need ${formatJewel(cost)}.`, 1400);
      game.placingHeroType = null;
      game.placingHeroCost = 0;
      game.placingHeroUsesBonus = false;
      game.placingSatelliteSourceId = null;
      render();
      return;
    }

    const tower = createTower(typeToPlace, x, y);
    if (isSatellitePlacement) {
      tower.level = 1;
      tower.maxHp = Math.max(1, Math.round(sourceTower.maxHp * 0.5));
      tower.hp = tower.maxHp;
      if (sourceTower.type === 'warrior') {
        const statueHp = Math.max(1, Math.round(sourceTower.hp * 2));
        tower.maxHp = statueHp;
        tower.hp = statueHp;
        tower.damage = 0;
        tower.range = 0;
        tower.basicCooldown = 0;
        tower.moveReadyAt = Number.POSITIVE_INFINITY;
        tower.isStatue = true;
      } else {
        tower.damage = sourceTower.damage * SATELLITE_DAMAGE_MULTIPLIER;
        tower.range = sourceTower.range;
        tower.basicCooldown = sourceTower.basicCooldown;
      }
      tower.satelliteOwnerId = sourceTower.id;
      tower.isSatellite = true;
      tower.summonedAtWave = Number(game.waveNumber || 0);
      tower.name = sourceTower.type === 'archer' ? 'Sat Archer' : 'Statue';
    }

    normalizeArcherStats(tower);
    game.towers.push(tower);
    tileAt(x, y).towerId = tower.id;
    if (tower.type === 'warrior' && !placementKeepsEnemiesReachable(tower)) {
      tileAt(x, y).towerId = null;
      game.towers = game.towers.filter(t => t.id !== tower.id);
      showBanner('Warrior must leave enemies a route to the portal or to a tile next to him.', 1800);
      return;
    }

    if (isSatellitePlacement) {
      sourceTower.satelliteCharges = Math.max(0, (sourceTower.satelliteCharges || 0) - 1);
      log(`Placed ${tower.name} from ${sourceTower.name} at (${x + 1}, ${y + 1}).`);
      if (typeof markProgress === 'function') markProgress(`Placed ${tower.name}.`);
    } else {
      game.jewel = Math.max(0, Number(game.jewel || 0) - cost);
      if (usesBonusHire) game.bonusHeroHireCharges = Math.max(0, game.bonusHeroHireCharges - 1);
      log(`Hired ${usesBonusHire ? 'an extra ' : ''}${tower.name} for ${formatJewel(cost)} Gold and placed it at (${x + 1}, ${y + 1}).`);
      if (typeof markProgress === 'function') markProgress(`Placed hired ${tower.name}.`);
      game.hireCount = Math.max(game.hireCount, getLivingHireCount());
    }

    game.selectedId = tower.id;
    game.placingHeroType = null;
    game.placingHeroCost = 0;
    game.placingHeroUsesBonus = false;
    game.placingSatelliteSourceId = null;
    render();
  }

  function getMoveRangeForTower(tower) {
    return tower.type === 'warrior' ? 1 : Math.max(WIDTH, HEIGHT);
  }

  function chebyshevDist(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  function getMoveTargetsForTower(tower) {
    if (isStatueTower(tower)) return [];
    const moveRange = getMoveRangeForTower(tower);
    const targets = [];
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        if (x === tower.x && y === tower.y) continue;
        if (!inBounds(x, y)) continue;
        if (!isOpenForTower(x, y)) continue;
        if (tower.type !== 'warrior' && chebyshevDist(tower, { x, y }) > moveRange) continue;
        if ((tower.type === 'warrior' || isStatueTower(tower)) && !moveWouldPreservePath(tower, x, y)) continue;
        targets.push({ x, y });
      }
    }
    return targets;
  }

  function getSelectedRangeTiles(tower) {
    const tiles = [];
    const radius = Math.max(1, Number(tower.range || 1));
    for (let y = tower.y - radius; y <= tower.y + radius; y += 1) {
      for (let x = tower.x - radius; x <= tower.x + radius; x += 1) {
        if (!inBounds(x, y)) continue;
        if (x === tower.x && y === tower.y) continue;
        const probe = { x, y };
        const inRange = tower.type === 'warrior' ? chebyshevDist(tower, probe) <= 1 : dist(tower, probe) <= radius;
        if (!inRange) continue;
        tiles.push(probe);
      }
    }
    return tiles;
  }

  function moveWouldPreservePath(tower, nx, ny) {
    const fromTile = tileAt(tower.x, tower.y);
    const toTile = tileAt(nx, ny);
    const oldFromTowerId = fromTile ? fromTile.towerId : null;
    const oldToTowerId = toTile ? toTile.towerId : null;
    const oldX = tower.x;
    const oldY = tower.y;

    try {
      if (fromTile) fromTile.towerId = null;
      if (toTile) toTile.towerId = tower.id;
      tower.x = nx;
      tower.y = ny;
      return true;
    } finally {
      tower.x = oldX;
      tower.y = oldY;
      if (fromTile) fromTile.towerId = oldFromTowerId;
      if (toTile) toTile.towerId = oldToTowerId;
    }
  }

  function moveTower(tower, nx, ny) {
    if (isStatueTower(tower)) return false;
    if (!getMoveTargetsForTower(tower).some(p => p.x === nx && p.y === ny)) return false;
    if (!isOpenForTower(nx, ny)) return false;
    if ((tower.type === 'warrior' || isStatueTower(tower)) && !moveWouldPreservePath(tower, nx, ny)) return false;
    tileAt(tower.x, tower.y).towerId = null;
    tower.x = nx;
    tower.y = ny;
    tileAt(nx, ny).towerId = tower.id;
    tower.moveReadyAt = now() + (tower.type === 'warrior' ? 5000 : 30000);
    tower.attackCooldownMs = 1000;
    log(`${tower.name} moved to (${nx + 1}, ${ny + 1}).`);
    return true;
  }

  function existsPathFromBreachToPortal(includeWarrior = false) {
    const starts = getSpawnTiles();
    const targets = getPortalTargets();
    return starts.some(start => bfsHasPath(start, targets, includeWarrior));
  }

  function bfsHasPath(start, targets, includeWarrior = false) {
    const queue = [start];
    const visited = new Set([key(start.x, start.y)]);
    const targetKeys = new Set(targets.map(t => key(t.x, t.y)));
    while (queue.length) {
      const cur = queue.shift();
      if (targetKeys.has(key(cur.x, cur.y))) return true;
      for (const n of adjacentTiles(cur.x, cur.y)) {
        const k = key(n.x, n.y);
        if (visited.has(k)) continue;
        const tile = tileAt(n.x, n.y);
        if (!tile) continue;
        if (isBlockedForPath(tile, includeWarrior)) continue;
        visited.add(k);
        queue.push(n);
      }
    }
    return false;
  }

  function isBlockedForPath(tile, includeWarrior = true) {
    if (tile.obstacle) return true;
    if (tile.portal) return true;
    if (tile.towerId) {
      const tower = game.towers.find(t => t.id === tile.towerId);
      if (tower && tower.type === 'warrior') return true;
      return false;
    }
    return false;
  }

  function getSpawnTiles() {
    const all = [];
    for (const lane of Object.values(BREACH_LANES)) all.push(...lane);
    return all;
  }

  function getPortalTargets() {
    if (!game.portal) return [];
    const targets = [];
    const { x, y } = game.portal;
    const raw = [
      { x: x - 1, y }, { x: x - 1, y: y + 1 },
      { x: x, y: y - 1 }, { x: x + 1, y: y - 1 },
      { x: x + 2, y }, { x: x + 2, y: y + 1 },
      { x: x, y: y + 2 }, { x: x + 1, y: y + 2 },
    ];
    for (const p of raw) {
      if (inBounds(p.x, p.y)) {
        const t = tileAt(p.x, p.y);
        if (!t.portal && !t.obstacle) targets.push(p);
      }
    }
    return targets;
  }

  function getPortalFlowKey() {
    const blockers = game.towers
      .filter(t => t.type === 'warrior')
      .map(t => `${t.x},${t.y},${isStatueTower(t) ? 'statue' : 'warrior'}`)
      .sort()
      .join('|');
    const portal = game.portal ? `${game.portal.x},${game.portal.y}` : 'none';
    return `${portal}::${blockers}`;
  }

  function ensurePortalFlowField() {
    const flowKey = getPortalFlowKey();
    if (game.portalFlowField?.key === flowKey) return game.portalFlowField;
    const portalTargets = getPortalTargets();
    const distances = new Map();
    const queue = [];
    for (const target of portalTargets) {
      const k = key(target.x, target.y);
      distances.set(k, 0);
      queue.push({ x: target.x, y: target.y });
    }
    while (queue.length) {
      const current = queue.shift();
      const currentDistance = distances.get(key(current.x, current.y)) || 0;
      for (const step of adjacentTiles(current.x, current.y)) {
        const tile = tileAt(step.x, step.y);
        if (!tile || isBlockedForPath(tile, true)) continue;
        const stepKey = key(step.x, step.y);
        if (distances.has(stepKey)) continue;
        distances.set(stepKey, currentDistance + 1);
        queue.push(step);
      }
    }
    game.portalFlowField = { key: flowKey, distances };
    return game.portalFlowField;
  }

  function getPortalFlowDistance(x, y) {
    const flow = ensurePortalFlowField();
    return flow?.distances?.get(key(x, y)) ?? Number.POSITIVE_INFINITY;
  }

  function getPortalFlowStep(enemy, options = {}) {
    const allowReverse = !!options.allowReverse;
    const currentDistance = getPortalFlowDistance(enemy.x, enemy.y);
    const steps = adjacentTiles(enemy.x, enemy.y)
      .filter(step => canEnemyEnter(step.x, step.y, enemy))
      .map(step => {
        const distanceScore = getPortalFlowDistance(step.x, step.y);
        const occupancyPenalty = getEnemyOccupancyPenalty(enemy, step.x, step.y, false);
        const reversePenalty = (!allowReverse && enemy.prevX === step.x && enemy.prevY === step.y && !(enemy.prevX === enemy.x && enemy.prevY === enemy.y)) ? 2 : 0;
        return {
          ...step,
          score: distanceScore + occupancyPenalty + reversePenalty,
          distanceScore,
        };
      })
      .filter(step => Number.isFinite(step.score))
      .sort((a, b) => a.score - b.score);
    const best = steps[0] || null;
    if (!best) return null;
    if (Number.isFinite(currentDistance) && best.distanceScore > currentDistance && !allowReverse) return null;
    return { x: best.x, y: best.y };
  }

  function moveEnemyToStep(enemy, step, current) {
    if (!step) return false;
    if (!canEnemyEnter(step.x, step.y, enemy)) return false;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    enemy.x = step.x;
    enemy.y = step.y;
    enemy.moveStartedAt = current;
    enemy.moveEndAt = current + getEnemyMoveMs(enemy);
    enemy.nextMoveAt = enemy.moveEndAt;
    enemy.attacking = false;
    enemy.targetPath = [];
    enemy.stuckAt = 0;
    enemy.lastProgressAt = current;
    markProgress(`${enemy.name} moved.`);
    return true;
  }

  function getEnemyTileCapacity(enemy, x, y) {
    const tile = tileAt(x, y);
    if (!tile || tile.portal || tile.obstacle) return 0;
    if (enemy?.isBoss) return 9999;
    return ENEMY_TILE_LIMIT;
  }

  function getEnemyOccupancyPenalty(enemy, x, y, isTarget = false) {
    const occupants = getEnemyOccupancy(x, y, enemy?.id || null);
    const cap = getEnemyTileCapacity(enemy, x, y);
    if (cap <= 0) return Number.POSITIVE_INFINITY;
    if (occupants <= 0) return 0;
    if (occupants >= cap && !isTarget) return Number.POSITIVE_INFINITY;
    const pressure = occupants / cap;
    return pressure >= 1 ? 50 : pressure * 8;
  }

  function pathfind(start, targets, options = {}) {
    const enemy = options.enemy || null;
    const avoidBacktrack = options.avoidBacktrack !== false;
    const softCrowd = options.softCrowd !== false;
    const targetKeys = new Set(targets.map(t => key(t.x, t.y)));
    const startKey = key(start.x, start.y);
    const frontier = [{ x: start.x, y: start.y, priority: 0 }];
    const cameFrom = new Map();
    const costSoFar = new Map([[startKey, 0]]);
    while (frontier.length) {
      frontier.sort((a, b) => a.priority - b.priority);
      const current = frontier.shift();
      const currentKey = key(current.x, current.y);
      if (targetKeys.has(currentKey)) {
        return reconstructPath(cameFrom, { x: current.x, y: current.y }, start);
      }
      const next = adjacentTiles(current.x, current.y).sort((a, b) => heuristic(a, targets) - heuristic(b, targets));
      for (const n of next) {
        const k = key(n.x, n.y);
        const tile = tileAt(n.x, n.y);
        if (!tile) continue;
        if (isBlockedForPath(tile, true)) continue;
        const isTarget = targetKeys.has(k);
        const penalty = softCrowd ? getEnemyOccupancyPenalty(enemy, n.x, n.y, isTarget) : 0;
        if (!Number.isFinite(penalty)) continue;
        let stepCost = 1 + penalty;
        if (avoidBacktrack && enemy && enemy.prevX === n.x && enemy.prevY === n.y && !(enemy.x === enemy.prevX && enemy.y === enemy.prevY)) {
          stepCost += 2.5;
        }
        const newCost = (costSoFar.get(currentKey) || 0) + stepCost;
        if (!costSoFar.has(k) || newCost < costSoFar.get(k)) {
          costSoFar.set(k, newCost);
          cameFrom.set(k, { x: current.x, y: current.y });
          frontier.push({
            x: n.x,
            y: n.y,
            priority: newCost + heuristic(n, targets),
          });
        }
      }
    }
    return null;
  }

  function reconstructPath(cameFrom, current, start) {
    const path = [current];
    let cur = current;
    while (key(cur.x, cur.y) !== key(start.x, start.y)) {
      cur = cameFrom.get(key(cur.x, cur.y));
      if (!cur) break;
      path.push(cur);
    }
    path.reverse();
    return path;
  }

  function heuristic(point, targets) {
    return Math.min(...targets.map(t => Math.abs(t.x - point.x) + Math.abs(t.y - point.y)));
  }

  function prepareNextWave() {
    // allow hiring during waves

    game.nextWavePlan = buildWavePlan(game.waveNumber + 1);
    const mutationText = game.nextWavePlan.mutation ? ` • Mutation: ${game.nextWavePlan.mutation.name}` : '';
    const rebuildText = canStartBarrierRebuild(false) ? ` Barrier rebuild is available for ${formatJewel(BARRIER_REBUILD_COST)} Gold.` : '';
    const relicText = game.startingRelicPending ? ' Choose 1 free starting relic before wave 1 begins.' : '';
    setInstruction(`Wave ${game.waveNumber + 1} ready. Pattern: ${prettyPattern(game.nextWavePlan.pattern)}${mutationText}. Spend Gold, move towers, or start the wave.${game.bonusHeroHireCharges > 0 ? ` ${game.bonusHeroHireCharges} extra hero hire${game.bonusHeroHireCharges === 1 ? ' is' : 's are'} available.` : ''}${rebuildText}${relicText}`);
    els.startWaveBtn.disabled = !!game.startingRelicPending;
    updateTopbar();
      updateMobileBoardFit();
    render();
  }

  function buildWavePlan(waveNumber) {
    if (waveNumber % 5 === 0) {
      return { waveNumber, pattern: 'boss', mutation: null, enemies: buildBossWave(waveNumber), sizeMultiplier: 1 };
    }

    let mutation = null;
    const wavePlan = { waveNumber, pattern: choosePattern(), mutation: null, enemies: [], sizeMultiplier: 1 };
    if (waveNumber % 3 === 0) {
      mutation = chooseMutation();
      wavePlan.mutation = mutation;
      if (mutation.waveModifier) mutation.waveModifier(wavePlan);
    }
    wavePlan.enemies = buildStandardWave(waveNumber, wavePlan.pattern, wavePlan.sizeMultiplier);
    return wavePlan;
  }

  function choosePattern() {
    const roll = Math.random();
    if (roll < 0.4) return 'uniform';
    if (roll < 0.75) return 'lane';
    return 'burst';
  }

  function chooseMutation() {
    const excluded = new Set(game.recentMutations);
    const pool = MUTATIONS.filter(m => !excluded.has(m.id));
    const mutation = pickRandom(pool.length ? pool : MUTATIONS);
    game.recentMutations.push(mutation.id);
    if (game.recentMutations.length > 2) game.recentMutations.shift();
    return mutation;
  }

  function chooseLane() {
    let lane = pickRandom(LANE_NAMES);
    if (game.recentLanes.length >= 2 && game.recentLanes[0] === lane && game.recentLanes[1] === lane) {
      lane = pickRandom(LANE_NAMES.filter(l => l !== lane));
    }
    game.recentLanes.unshift(lane);
    game.recentLanes = game.recentLanes.slice(0, 2);
    return lane;
  }

  function getStandardWaveEnemyCount(waveNumber, sizeMultiplier = 1) {
    const countMultiplier = sizeMultiplier * getPostWave15CountMultiplier(waveNumber);
    return Math.round((6 + waveNumber * 2) * countMultiplier);
  }

  function buildStandardWave(waveNumber, pattern, sizeMultiplier) {
    const baseCount = getStandardWaveEnemyCount(waveNumber, sizeMultiplier);
    const enemies = [];
    if (pattern === 'lane') {
      const lane = chooseLane();
      for (let i = 0; i < baseCount; i += 1) {
        const laneName = i < Math.round(baseCount * 0.7) ? lane : pickRandom(LANE_NAMES.filter(l => l !== lane));
        enemies.push({ type: chooseEnemyType(waveNumber), lane: laneName, delayMs: i * 500 });
      }
    } else if (pattern === 'burst') {
      let delay = 0;
      for (let i = 0; i < baseCount; i += 1) {
        const burstIndex = i % 4;
        if (burstIndex === 0 && i > 0) delay += 1400;
        enemies.push({ type: chooseEnemyType(waveNumber), lane: pickRandom(LANE_NAMES), delayMs: delay + burstIndex * 180 });
      }
    } else {
      for (let i = 0; i < baseCount; i += 1) {
        enemies.push({ type: chooseEnemyType(waveNumber), lane: pickRandom(LANE_NAMES), delayMs: i * 600 });
      }
    }
    return enemies;
  }

  function buildBossWave(waveNumber) {
    const boss = BOSSES[(waveNumber / 5 - 1) % BOSSES.length];
    const lane = chooseLane();
    const bossCount = waveNumber >= 30 ? 2 : 1;
    const enemies = [];
    for (let i = 0; i < bossCount; i += 1) {
      enemies.push({ bossId: boss.id, lane, delayMs: 100 + (i * 900) });
    }
    const skitterMultiplier = waveNumber >= 30 ? 2 : 1.5;
    const skitterCount = Math.max(6, Math.round(getStandardWaveEnemyCount(waveNumber, 1) * skitterMultiplier));
    for (let i = 0; i < skitterCount; i += 1) {
      enemies.push({ type: 'skitter', lane, delayMs: 500 + (i * 120), bossWaveSkitter: true });
    }
    return enemies;
  }

  function chooseEnemyType(waveNumber) {
    if (waveNumber < 3) return 'grunt';
    if (waveNumber < 5) return chance(0.2) ? 'runner' : 'grunt';

    let bruteChance = waveNumber < 8 ? 0.25 : 0.25;
    let runnerChance = waveNumber < 8 ? 0.25 : 0.30;

    if (waveNumber > 20) {
      runnerChance = Math.min(0.9, runnerChance * 2);
    }

    if (chance(bruteChance)) return 'brute';
    return chance(runnerChance) ? 'runner' : 'grunt';
  }

  function startWave() {
    if (!game.nextWavePlan || game.runningWave || game.phase !== SETUP_PHASES.BATTLE || game.startingRelicPending) return;
    game.waveNumber = game.nextWavePlan.waveNumber;
    game.runningWave = true;
    game.currentPattern = game.nextWavePlan.pattern;
    game.activeMutation = game.nextWavePlan.mutation;
    game.pendingSpawns = game.nextWavePlan.enemies.map(item => ({ ...item, spawned: false }));
    game.waveStartAt = now();
    game.nextWavePlan = null;
    game.relicChoices = [];
    setInstruction(`Wave ${game.waveNumber} is live. Defend the portal.`);
    els.startWaveBtn.disabled = true;
    const mutationText = game.activeMutation ? ` • ${game.activeMutation.name}` : '';
    showBanner(`Wave ${game.waveNumber}: ${prettyPattern(game.currentPattern)}${mutationText}`, 2200);
    markProgress(`Wave ${game.waveNumber} started.`);
    log(`Wave ${game.waveNumber} started. Pattern: ${prettyPattern(game.currentPattern)}${mutationText ? `, Mutation: ${game.activeMutation.name}` : ''}.`);
    render();
  }


  function getWaveHpMultiplier(waveNumber) {
    if (waveNumber < 20) return 1;
    return Math.pow(1.2, Math.floor((waveNumber - 20) / 10) + 1);
  }

  function getWaveDamageMultiplier(waveNumber) {
    const base = waveNumber > 20 ? 1.15 : 1;
    return (waveNumber || 0) <= 10 ? base * 0.9 : base;
  }

  function getWaveEnemyCountMultiplier(waveNumber) {
    if (waveNumber <= 15) return 1;
    return 1 + (Math.floor((waveNumber - 16) / 5) + 1) * 0.2;
  }

  function getRunnerSpeedMultiplier(waveNumber) {
    return waveNumber > 15 ? 1.1 : 1;
  }

  function getLargeEnemySpeedMultiplier(waveNumber) {
    const waveBoost = waveNumber <= 10 ? 1 : Math.min(1.25, 1 + ((waveNumber - 10) * 0.02));
    return waveBoost * 1.15;
  }

  function getBruteHpMultiplier(waveNumber) {
    return waveNumber > 15 ? 1.1 : 1;
  }

  function isEarlyWave(waveNumber) {
    return waveNumber <= 10;
  }

  function getEarlyWaveStatMultiplier(waveNumber) {
    return isEarlyWave(waveNumber) ? 0.9 : 1;
  }

  function getEarlyWaveSpeedMultiplier(waveNumber) {
    return isEarlyWave(waveNumber) ? 0.9 : 1;
  }

  function getEarlyWaveGoldMultiplier(waveNumber) {
    return isEarlyWave(waveNumber) ? 1.25 : 1;
  }

  function spawnEnemyFromPlan(plan) {
    let enemy;
    if (plan.bossId) {
      const boss = BOSSES.find(b => b.id === plan.bossId);
      enemy = createBossEnemy(boss, plan.lane);
    } else {
      enemy = createEnemy(plan.type, plan.lane);
    }
    if (game.activeMutation && game.activeMutation.apply) game.activeMutation.apply(enemy);
    enemy.spawnMaxHp = enemy.maxHp;
    enemy.visualSizePx = computeEnemyVisualSizeFromSpawnHp(enemy.spawnMaxHp);

    const waveHpMultiplier = getWaveHpMultiplier(game.waveNumber || 0);
    enemy.hp *= waveHpMultiplier;
    enemy.maxHp *= waveHpMultiplier;
    enemy.spawnMaxHp = enemy.maxHp;
    enemy.damage *= getWaveDamageMultiplier(game.waveNumber || 0);
    if (enemy.type === 'skitter' && plan.bossWaveSkitter) {
      enemy.isBossWaveSkitter = true;
      enemy.moveInterval *= 3;
    }
    if (enemy.typeClass === 'runner') {
      enemy.moveInterval /= getRunnerSpeedMultiplier(game.waveNumber || 0);
    }
    if (enemy.typeClass === 'brute') {
      const bruteHpMultiplier = getBruteHpMultiplier(game.waveNumber || 0) * BIG_ENEMY_HP_MULTIPLIER;
      enemy.hp *= bruteHpMultiplier;
      enemy.maxHp *= bruteHpMultiplier;
      enemy.spawnMaxHp = enemy.maxHp;
    }
    enemy.moveInterval /= getEarlyWaveSpeedMultiplier(game.waveNumber || 0);
    if (enemy.isBoss) {
      enemy.moveInterval /= (1.25 * BIG_ENEMY_SPEED_MULTIPLIER);
    }
    if (enemy.isBoss || enemy.typeClass === 'brute') {
      enemy.moveInterval /= (getLargeEnemySpeedMultiplier(game.waveNumber || 0) * BIG_ENEMY_SPEED_MULTIPLIER);
    }

        game.enemies.push(enemy);
    markProgress(`Spawned ${enemy.name}.`);
  }

  function getPostWave15StatMultiplier(waveNumber) {
    return waveNumber > 15 ? 1.25 : 1;
  }

  function getPostWave15CountMultiplier(waveNumber) {
    if (waveNumber >= 15 && waveNumber <= 30) return 1.35;
    return waveNumber > 30 ? 1.5 : 1;
  }

  function createEnemy(type, laneName) {
    const template = ENEMY_TEMPLATES[type];
    const lane = BREACH_LANES[laneName];
    const spawn = pickRandom(lane);
    const earlyWaveMultiplier = getEarlyWaveStatMultiplier(game.waveNumber);
    const postWave15StatMultiplier = getPostWave15StatMultiplier(game.waveNumber);
    const isSmallOrMediumEnemy = type === 'grunt' || type === 'runner';
    const hpCurvePerWave = isSmallOrMediumEnemy ? 0.132 : 0.12;
    const enemyHp = template.hp * (1 + Math.max(0, game.waveNumber - 1) * hpCurvePerWave) * earlyWaveMultiplier * postWave15StatMultiplier;
    const enemyDamage = template.damage * (1 + Math.max(0, game.waveNumber - 1) * 0.08) * earlyWaveMultiplier * postWave15StatMultiplier;
    return {
      id: `e${game.nextEnemyId++}`,
      type,
      name: template.name,
      x: spawn.x,
      y: spawn.y,
      hp: enemyHp,
      maxHp: enemyHp,
      damage: enemyDamage,
      moveInterval: template.moveInterval,
      attackInterval: template.attackInterval,
      jewel: template.jewel * ENEMY_JEWEL_MULTIPLIER * getEarlyWaveGoldMultiplier(game.waveNumber),
      cssClass: template.typeClass,
      targetPath: [],
      nextMoveAt: now() + 200,
      moveStartedAt: now(),
      moveEndAt: now() + 200,
      prevX: spawn.x,
      prevY: spawn.y,
      nextAttackAt: 0,
      attacking: false,
      tauntedTo: null,
      tauntUntil: 0,
      debuffs: {},
      buffs: {},
      threat: {},
      aggroTargetId: null,
      lastAggroAt: 0,
      lastPortalFlowKey: null,
      isBoss: false,
      slowResistance: 0,
      isBossWaveSkitter: false,
    };
  }

  function createBossEnemy(boss, laneName) {
    const lane = BREACH_LANES[laneName];
    const spawn = pickRandom(lane);
    return {
      id: `e${game.nextEnemyId++}`,
      type: boss.id,
      name: boss.name,
      x: spawn.x,
      y: spawn.y,
      hp: boss.hp * getEarlyWaveStatMultiplier(game.waveNumber) * BIG_ENEMY_HP_MULTIPLIER,
      maxHp: boss.hp * getEarlyWaveStatMultiplier(game.waveNumber) * BIG_ENEMY_HP_MULTIPLIER,
      damage: boss.damage * getEarlyWaveStatMultiplier(game.waveNumber),
      moveInterval: boss.moveInterval,
      attackInterval: boss.attackInterval,
      jewel: boss.jewel * ENEMY_JEWEL_MULTIPLIER * getEarlyWaveGoldMultiplier(game.waveNumber),
      cssClass: 'boss',
      targetPath: [],
      nextMoveAt: now() + 300,
      moveStartedAt: now(),
      moveEndAt: now() + 300,
      prevX: spawn.x,
      prevY: spawn.y,
      nextAttackAt: 0,
      attacking: false,
      tauntedTo: null,
      tauntUntil: 0,
      debuffs: {},
      buffs: {},
      threat: {},
      aggroTargetId: null,
      lastAggroAt: 0,
      lastPortalFlowKey: null,
      isBoss: true,
      bossTemplate: boss,
      nextAbilityAt: now() + boss.abilityInterval * 1000,
      slowResistance: 0,
    };
  }

  function canEnemyEnterIgnoringCrowd(x, y, enemy) {
    if (!inBounds(x, y)) return false;
    const tile = tileAt(x, y);
    if (!tile || tile.obstacle || tile.portal) return false;
    if (tile.towerId) {
      const tower = game.towers.find(t => t.id === tile.towerId);
      return !tower || (tower.type !== 'warrior' && !isStatueTower(tower));
    }
    return true;
  }

  function tryResolveEnemyStall(enemy, current) {
    const candidates = adjacentTiles(enemy.x, enemy.y)
      .filter(step => canEnemyEnterIgnoringCrowd(step.x, step.y, enemy))
      .map(step => {
        const flowDistance = getPortalFlowDistance(step.x, step.y);
        const reversePenalty = (enemy.prevX === step.x && enemy.prevY === step.y && !(enemy.prevX === enemy.x && enemy.prevY === enemy.y)) ? 2 : 0;
        const occupancyPenalty = Math.max(0, getEnemyOccupancy(step.x, step.y, enemy.id) / Math.max(1, getEnemyTileCapacity(enemy, step.x, step.y)));
        return {
          ...step,
          score: flowDistance + reversePenalty + occupancyPenalty,
          flowDistance,
        };
      })
      .filter(step => Number.isFinite(step.score))
      .sort((a, b) => a.score - b.score);
    const bestStep = candidates[0];
    if (!bestStep) return false;
    enemy.tauntedTo = null;
    enemy.tauntUntil = 0;
    enemy.aggroTargetId = null;
    enemy.targetPath = [];
    enemy.navMode = 'portal';
    enemy.navCommitUntil = current + 600;
    enemy.lastStallRecoveryAt = current;
    moveEnemyToStep(enemy, bestStep, current);
    enemy.moveEndAt = current + Math.min(220, getEnemyMoveMs(enemy));
    enemy.nextMoveAt = enemy.moveEndAt;
    markProgress(`${enemy.name} recovered forward movement.`);
    return true;
  }

  function attemptResolveBattleStall(current) {
    let rescued = false;
    for (const enemy of game.enemies) {
      if (tryResolveEnemyStall(enemy, current)) rescued = true;
    }
    if (rescued) {
      log('Deadlock breaker moved stalled enemies forward.');
      render();
    }
    return rescued;
  }

  function update() {
    if (game.phase === SETUP_PHASES.GAME_OVER) return;
    const current = now();
    const delta = current - game.lastTick;
    game.lastTick = current;
    if (game.paused) {
      game.diagnostics.lastProgressAt = current;
      return;
    }

    if (game.runningWave && game.pendingSpawns) {
      const elapsed = current - game.waveStartAt;
      for (const plan of game.pendingSpawns) {
        if (!plan.spawned && elapsed >= plan.delayMs) {
          spawnEnemyFromPlan(plan);
          plan.spawned = true;
        }
      }
    }

    for (const tower of game.towers) updateTower(tower, delta, current);
    for (const enemy of [...game.enemies]) updateEnemy(enemy, current);
    cleanupEntities();

    if (!game.runningWave && game.countdownMs > 0) {
      game.countdownMs = Math.max(0, game.countdownMs - delta);
      if (game.countdownMs <= 0) prepareNextWave();
    }

    if (game.runningWave && allSpawnsDone() && game.enemies.length === 0) {
      finishWave();
    }

    const progressHash = buildProgressHash();
    if (progressHash !== game.diagnostics.lastProgressHash) {
      game.diagnostics.lastProgressHash = progressHash;
      game.diagnostics.lastProgressAt = current;
    } else if (game.runningWave && !game.diagnostics.softLockTriggered && game.enemies.length > 0 && current - game.diagnostics.lastProgressAt > 7000) {
      if (attemptResolveBattleStall(current)) {
        game.diagnostics.lastProgressHash = buildProgressHash();
        game.diagnostics.lastProgressAt = current;
      } else {
        game.diagnostics.softLockTriggered = true;
        showCrashReport('softlock', new Error('No battle-state change for 7 seconds during an active wave.'));
      }
    }

    if (game.portalHp <= 0 && game.phase !== SETUP_PHASES.GAME_OVER) {
      game.phase = SETUP_PHASES.GAME_OVER;
      game.runningWave = false;
      setInstruction('The portal fell. Start a new run to try again.');
      showBanner('Game Over', 3000);
      markProgress('The portal was destroyed.');
      log('The portal was destroyed.');
      submitCompletedRunOnce('loss');
    }
  }

  function allSpawnsDone() {
    return game.pendingSpawns && game.pendingSpawns.every(s => s.spawned);
  }

  function finishWave() {
    game.runningWave = false;
    game.pendingSpawns = null;
    game.activeMutation = null;
    markProgress(`Wave ${game.waveNumber} cleared.`);
    log(`Wave ${game.waveNumber} cleared.`);
    if (game.waveNumber === 5 && !game.milestoneJewelsGranted[5]) {
      game.milestoneJewelsGranted[5] = true;
      awardPremiumJewels(1, 'Wave 5 reward');
    }
    if (game.waveNumber === 10 && !game.milestoneJewelsGranted[10]) {
      game.milestoneJewelsGranted[10] = true;
      awardPremiumJewels(2, 'Wave 10 reward');
    }
    if (game.waveNumber === 15 && !game.milestoneJewelsGranted[15]) {
      game.milestoneJewelsGranted[15] = true;
      awardPremiumJewels(5, 'Wave 15 reward');
    }
    if (game.waveNumber > 0 && game.waveNumber % 5 === 0) {
      const unlockedWarriors = game.towers.filter(t => t.type === 'warrior' && !t.isSatellite && isAbilityUnlocked(t, 'new_blood'));
      for (const warrior of unlockedWarriors) {
        warrior.satelliteCharges = Math.min(1, (warrior.satelliteCharges || 0) + 1);
      }
      if (unlockedWarriors.length) {
        showBanner(`Statue: +1 charge ready${unlockedWarriors.length > 1 ? ' for each Warrior' : ''}.`, 2500);
        log(`Statue triggered after wave ${game.waveNumber}: +1 charge${unlockedWarriors.length > 1 ? ' for each Warrior' : ''}.`);
      }
    }
    if (game.waveNumber > 0 && game.waveNumber % 12 === 0) {
      const unlockedArchers = game.towers.filter(t => t.type === 'archer' && !t.isSatellite && isAbilityUnlocked(t, 'eagle_nest'));
      for (const archer of unlockedArchers) {
        archer.satelliteCharges = Math.min(1, (archer.satelliteCharges || 0) + 1);
      }
      if (unlockedArchers.length) {
        showBanner(`Eagle Nest: +1 Satellite Archer charge ready${unlockedArchers.length > 1 ? ' for each Archer' : ''}.`, 2500);
        log(`Eagle Nest triggered after wave ${game.waveNumber}: +1 Satellite Archer charge${unlockedArchers.length > 1 ? ' for each Archer' : ''}.`);
      }
    }
    if (game.waveNumber > 0 && game.waveNumber % 25 === 0) {
      game.bonusHeroHireCharges += 1;
      showBanner(`Milestone reward: +1 extra hero hire unlocked (${game.bonusHeroHireCharges} available).`, 3000);
      log(`Milestone reward unlocked after wave ${game.waveNumber}: +1 extra hero hire (now ${game.bonusHeroHireCharges} available).`);
    }
    dissipateExpiredSatelliteArchers();
    if (game.waveNumber % 7 === 0) {
      offerRelics();
      setInstruction(`Wave ${game.waveNumber} cleared. Relic shop is open. You can buy one relic or skip.${game.bonusHeroHireCharges > 0 ? ` You can also use ${game.bonusHeroHireCharges} extra hero hire${game.bonusHeroHireCharges === 1 ? '' : 's'}.` : ''}`);
    } else {
      setCountdown(WAVE_BREAK_SECONDS);
    }
    render();
  }

  function setCountdown(seconds) {
    game.countdownMs = seconds * 1000;
    setInstruction(`Preparation phase. Next wave in ${seconds}s unless you start it early.`);
    prepareNextWave();
  }

  function offerStartingRelic() {
    const pool = RELICS.filter(r => !game.ownedRelics.includes(r.id));
    const choices = [];
    while (choices.length < Math.min(3, pool.length)) {
      const relic = pickRandom(pool.filter(r => !choices.some(c => c.id === r.id)));
      if (!relic) break;
      choices.push(relic);
    }
    game.startingRelicPending = true;
    game.relicChoices = choices;
    els.startWaveBtn.disabled = true;
    showBanner('Choose 1 free starting relic', 2500);
  }

  function offerRelics() {
    const pool = RELICS.filter(r => !game.ownedRelics.includes(r.id));
    const choices = [];
    while (choices.length < Math.min(3, pool.length)) {
      const relic = pickRandom(pool.filter(r => !choices.some(c => c.id === r.id)));
      if (!relic) break;
      choices.push(relic);
    }
    game.relicChoices = choices;
    showBanner('Relic Shop Open', 2500);
  }

  function buyRelic(id) {
    const relic = game.relicChoices.find(r => r.id === id);
    if (!relic) return;
    const isFreeStartingRelic = game.startingRelicPending;
    if (!isFreeStartingRelic && game.jewel < relic.cost) return;
    if (!isFreeStartingRelic) game.jewel -= relic.cost;
    game.ownedRelics.push(relic.id);
    relic.apply(game);
    game.relicChoices = [];
    markProgress(`${isFreeStartingRelic ? 'Chose' : 'Bought'} relic: ${relic.name}.`);
    log(`${isFreeStartingRelic ? 'Chose free starting relic' : 'Bought relic'}: ${relic.name}.`);
    showBanner(`${isFreeStartingRelic ? 'Starting relic:' : 'Bought relic:'} ${relic.name}`);
    if (isFreeStartingRelic) {
      game.startingRelicPending = false;
      prepareNextWave();
    } else {
      setCountdown(WAVE_BREAK_SECONDS);
    }
    if (els.relicModal) els.relicModal.classList.add('hidden');
    render();
  }

  function buffTowerType(gameState, type, opts) {
    for (const tower of gameState.towers.filter(t => t.type === type)) {
      if (opts.hpMult) {
        const pct = tower.hp / tower.maxHp;
        tower.maxHp *= opts.hpMult;
        tower.hp = opts.healToMatchPercent ? tower.maxHp * pct : tower.hp;
      }
      if (opts.damageMult) tower.damage *= opts.damageMult;
      if (opts.speedMult) tower.basicCooldown /= opts.speedMult;
    }
  }

  function tryAutoCastMobileAbility(tower, current) {
    if (!game.mobileMode || game.phase === SETUP_PHASES.GAME_OVER) return false;
    const autoDelayMs = 6000;
    for (const ability of tower.abilities) {
      if (ability.passive) continue;
      if (!isAbilityUnlocked(tower, ability.key)) continue;
      const readyAt = tower.abilityReadyAt[ability.key] || 0;
      if (current < readyAt + autoDelayMs) continue;
      if (castAbility(tower, ability.key, { silent: true, auto: true })) return true;
    }
    return false;
  }

  function updateTower(tower, delta, current) {
    getActiveSlowTotems();
    tickEffects(tower, current);
    tower.attackCooldownMs = Math.max(0, tower.attackCooldownMs - delta);

    if (tower.type === 'wizard' && isAbilityUnlocked(tower, 'frost_bolt')) {
      const tickAt = tower.iceAuraTickAt || 0;
      if (current >= tickAt) {
        const iceRange = ICE_AURA_BASE_RANGE + (tower.level >= 15 ? ICE_AURA_BONUS_RANGE_AT_LEVEL_15 : 0);
        const icePercent = ICE_AURA_BASE_SLOW + ((tower.level - 1) * ICE_AURA_SLOW_PER_LEVEL);
        const targets = game.enemies
          .filter(e => dist(e, tower) <= iceRange)
          .sort((a, b) => dist(tower, a) - dist(tower, b))
          .slice(0, 10);
        for (const target of targets) applyDebuff(target, 'slow', 3, { percent: icePercent });
        if (targets.length) {
          const tiles = targets.map(t => ({ x: t.x, y: t.y }));
          createTileFlashArea(tiles, 'wizard');
        }
        tower.iceAuraTickAt = current + 1000;
      }
    }

    if (isStatueTower(tower)) return;

    if (tryAutoCastMobileAbility(tower, current)) return;

    if (!tower.template.autoAttack || tower.attackCooldownMs > 0 || game.phase === SETUP_PHASES.GAME_OVER) return;
    if (tower.type === 'priest') {
      autoPriestHeal(tower);
      return;
    }
    const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
    if (!target) return;
    let damage = tower.damage;
    if (tower.type === 'archer' && game.modifiers.rangerLine && isBehindWarrior(tower)) damage *= 1.10;
    if (target.debuffs.warning_shot) damage *= 1.2;
    if (target.debuffs.eagle_nest) damage += 2;
    damageEnemy(tower, target, damage, `${tower.name} hit ${target.name}`);
    tower.basicAttackCount = (tower.basicAttackCount || 0) + 1;
    if (tower.type === 'warrior' && isAbilityUnlocked(tower, 'gladiator_strike') && tower.basicAttackCount % 9 === 0) {
      damageEnemy(tower, target, tower.damage * 2, `${tower.name} triggered Gladiator Strike`);
      healTower(tower, tower.maxHp * 0.05, `${tower.name} healed from Gladiator Strike`);
      showBanner('Warrior passive: Gladiator Strike');
    }
    if (tower.type === 'pirate' && tower.basicAttackCount % 10 === 0) {
      applyDebuff(target, 'bleed', 10, { damagePercent: 0.03, percent: 0.05, nextTickAt: now() + 1000 });
      showBanner('Bloody Bastard: Bloody Bastard');
    }
    tower.attackCooldownMs = tower.getAttackInterval() * 1000;
  }

  function getWarriorTowers() {
    return game.towers.filter(t => t.type === 'warrior');
  }

  function getNearestWarriorTo(unit) {
    const warriors = getWarriorTowers();
    if (!warriors.length) return null;
    return warriors.slice().sort((a, b) => dist(unit, a) - dist(unit, b))[0] || null;
  }

  function getReachableWarriorPlan(enemy) {
    const warriors = getWarriorTowers().slice().sort((a, b) => dist(enemy, a) - dist(enemy, b));
    for (const warrior of warriors) {
      if (chebyshevDist(enemy, warrior) <= 1) {
        return { warrior, attackNow: true, path: null };
      }
      const warriorAdj = getTowerApproachTiles(warrior);
      if (!warriorAdj.length) continue;
      const warriorPath = pathfind({ x: enemy.x, y: enemy.y }, warriorAdj, { enemy, avoidBacktrack: true, softCrowd: true });
      if (warriorPath && warriorPath.length > 1) {
        return { warrior, attackNow: false, path: warriorPath };
      }
    }
    return null;
  }

  function isBehindWarrior(tower) {
    const warrior = getNearestWarriorTo(tower);
    return !!warrior && tower.x > warrior.x && Math.abs(tower.y - warrior.y) <= 1;
  }

  function autoPriestHeal(tower) {
    if (isAbilityUnlocked(tower, 'healing_aura')) {
      const tickAt = tower.auraTickAt || 0;
      if (now() >= tickAt) {
        const auraTargets = game.towers.filter(t => t.id !== tower.id && !isStatueTower(t) && dist(t, tower) <= 2 && t.hp < t.maxHp);
        const auraHeal = 2 * tower.level;
        auraTargets.forEach(target => healTower(target, auraHeal, null));
        tower.auraTickAt = now() + 1000;
      }
    }
    const allies = game.towers.filter(t => !isStatueTower(t) && dist(t, tower) <= tower.range && t.hp < t.maxHp);
    if (!allies.length) return;
    const target = allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    healTower(target, 25 * game.modifiers.priestHealing, `${tower.name} healed ${target.name}`);
    createTowerLine(tower, target, 'priest');
    tower.attackCooldownMs = tower.getAttackInterval() * 1000;
  }

  function nearestEnemyForWarrior(tower) {
    const enemies = game.enemies.filter(e => chebyshevDist(tower, e) <= 1);
    if (!enemies.length) return null;
    enemies.sort((a, b) => chebyshevDist(tower, a) - chebyshevDist(tower, b) || dist(tower, a) - dist(tower, b));
    return enemies[0] || null;
  }

  function nearestEnemyInRange(tower, range) {
    const enemies = game.enemies.filter(e => dist(tower, e) <= range);
    if (!enemies.length) return null;
    if (tower.type === 'pirate') {
      const nonBleeding = enemies.filter(e => !e.debuffs?.bleed);
      if (nonBleeding.length) {
        nonBleeding.sort((a, b) => dist(tower, a) - dist(tower, b));
        return nonBleeding[0] || null;
      }
    }
    if (tower.type === 'archer' && game.modifiers.senseWeakness) {
      const debuffed = enemies.filter(e => e.debuffs && Object.keys(e.debuffs).length > 0);
      if (debuffed.length) {
        debuffed.sort((a, b) => dist(tower, a) - dist(tower, b));
        return debuffed[0] || null;
      }
    }
    enemies.sort((a, b) => dist(tower, a) - dist(tower, b));
    return enemies[0] || null;
  }


  function getPreferredStatueTarget(enemy) {
    const statues = game.towers
      .filter(t => isStatueTower(t) && t.hp > 0)
      .slice()
      .sort((a, b) => dist(enemy, a) - dist(enemy, b));
    for (const statue of statues) {
      if (dist(enemy, statue) <= 1) return { tower: statue, attackNow: true, path: null };
      const adj = getTowerApproachTiles(statue);
      if (!adj.length) continue;
      const statuePath = pathfind({ x: enemy.x, y: enemy.y }, adj, { enemy, avoidBacktrack: true, softCrowd: true });
      if (statuePath && statuePath.length > 1) return { tower: statue, attackNow: false, path: statuePath };
    }
    return null;
  }

  function getEnemyAggroTarget(enemy, current = now()) {
    const flow = ensurePortalFlowField();
    const flowKey = flow?.key || null;
    if (flowKey && enemy.lastPortalFlowKey && enemy.lastPortalFlowKey !== flowKey) {
      enemy.tauntedTo = null;
      enemy.tauntUntil = 0;
      enemy.aggroTargetId = null;
      enemy.targetPath = [];
      enemy.threat = {};
      enemy.navMode = 'portal';
      enemy.navCommitUntil = current + 350;
      enemy.forcePortalUntil = current + 900;
      return null;
    }
    enemy.lastPortalFlowKey = flowKey;

    const forcePortal = enemy.forcePortalUntil && current < enemy.forcePortalUntil;
    const statuePlan = !forcePortal ? getPreferredStatueTarget(enemy) : null;
    if (statuePlan?.tower) {
      enemy.aggroTargetId = statuePlan.tower.id;
      return statuePlan.tower;
    }
    if (!enemy.threat) return null;
    for (const [tid, value] of Object.entries(enemy.threat)) {
      const next = value * 0.92;
      if (next < 2) delete enemy.threat[tid];
      else enemy.threat[tid] = next;
    }
    let bestId = enemy.aggroTargetId;
    let bestThreat = bestId ? (enemy.threat[bestId] || 0) : 0;
    for (const [tid, value] of Object.entries(enemy.threat)) {
      if (!bestId || value > bestThreat * 2.15) {
        bestId = tid;
        bestThreat = value;
      }
    }
    if (!bestId || bestThreat <= 32) return null;
    const tower = game.towers.find(t => t.id === bestId);
    if (!tower || !canEnemyAggroTower(enemy, tower)) {
      delete enemy.threat[bestId];
      if (enemy.aggroTargetId === bestId) enemy.aggroTargetId = null;
      return null;
    }
    const portalBiasDistance = portalDistance(enemy);
    const towerDistance = Math.abs(enemy.x - tower.x) + Math.abs(enemy.y - tower.y);
    if (towerDistance > portalBiasDistance) {
      if (enemy.aggroTargetId === bestId) enemy.aggroTargetId = null;
      return null;
    }
    enemy.aggroTargetId = tower.id;
    return tower;
  }

  function getTowerApproachTiles(tower) {
    return adjacentTiles(tower.x, tower.y).filter(p => {
      const t = tileAt(p.x, p.y);
      return t && !t.obstacle && !t.portal && (!t.towerId || t.towerId === tower.id);
    });
  }

  function canEnemyAggroTower(enemy, tower) {
    if (!enemy || !tower || tower.hp <= 0) return false;
    if (isStatueTower(tower) || tower.type === 'warrior') return true;
    if (tower.type === 'priest') return false;
    const towerDistance = Math.abs(enemy.x - tower.x) + Math.abs(enemy.y - tower.y);
    return towerDistance <= 1;
  }

  function updateEnemy(enemy, current) {
    tickEffects(enemy, current);

    if (enemy.isBoss && enemy.bossTemplate && current >= enemy.nextAbilityAt) {
      enemy.bossTemplate.useAbility(enemy, game);
      enemy.nextAbilityAt = current + enemy.bossTemplate.abilityInterval * 1000;
    }

    const flowKey = ensurePortalFlowField()?.key || null;
    if (flowKey && enemy.lastPortalFlowKey && enemy.lastPortalFlowKey !== flowKey) {
      enemy.tauntedTo = null;
      enemy.tauntUntil = 0;
      enemy.aggroTargetId = null;
      enemy.targetPath = [];
      enemy.threat = {};
      enemy.navMode = 'portal';
      enemy.navCommitUntil = current + 350;
      enemy.forcePortalUntil = current + 900;
    }
    enemy.lastPortalFlowKey = flowKey;

    const portalTargets = getPortalTargets();
    let attackTarget = null;
    let movedThisTick = false;
    let navMode = 'portal';
    let navTargets = portalTargets;
    const forcePortal = enemy.forcePortalUntil && current < enemy.forcePortalUntil;

    const statuePlan = !forcePortal ? getPreferredStatueTarget(enemy) : null;
    if (statuePlan?.tower) {
      navMode = 'statue';
      if (statuePlan.attackNow) {
        attackTarget = statuePlan.tower;
      } else {
        navTargets = getTowerApproachTiles(statuePlan.tower);
      }
      enemy.tauntedTo = null;
      enemy.tauntUntil = 0;
      enemy.aggroTargetId = statuePlan.tower.id;
    } else if (!forcePortal && enemy.tauntedTo && current < enemy.tauntUntil && game.towers.some(t => t.id === enemy.tauntedTo.id)) {
      navMode = 'taunt';
      const tauntTarget = enemy.tauntedTo;
      if (dist(enemy, tauntTarget) <= 1) {
        attackTarget = tauntTarget;
      } else {
        navTargets = getTowerApproachTiles(tauntTarget);
      }
    } else {
      enemy.tauntedTo = null;
      const aggroTarget = getEnemyAggroTarget(enemy, current);
      if (aggroTarget) {
        navMode = 'aggro';
        if (dist(enemy, aggroTarget) <= 1) {
          attackTarget = aggroTarget;
        } else {
          navTargets = getTowerApproachTiles(aggroTarget);
        }
      }
    }

    const committedMode = enemy.navMode || 'portal';
    const sameMode = committedMode === navMode;
    if (!sameMode && enemy.navCommitUntil && current < enemy.navCommitUntil && committedMode !== 'portal') {
      navMode = committedMode;
      if (committedMode === 'taunt' && enemy.tauntedTo && game.towers.some(t => t.id === enemy.tauntedTo.id)) {
        navTargets = getTowerApproachTiles(enemy.tauntedTo);
        if (dist(enemy, enemy.tauntedTo) <= 1) attackTarget = enemy.tauntedTo;
      } else if (committedMode === 'aggro' && enemy.aggroTargetId) {
        const committedTarget = game.towers.find(t => t.id === enemy.aggroTargetId);
        if (committedTarget) {
          navTargets = getTowerApproachTiles(committedTarget);
          if (dist(enemy, committedTarget) <= 1) attackTarget = committedTarget;
        }
      }
    } else {
      enemy.navMode = navMode;
      enemy.navCommitUntil = current + (navMode === 'portal' ? 220 : 550);
    }

    if (!attackTarget && current >= enemy.nextMoveAt && !enemy.debuffs.rooted) {
      let nextStep = null;
      if (navMode === 'portal') {
        nextStep = getPortalFlowStep(enemy);
      } else if (navTargets?.length) {
        const path = pathfind({ x: enemy.x, y: enemy.y }, navTargets, { enemy, avoidBacktrack: true, softCrowd: true });
        if (path && path.length > 1) {
          enemy.targetPath = path;
          nextStep = path[1];
        }
      }
      if (!nextStep && !attackTarget) {
        const warriorPlan = getReachableWarriorPlan(enemy);
        if (warriorPlan?.attackNow) {
          attackTarget = warriorPlan.warrior;
        } else if (!getPortalFlowStep(enemy, { allowReverse: true }) && warriorPlan?.path?.length > 1) {
          enemy.navMode = 'warrior';
          enemy.navCommitUntil = current + 350;
          enemy.targetPath = warriorPlan.path;
          nextStep = warriorPlan.path[1];
        }
      }
      if (nextStep) {
        movedThisTick = moveEnemyToStep(enemy, nextStep, current);
        if (!movedThisTick) {
          enemy.targetPath = [];
          enemy.nextMoveAt = current + 120;
        }
      }
    }

    if (!attackTarget && portalTargets.some(t => t.x === enemy.x && t.y === enemy.y)) {
      attackTarget = { portal: true };
    }

    if (attackTarget) {
      enemy.attacking = true;
      enemy.stuckAt = 0;
      if (current >= enemy.nextAttackAt) {
        if (attackTarget.portal) {
          game.portalHp -= enemy.damage;
          markProgress(`${enemy.name} hit the portal.`);
          log(`${enemy.name} hit the portal for ${Math.round(enemy.damage)}.`);
        } else if (enemy.type === 'skitter') {
          const splashDamage = ENEMY_TEMPLATES.skitter.damage * SKITTER_EXPLOSION_DAMAGE_MULTIPLIER * getWaveDamageMultiplier(game.waveNumber || 0);
          damageTower(game, attackTarget, splashDamage, `${enemy.name} exploded on ${attackTarget.name}`);
          enemy.hp = 0;
          markProgress(`${enemy.name} exploded on ${attackTarget.name}.`);
          log(`${enemy.name} exploded on ${attackTarget.name} for ${Math.round(splashDamage)}.`);
        } else {
          damageTower(game, attackTarget, enemy.damage, `${enemy.name} hit ${attackTarget.name}`);
          markProgress(`${enemy.name} hit ${attackTarget.name}.`);
        }
        enemy.nextAttackAt = current + enemy.attackInterval * 1000;
      }
    } else if (!movedThisTick && !enemy.debuffs.rooted) {
      if (!enemy.stuckAt) enemy.stuckAt = current;
      if (current - enemy.stuckAt >= 900) {
        tryResolveEnemyStall(enemy, current);
      }
    } else {
      enemy.stuckAt = 0;
    }
  }
  function getEnemySlowPercent(enemy) {
    let total = 0;
    if (enemy.debuffs.slow) total += enemy.debuffs.slow.percent || 0.3;
    if (enemy.debuffs.kraken) total += enemy.debuffs.kraken.percent || 0;
    if (enemy.debuffs.bleed) total += enemy.debuffs.bleed.percent || 0;
    total += getSlowTotemSlowPercent(enemy);
    return total;
  }

  function getEnemyMoveMs(enemy) {
    let mult = 1;
    const slowPercent = getEnemySlowPercent(enemy);
    if (slowPercent > 0) mult *= (1 + (slowPercent * (1 - enemy.slowResistance)));
    return enemy.moveInterval * 1000 * mult;
  }

  function getEnemyOccupancy(x, y, ignoreEnemyId = null) {
    return game.enemies.filter(e => e.id !== ignoreEnemyId && e.x === x && e.y === y).length;
  }

  function canEnemyEnter(x, y, enemy) {
    if (!inBounds(x, y)) return false;
    const tile = tileAt(x, y);
    if (!tile || tile.obstacle || tile.portal) return false;
    if (tile.towerId) {
      const tower = game.towers.find(t => t.id === tile.towerId);
      return !tower || (tower.type !== 'warrior' && !isStatueTower(tower));
    }
    const occupants = getEnemyOccupancy(x, y, enemy?.id || null);
    const capacity = getEnemyTileCapacity(enemy, x, y);
    if (enemy?.x === x && enemy?.y === y) return true;
    return occupants < capacity;
  }


  function getTilePixelPosition(x, y) {
    const tile = tileAt(x, y);
    if (!tile || !tile.el) return { left: 0, top: 0, width: 84, height: 84 };
    const el = tile.el;
    const tileComputed = window.getComputedStyle ? window.getComputedStyle(el) : null;
    const width = el.offsetWidth || (tileComputed ? parseFloat(tileComputed.width) : 0) || 84;
    const height = el.offsetHeight || (tileComputed ? parseFloat(tileComputed.height) : 0) || width || 84;
    if (Number.isFinite(el.offsetLeft) && Number.isFinite(el.offsetTop)) {
      return {
        left: el.offsetLeft,
        top: el.offsetTop,
        width,
        height,
      };
    }
    const gridRect = els.grid?.getBoundingClientRect?.();
    const tileRect = el.getBoundingClientRect?.();
    if (gridRect && tileRect) {
      return {
        left: tileRect.left - gridRect.left,
        top: tileRect.top - gridRect.top,
        width: tileRect.width || width,
        height: tileRect.height || height,
      };
    }
    const gridComputed = window.getComputedStyle ? window.getComputedStyle(els.grid) : null;
    const gapX = gridComputed ? parseFloat(gridComputed.columnGap || gridComputed.gap || '0') || 0 : 0;
    const gapY = gridComputed ? parseFloat(gridComputed.rowGap || gridComputed.gap || '0') || 0 : 0;
    return {
      left: x * (width + gapX),
      top: y * (height + gapY),
      width,
      height,
    };
  }


  function createAttackLine(sourceTower, enemy, colorKey, variant = '') {
    if (!sourceTower || !enemy) return;
    game.attackLines.push({
      sourceTowerId: sourceTower.id,
      enemyId: enemy.id,
      colorKey: colorKey || heroColorKey(sourceTower.type),
      variant,
      until: now() + (variant ? 220 : 150),
    });
  }


  function createProjectileEffect(effect) {
    if (!effect || !game) return;
    if (!game.projectileEffects) game.projectileEffects = [];
    game.projectileEffects.push({
      id: `projectile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...effect,
      startedAt: effect.startedAt || now(),
      until: effect.until || (now() + (effect.durationMs || ARCHER_PROJECTILE_ANIMATION_MS)),
    });
  }

  function createArcherProjectileEffect(sourceTower, enemy) {
    if (!sourceTower || !enemy) return;
    const from = getTowerPixelCenter(sourceTower);
    const to = getEnemyPixelCenter(enemy);
    createProjectileEffect({
      kind: 'archer-green-fire',
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      durationMs: ARCHER_PROJECTILE_ANIMATION_MS,
      imagePath: GREEN_FIRE_GIF_PATH,
    });
  }

  function createTowerLine(sourceTower, targetTower, colorKey) {
    if (!sourceTower || !targetTower) return;
    game.attackLines.push({
      sourceTowerId: sourceTower.id,
      targetTowerId: targetTower.id,
      colorKey: colorKey || heroColorKey(sourceTower.type),
      until: now() + 180,
    });
  }

  function createTileFlashArea(tiles, colorKey) {
    if (!tiles) return;
    for (const t of tiles) {
      if (t && typeof t.x === 'number' && typeof t.y === 'number') createHitFlash(t.x, t.y, colorKey || 'default', '');
    }
  }

  function createExplosionEffect(x, y, colorKey = 'warrior', radiusTiles = EXPLODING_STATUE_RADIUS, durationMs = EXPLODING_STATUE_ANIMATION_MS, imagePath = RED_FIRE_GIF_PATH) {
    if (!inBounds(x, y)) return;
    if (!game.explosionEffects) game.explosionEffects = [];
    game.explosionEffects.push({
      id: `explosion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      x,
      y,
      colorKey,
      radiusTiles,
      startedAt: now(),
      until: now() + durationMs,
      durationMs,
      kind: 'statue-red-fire',
      imagePath,
    });
  }

  function triggerExplodingStatue(tower) {
    if (!tower || !isStatueTower(tower) || !game.modifiers.explodingStatue) return;
    const damage = Math.max(1, Math.round((tower.maxHp || tower.hp || 0) * EXPLODING_STATUE_DAMAGE_PERCENT));
    const targets = game.enemies.filter(enemy => dist(enemy, tower) <= EXPLODING_STATUE_RADIUS);
    createExplosionEffect(tower.x, tower.y, 'warrior', EXPLODING_STATUE_RADIUS, EXPLODING_STATUE_ANIMATION_MS);
    createTileFlashArea([{ x: tower.x, y: tower.y }], 'warrior');
    for (const enemy of targets) {
      enemy.hp -= damage;
      enemy.killedBy = 'warrior';
      createHitFlash(enemy.x, enemy.y, 'warrior', `-${Math.round(damage)}`);
    }
    if (targets.length) {
      log(`Exploding Statue hit ${targets.length} ${targets.length === 1 ? 'enemy' : 'enemies'} for ${damage}.`);
    }
  }

  function getTowerPixelCenter(tower) {
    if (!tower) return { x: 0, y: 0 };
    const pos = getTilePixelPosition(tower.x, tower.y);
    return { x: pos.left + pos.width / 2, y: pos.top + pos.height / 2 };
  }

  function getEnemyStackOffset(enemy, enemiesHere) {
    if (!enemy) return { x: 0, y: 0 };
    const stack = Array.isArray(enemiesHere) && enemiesHere.length ? enemiesHere : [enemy];
    if (stack.length <= 1) return { x: 0, y: 0 };
    const stackIndex = Math.max(0, stack.findIndex(e => e.id === enemy.id));
    const laneOffsets = [
      { x: -10, y: 8 },
      { x: 0, y: 0 },
      { x: 10, y: -8 },
    ];
    return laneOffsets[Math.min(stackIndex, laneOffsets.length - 1)] || { x: 0, y: 0 };
  }

  function getEnemyPixelCenter(enemy) {
    if (!enemy) return { x: 0, y: 0 };
    const current = now();
    const byTile = new Map();
    for (const e of game.enemies) {
      const k = `${e.x},${e.y}`;
      if (!byTile.has(k)) byTile.set(k, []);
      byTile.get(k).push(e);
    }
    const enemiesHere = byTile.get(`${enemy.x},${enemy.y}`) || [enemy];
    const offset = getEnemyStackOffset(enemy, enemiesHere);
    const pos = getTilePixelPosition(enemy.x, enemy.y);
    let px = pos.left + pos.width / 2;
    let py = pos.top + pos.height / 2;
    if (enemy.moveEndAt && enemy.moveEndAt > enemy.moveStartedAt) {
      const prog = Math.max(0, Math.min(1, (current - enemy.moveStartedAt) / (enemy.moveEndAt - enemy.moveStartedAt)));
      const from = getTilePixelPosition(enemy.prevX ?? enemy.x, enemy.prevY ?? enemy.y);
      const fx = from.left + from.width / 2;
      const fy = from.top + from.height / 2;
      px = fx + (px - fx) * prog;
      py = fy + (py - fy) * prog;
    }
    return { x: px + offset.x, y: py + offset.y };
  }

  function renderEnemyLayer() {
    if (!els.enemyLayer) return;
    els.enemyLayer.innerHTML = '';
    const layerWidth = els.grid?.clientWidth || els.grid?.offsetWidth || 0;
    const layerHeight = els.grid?.clientHeight || els.grid?.offsetHeight || 0;
    els.enemyLayer.style.left = `0px`;
    els.enemyLayer.style.top = `0px`;
    els.enemyLayer.style.width = `${layerWidth}px`;
    els.enemyLayer.style.height = `${layerHeight}px`;
    const current = now();
    game.attackLines = game.attackLines.filter(line => line.until > current);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'attack-line-layer');
    svg.setAttribute('viewBox', `0 0 ${layerWidth} ${layerHeight}`);
    svg.setAttribute('width', `${layerWidth}`);
    svg.setAttribute('height', `${layerHeight}`);
    els.enemyLayer.appendChild(svg);
    game.projectileEffects = (game.projectileEffects || []).filter(effect => effect.until > current);
    for (const effect of game.projectileEffects) {
      const progress = Math.max(0, Math.min(1, (current - effect.startedAt) / Math.max(1, effect.durationMs || ARCHER_PROJECTILE_ANIMATION_MS)));
      const x = (effect.fromX || 0) + (((effect.toX || 0) - (effect.fromX || 0)) * progress);
      const y = (effect.fromY || 0) + (((effect.toY || 0) - (effect.fromY || 0)) * progress);
      const sampleSize = game.grid?.[0]?.el?.offsetWidth || 36;
      const size = Math.max(18, sampleSize * ARCHER_PROJECTILE_SIZE_MULTIPLIER);
      const sprite = document.createElement('img');
      sprite.src = effect.imagePath || GREEN_FIRE_GIF_PATH;
      sprite.alt = '';
      sprite.setAttribute('aria-hidden', 'true');
      sprite.style.position = 'absolute';
      sprite.style.left = `${x - (size / 2)}px`;
      sprite.style.top = `${y - (size / 2)}px`;
      sprite.style.width = `${size}px`;
      sprite.style.height = `${size}px`;
      sprite.style.pointerEvents = 'none';
      sprite.style.opacity = `${Math.max(0.35, 1 - (progress * 0.45))}`;
      sprite.style.filter = 'drop-shadow(0 0 8px rgba(140,255,170,0.95))';
      els.enemyLayer.appendChild(sprite);
    }
    game.explosionEffects = (game.explosionEffects || []).filter(effect => effect.until > current);
    for (const effect of game.explosionEffects) {
      const pos = getTilePixelPosition(effect.x, effect.y);
      const centerX = pos.left + (pos.width / 2);
      const centerY = pos.top + (pos.height / 2);
      const progress = Math.max(0, Math.min(1, (current - effect.startedAt) / Math.max(1, effect.durationMs)));
      const baseRadiusPx = Math.max(pos.width, pos.height) * 0.35;
      const finalRadiusPx = Math.max(pos.width, pos.height) * (effect.radiusTiles + 0.9);
      const radiusPx = baseRadiusPx + ((finalRadiusPx - baseRadiusPx) * progress);
      const alpha = Math.max(0, 0.55 - (progress * 0.45));

      if (effect.kind === 'statue-red-fire') {
        const spriteSize = Math.max(pos.width, pos.height) * STATUE_EXPLOSION_GIF_SIZE_MULTIPLIER;
        const sprite = document.createElement('img');
        sprite.src = effect.imagePath || RED_FIRE_GIF_PATH;
        sprite.alt = '';
        sprite.setAttribute('aria-hidden', 'true');
        sprite.style.position = 'absolute';
        sprite.style.left = `${centerX - (spriteSize / 2)}px`;
        sprite.style.top = `${centerY - (spriteSize / 2)}px`;
        sprite.style.width = `${spriteSize}px`;
        sprite.style.height = `${spriteSize}px`;
        sprite.style.pointerEvents = 'none';
        sprite.style.opacity = `${Math.max(0.4, 1 - (progress * 0.35))}`;
        sprite.style.filter = 'drop-shadow(0 0 14px rgba(255,80,40,0.95))';
        els.enemyLayer.appendChild(sprite);
      }

      const ring = document.createElement('div');
      ring.style.position = 'absolute';
      ring.style.left = `${centerX - radiusPx}px`;
      ring.style.top = `${centerY - radiusPx}px`;
      ring.style.width = `${radiusPx * 2}px`;
      ring.style.height = `${radiusPx * 2}px`;
      ring.style.borderRadius = '50%';
      ring.style.pointerEvents = 'none';
      ring.style.boxSizing = 'border-box';
      ring.style.border = `${Math.max(2, Math.round(8 - (progress * 5)))}px solid rgba(255, 173, 66, ${alpha.toFixed(3)})`;
      ring.style.background = `radial-gradient(circle, rgba(255, 240, 180, ${(0.28 * (1 - progress)).toFixed(3)}) 0%, rgba(255, 163, 66, ${(0.24 * (1 - progress)).toFixed(3)}) 40%, rgba(255, 120, 30, 0) 75%)`;
      els.enemyLayer.appendChild(ring);
    }
    const byTile = new Map();
    for (const enemy of game.enemies) {
      const key = `${enemy.x},${enemy.y}`;
      if (!byTile.has(key)) byTile.set(key, []);
      byTile.get(key).push(enemy);
    }
    for (const line of game.attackLines) {
      const tower = game.towers.find(t => t.id === line.sourceTowerId);
      if (!tower) continue;
      let to = null;
      if (line.enemyId) {
        const enemy = game.enemies.find(e => e.id === line.enemyId);
        if (!enemy) continue;
        to = getEnemyPixelCenter(enemy);
      } else if (line.targetTowerId) {
        const targetTower = game.towers.find(t => t.id === line.targetTowerId);
        if (!targetTower) continue;
        to = getTowerPixelCenter(targetTower);
      }
      if (!to) continue;
      const from = getTowerPixelCenter(tower);
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', String(from.x));
      el.setAttribute('y1', String(from.y));
      el.setAttribute('x2', String(to.x));
      el.setAttribute('y2', String(to.y));
      el.setAttribute('class', `attack-line attack-line-${line.colorKey}${line.variant ? ' attack-line-' + line.variant : ''}`);
      svg.appendChild(el);
    }
    for (const enemy of game.enemies) {
      const enemiesHere = byTile.get(`${enemy.x},${enemy.y}`) || [enemy];
      const offset = getEnemyStackOffset(enemy, enemiesHere);
      const pos = getTilePixelPosition(enemy.x, enemy.y);
      let px = pos.left + pos.width / 2;
      let py = pos.top + pos.height / 2;
      if (enemy.moveEndAt && enemy.moveEndAt > enemy.moveStartedAt) {
        const prog = Math.max(0, Math.min(1, (current - enemy.moveStartedAt) / (enemy.moveEndAt - enemy.moveStartedAt)));
        const from = getTilePixelPosition(enemy.prevX ?? enemy.x, enemy.prevY ?? enemy.y);
        const fx = from.left + from.width / 2;
        const fy = from.top + from.height / 2;
        px = fx + (px - fx) * prog;
        py = fy + (py - fy) * prog;
      }
      const dot = document.createElement('div');
      const enemySize = getEnemyVisualSize(enemy);
      dot.className = `enemy-dot enemy-${enemy.cssClass} enemy-floating${enemy.attacking ? ' attacking' : ''}${getEnemySlowPercent(enemy) > 0 ? ' enemy-slowed' : ''}`;
      dot.style.left = `${px + offset.x}px`;
      dot.style.top = `${py + offset.y}px`;
      dot.style.width = `${enemySize}px`;
      dot.style.height = `${enemySize}px`;
      els.enemyLayer.appendChild(dot);
      if (enemy.hp < enemy.maxHp) {
        const hp = document.createElement('div');
        hp.className = 'enemy-hp-bar';
        hp.style.width = `${Math.max(18, enemySize)}px`;
        hp.style.marginLeft = `${-Math.max(18, enemySize) / 2}px`;
        hp.style.left = `${px + offset.x}px`;
        hp.style.top = `${py + offset.y - (enemySize / 2) - 8}px`;
        const fill = document.createElement('div');
        fill.className = 'enemy-hp-fill';
        fill.style.width = `${Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100))}%`;
        hp.appendChild(fill);
        els.enemyLayer.appendChild(hp);
      }
    }
  }

  function getGlobalEnemyHpRange() {
    const hpValues = [];
    const activeMutation = game.activeMutation && game.activeMutation.apply ? game.activeMutation : null;
    const earlyWaveMultiplier = getEarlyWaveStatMultiplier(game.waveNumber);
    const postWave15StatMultiplier = getPostWave15StatMultiplier(game.waveNumber);

    for (const template of Object.values(ENEMY_TEMPLATES)) {
      const hp = template.hp * (1 + Math.max(0, game.waveNumber - 1) * 0.12) * earlyWaveMultiplier * postWave15StatMultiplier;
      const probe = { hp, maxHp: hp, isBoss: false, moveInterval: template.moveInterval, attackInterval: template.attackInterval, damage: template.damage };
      if (activeMutation) activeMutation.apply(probe);
      hpValues.push(probe.maxHp || probe.hp || hp);
    }

    for (const boss of BOSSES) {
      const hp = boss.hp * earlyWaveMultiplier;
      const probe = { hp, maxHp: hp, isBoss: true, moveInterval: boss.moveInterval, attackInterval: boss.attackInterval, damage: boss.damage };
      if (activeMutation) activeMutation.apply(probe);
      hpValues.push(probe.maxHp || probe.hp || hp);
    }

    const minHp = Math.min(...hpValues);
    const maxHp = Math.max(...hpValues);
    return { minHp, maxHp };
  }

  function computeEnemyVisualSizeFromSpawnHp(spawnHp) {
    const sampleTile = game.grid && game.grid[0] && game.grid[0].el ? game.grid[0].el : null;
    const tileWidth = sampleTile ? sampleTile.offsetWidth : 36;
    const maxSize = tileWidth * 0.75;
    const minSize = Math.max(10, tileWidth * 0.28);
    const { minHp, maxHp } = getGlobalEnemyHpRange();
    const range = Math.max(1, maxHp - minHp);
    const normalized = Math.max(0, Math.min(1, (spawnHp - minHp) / range));
    return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * Math.sqrt(normalized)));
  }

  function getEnemyVisualSize(enemy) {
    if (enemy.visualSizePx) return enemy.visualSizePx;
    const spawnHp = enemy.spawnMaxHp || enemy.maxHp || enemy.hp || 1;
    return computeEnemyVisualSizeFromSpawnHp(spawnHp);
  }

  function cleanupEntities() {
    for (const enemy of [...game.enemies]) {
      if (enemy.hp <= 0) {
        awardKill(enemy);
        game.enemies = game.enemies.filter(e => e.id !== enemy.id);
        markProgress(`${enemy.name} died.`);
      }
    }
    for (const tower of [...game.towers]) {
      if (tower.hp <= 0) {
        triggerExplodingStatue(tower);
        removeTower(tower, `${tower.name} fell.`);
      }
    }
  }

  function awardKill(enemy) {
    let jewel = enemy.jewel;
    if (enemy.killedBy === 'pirate') jewel *= (1 + game.modifiers.pirateSteal);
    game.jewel += jewel;
    log(`${enemy.name} died. +${formatJewel(jewel)} Gold.`);
  }

  function damageEnemy(sourceTower, enemy, amount, message) {
    let damage = amount;
    if (enemy.reductionUntil && now() < enemy.reductionUntil) damage *= 0.5;
    enemy.hp -= damage;
    enemy.killedBy = sourceTower.type;
    const towerCanPullAggro = !!sourceTower && (sourceTower.type === 'warrior' || isStatueTower(sourceTower));
    const aggroGain = damage * (towerCanPullAggro ? 0.18 : 0.04);
    enemy.threat[sourceTower.id] = (enemy.threat[sourceTower.id] || 0) + aggroGain;
    enemy.lastAggroAt = now();
    const currentThreat = enemy.aggroTargetId ? (enemy.threat[enemy.aggroTargetId] || 0) : 0;
    const portalBiasDistance = portalDistance(enemy);
    const towerDistance = Math.abs(enemy.x - sourceTower.x) + Math.abs(enemy.y - sourceTower.y);
    if (towerCanPullAggro && canEnemyAggroTower(enemy, sourceTower) && (!enemy.aggroTargetId || enemy.threat[sourceTower.id] > currentThreat * 2.4) && towerDistance <= portalBiasDistance) {
      enemy.aggroTargetId = sourceTower.id;
    }
    createAttackLine(sourceTower, enemy, heroColorKey(sourceTower.type));
    createHitFlash(enemy.x, enemy.y, heroColorKey(sourceTower.type), `-${Math.round(damage)}`);
    markProgress(`${sourceTower.name} damaged ${enemy.name}.`);
    if (message && chance(0.15)) log(`${message} for ${Math.round(damage)}.`);
  }

  function damageTower(gameState, tower, amount, message) {
    let damage = amount;
    if (tower.type === 'warrior' && game.modifiers.shieldWall && game.towers.some(t => t.type === 'priest' && dist(t, tower) === 1)) {
      damage *= 0.9;
    }
    tower.hp -= damage;
    markProgress(`${tower.name} took damage.`);
    if (message && chance(0.2)) log(`${message} for ${Math.round(damage)}.`);
  }

  function healTower(tower, amount, message) {
    if (isStatueTower(tower)) return;
    tower.hp = Math.min(tower.maxHp, tower.hp + amount);
    markProgress(`${tower.name} was healed.`);
    if (message && chance(0.2)) log(`${message} for ${Math.round(amount)}.`);
  }

  function applyBuff(unit, keyName, seconds, data) {
    unit.buffs[keyName] = { ...data, until: now() + seconds * 1000 };
  }

  function applyDebuff(unit, keyName, seconds, data) {
    unit.debuffs[keyName] = { ...data, until: now() + seconds * 1000 };
  }

  function tickEffects(unit, current) {
    if (unit.buffs) {
      for (const [name, buff] of Object.entries(unit.buffs)) {
        if (buff.until && current >= buff.until) { delete unit.buffs[name]; continue; }
        if (buff.hotHeal && buff.nextTickAt && current >= buff.nextTickAt && unit.hp > 0) {
          healTower(unit, buff.hotHeal, null);
          buff.nextTickAt = current + 1000;
        }
      }
    }
    if (unit.debuffs) {
      for (const [name, debuff] of Object.entries(unit.debuffs)) {
        if (debuff.until && current >= debuff.until) {
          delete unit.debuffs[name];
          continue;
        }
        if (name === 'eagle_nest' && unit.hp > 0 && debuff.nextTickAt && current >= debuff.nextTickAt) {
          unit.hp -= debuff.damage;
          debuff.nextTickAt = current + 1000;
        }
        if (name === 'kraken' && unit.hp > 0 && debuff.nextTickAt && current >= debuff.nextTickAt) {
          unit.hp -= debuff.damage;
          debuff.nextTickAt = current + 1000;
        }
        if (name === 'bleed' && unit.hp > 0 && debuff.nextTickAt && current >= debuff.nextTickAt) {
          unit.hp -= (debuff.damagePercent || 0.03) * unit.maxHp;
          debuff.nextTickAt = current + 1000;
        }
      }
    }
  }


  function getActiveSlowTotems() {
    const current = now();
    game.slowTotems = (game.slowTotems || []).filter(t => t.until > current);
    return game.slowTotems;
  }

  function addSlowTotem(caster) {
    const totem = {
      id: `slow-totem-${caster.id}-${Date.now()}`,
      x: caster.x,
      y: caster.y,
      sourceId: caster.id,
      until: now() + 45000,
      range: SLOW_TOTEM_RANGE,
      percent: SLOW_TOTEM_PERCENT,
    };
    if (!game.slowTotems) game.slowTotems = [];
    game.slowTotems.push(totem);
    return totem;
  }

  function getSlowTotemSlowPercent(enemy) {
    let best = 0;
    for (const totem of getActiveSlowTotems()) {
      if (Math.abs(enemy.x - totem.x) + Math.abs(enemy.y - totem.y) <= totem.range) {
        best = Math.max(best, totem.percent || 0.35);
      }
    }
    return best;
  }

  function castAbility(tower, abilityKey, opts = {}) {
    if (!isAbilityUnlocked(tower, abilityKey)) return;
    const readyAt = tower.abilityReadyAt[abilityKey] || 0;
    if (now() < readyAt) return;
    const powerMult = getAbilityPowerMultiplier(tower, abilityKey);
    const ctx = { game, tower };
    const handlers = {
      gladiator_strike() {
        return false;
      },
      whirlwind() {
        const targets = game.enemies.filter(e => dist(e, tower) <= 2);
        const tiles = [];
        for (let xx = tower.x - 2; xx <= tower.x + 2; xx++) {
          for (let yy = tower.y - 2; yy <= tower.y + 2; yy++) {
            if (inBounds(xx, yy) && Math.abs(xx - tower.x) + Math.abs(yy - tower.y) <= 2) tiles.push({ x: xx, y: yy });
          }
        }
        createTileFlashArea(tiles, 'warrior');
        if (!targets.length) return false;
        targets.forEach(e => damageEnemy(tower, e, 60 * powerMult, null));
        return true;
      },
      rapid_onslaught() {
        applyBuff(tower, 'rapid_onslaught', 4, { strength: 1 * powerMult });
        return true;
      },
      taunt() {
        const targets = game.enemies.filter(e => dist(e, tower) <= 2 * powerMult);
        if (!targets.length) return false;
        targets.forEach(e => { if (dist(e, tower) <= 2 * powerMult) { e.tauntedTo = tower; e.tauntUntil = now() + 3000 * powerMult; } });
        return true;
      },
      multi_shot() {
        const targets = game.enemies.filter(e => dist(e, tower) <= tower.range).sort((a, b) => dist(tower, a) - dist(tower, b)).slice(0, 3);
        if (!targets.length) return false;
        targets.forEach(e => { createAttackLine(tower, e, 'archer', 'archer-multishot'); damageEnemy(tower, e, (tower.damage + MULTI_SHOT_BASE_DAMAGE_BONUS) * 0.7, null); });
        createTileFlashArea(targets.map(e => ({x:e.x,y:e.y})), 'archer');
        return true;
      },
      rapid_shot() {
        applyBuff(tower, 'rapid_shot', 4, { bonus: 0.8 * powerMult });
        return true;
      },
      piercing_shot() {
        const targets = game.enemies.filter(e => dist(e, tower) <= tower.range).sort((a, b) => dist(tower, a) - dist(tower, b)).slice(0, 3);
        if (!targets.length) return false;
        const abilityDamage = tower.damage + getAbilityLevelBonus(tower);
        [1, 0.8, 0.6].forEach((mult, i) => { if (targets[i]) damageEnemy(tower, targets[i], abilityDamage * mult * powerMult, null); });
        return true;
      },
      eagle_nest() {
        return false;
      },
      firebolt() {
        const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        damageEnemy(tower, target, 40 * game.modifiers.wizardSpellDamage, `${tower.name} cast Firebolt`);
        return true;
      },
      frost_bolt() {
        return false;
      },
      fireball() {
        const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        const targets = game.enemies.filter(e => dist(e, target) <= 2);
        const fireballDamage = (70 + getAbilityLevelBonus(tower)) * powerMult * game.modifiers.wizardSpellDamage;
        targets.forEach(e => { createAttackLine(tower, e, 'wizard', 'wizard-fireball'); damageEnemy(tower, e, fireballDamage, null); });
        const areaTiles = [];
        for (let xx = target.x - 2; xx <= target.x + 2; xx++) for (let yy = target.y - 2; yy <= target.y + 2; yy++) if (inBounds(xx, yy) && Math.abs(xx - target.x) + Math.abs(yy - target.y) <= 2) areaTiles.push({x:xx,y:yy});
        createTileFlashArea(areaTiles, 'wizard');
        return true;
      },
      frost_lance() {
        const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        let dmg = 90 * powerMult * game.modifiers.wizardSpellDamage;
        if (getEnemySlowPercent(target) > 0) dmg *= 2;
        damageEnemy(tower, target, dmg, `${tower.name} cast Frost Lance`);
        return true;
      },
      prayer_of_healing() {
        const allies = game.towers.filter(t => dist(t, tower) <= 5 && t.hp < t.maxHp);
        if (!allies.length) return false;
        const healAmount = getPrayerOfHealingAmount(tower);
        allies.forEach(a => { healTower(a, healAmount, null); createTowerLine(tower, a, 'priest'); });
        return true;
      },
      slow_totem() {
        addSlowTotem(tower);
        createTileFlashArea([{ x: tower.x, y: tower.y }], 'priest');
        return true;
      },
      swiftness() {
        const allies = game.towers.filter(t => dist(t, tower) <= 2);
        const hotHeal = 5 + Math.floor(tower.level / 5);
        allies.forEach(a => {
          applyBuff(a, 'swiftness', 30, { bonus: 0.25 * powerMult, hotHeal, nextTickAt: now() + 1000 });
          createTowerLine(tower, a, 'priest');
        });
        return true;
      },
      warning_shot() {
        const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        applyDebuff(target, 'warning_shot', 6, {});
        return true;
      },
      starboard_cannons() {
        const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        const shots = 4 + game.modifiers.extraCannons;
        for (let i = 0; i < shots; i += 1) {
          const targets = game.enemies.filter(e => dist(e, target) <= 2);
          const chosen = targets.length ? pickRandom(targets) : target;
          damageEnemy(tower, chosen, STARBOARD_CANNONS_BASE_DAMAGE + getAbilityLevelBonus(tower), null);
        }
        return true;
      },
      kraken() {
        const target = tower.type === 'warrior' ? nearestEnemyForWarrior(tower) : nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        const targets = game.enemies.filter(e => dist(e, target) <= 2);
        targets.forEach(e => applyDebuff(e, 'kraken', 10, { damage: KRAKEN_BASE_DAMAGE * powerMult, percent: 0.5, nextTickAt: now() + 1000 }));
        return true;
      },
    };
    const ok = handlers[abilityKey]?.(ctx);
    if (!ok) {
      if (!opts.silent) showBanner('No valid target in range', 1200);
      return false;
    }
    const cooldown = getAbilityCooldownSeconds(tower, abilityKey);
    let mult = 1;
    if (tower.type === 'wizard') mult *= game.modifiers.wizardCooldown;
    if (tower.type === 'warrior') mult *= game.modifiers.warriorCooldown;
    tower.abilityReadyAt[abilityKey] = now() + cooldown * 1000 * mult;
    if (!opts.auto) log(`${tower.name} used ${abilityKey.replaceAll('_', ' ')}.`);
    render();
    return true;
  }


  function clearPathPreview() {
    game.grid.forEach(tile => { tile.pathPreview = null; });
  }

  function buyableWaveStart() {
    return game.phase === SETUP_PHASES.BATTLE && !game.runningWave && !game.relicChoices.length;
  }

  bindMenuAutoClose(els.mobileHeroHost);
  bindMenuAutoClose(els.mobileHireHost);
  bindMenuAutoClose(els.mobileFuncMenu);
  setViewportUnits();
  syncMobileHosts();
  renderMobileAbilityDock();
  updateMobileBoardFit();
  window.addEventListener('resize', () => {
    syncMobileHosts();
    renderMobileAbilityDock();
    updateMobileBoardFit();
  });

  els.startWaveBtn.addEventListener('click', () => {
    if (buyableWaveStart()) startWave();
  });

  window.addEventListener('pagehide', () => {
    captureTrackedRunNow('closed');
  });
  window.addEventListener('beforeunload', () => {
    captureTrackedRunNow('closed');
  });
  window.addEventListener('dfk-defense:wallet-state', (event) => {
    const detail = event && event.detail ? event.detail : null;
    if (!detail || !detail.address) {
      if (hasTrackableRunInProgress() && isRunTrackingEnabled()) {
        submitCompletedRunOnce('disconnected');
      } else {
        captureTrackedRunNow('disconnected');
      }
    }
  });

  els.restartBtn.addEventListener('click', resetGame);
  window.addEventListener('dfk-defense:bank-balance', (event) => {
    syncPremiumJewelsFromSettledBank(event.detail || null);
  });
  els.speedToggleBtn?.addEventListener('click', () => {
    setPlayMode('easy');
  });
  els.mobileModeBtn?.addEventListener('click', () => {
    showBanner('Challenge Mode coming soon', 1400);
  });
  els.pauseBtn?.addEventListener('click', () => {
    setPaused(!game.paused);
  });
  els.introBtn?.addEventListener('click', () => {
    openIntroModal(game.introPageIndex || 0, 'intro');
  });
  els.bountyBtn?.addEventListener('click', () => {
    openBountyModal();
  });
  els.mobileMenuOverlay?.addEventListener('click', closeMobileMenus);
  els.mobileBarToggleBtn?.addEventListener('click', toggleMobileBarCollapsed);
  els.mobileFuncMenuBtn?.addEventListener('click', () => toggleMobileMenu('func'));
  els.mobileHeroMenuBtn?.addEventListener('click', () => toggleMobileMenu('hero'));
  els.mobileHireMenuBtn?.addEventListener('click', () => toggleMobileMenu('hire'));
  els.mobileSideMenuToggleBtn?.addEventListener('click', toggleMobileLeftRail);
  els.mobileRightMenuToggleBtn?.addEventListener('click', toggleMobileRightRail);
  els.mobileFuncEasyBtn?.addEventListener('click', () => els.speedToggleBtn?.click());
  els.mobileFuncChallengeBtn?.addEventListener('click', () => {
    showBanner('Challenge Mode coming soon', 1400);
  });
  els.mobileFuncPauseBtn?.addEventListener('click', () => els.pauseBtn?.click());
  els.mobileFuncIntroBtn?.addEventListener('click', () => els.introBtn?.click());
  els.mobileFuncBountyBtn?.addEventListener('click', () => els.bountyBtn?.click());
  els.mobileFuncStartBtn?.addEventListener('click', () => els.startWaveBtn?.click());
  els.mobileFuncSkipBtn?.addEventListener('click', () => els.skipSetupBtn?.click());
  els.mobileFuncRestartBtn?.addEventListener('click', () => els.restartBtn?.click());
  els.mobileQuickStartBtn?.addEventListener('click', () => els.startWaveBtn?.click());
  els.mobileQuickUpgradeBtn?.addEventListener('click', () => els.upgradeBtn?.click());
  els.mobileQuickMoveBtn?.addEventListener('click', () => els.moveBtn?.click());
  els.mobileQuickSatelliteBtn?.addEventListener('click', () => {
    const tower = getSelectedTower();
    if (!tower) return;
    beginSatellitePlacement(tower);
  });
  els.mobileInstallBtn?.addEventListener('click', handleMobileInstallAction);
  els.mobileInstallDismissBtn?.addEventListener('click', () => {
    game.mobileInstallDismissed = true;
    updateMobileInstallPrompt();
  });
  els.closeIntroBtn?.addEventListener('click', closeIntroModal);
  els.closeBountyBtn?.addEventListener('click', closeBountyModal);
  els.bankPanelToggle?.addEventListener('click', () => {
    const opening = els.bankPanel?.classList.contains('collapsed');
    if (isLandscapeMobileUi()) {
      enforceMobileSidePanelRule(opening ? 'bank' : null);
      return;
    }
    const collapsed = els.bankPanel?.classList.toggle('collapsed');
    if (els.bankPanelToggle) els.bankPanelToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });

  els.walletPanelToggle?.addEventListener('click', () => {
    const opening = els.walletPanel?.classList.contains('collapsed');
    if (isLandscapeMobileUi()) {
      enforceMobileSidePanelRule(opening ? 'profile' : null);
      return;
    }
    const collapsed = els.walletPanel?.classList.toggle('collapsed');
    if (els.walletPanelToggle) els.walletPanelToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });

  els.mobileStatsPanelToggle?.addEventListener('click', () => {
    const collapsed = els.mobileStatsPanel?.classList.toggle('collapsed');
    if (els.mobileStatsPanelToggle) els.mobileStatsPanelToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });
  els.introPrevBtn?.addEventListener('click', () => {
    if (game.introPageIndex > 0) {
      game.introPageIndex -= 1;
      renderIntroPage();
    }
  });
  els.introNextBtn?.addEventListener('click', () => {
    if (game.introPageIndex < INTRO_PAGES.length - 1) {
      game.introPageIndex += 1;
      renderIntroPage();
    } else {
      closeIntroModal();
    }
  });
  els.skipSetupBtn.addEventListener('click', autoPlaceWarrior);
  els.upgradeBtn.addEventListener('click', () => {
    const tower = getSelectedTower();
    if (tower) upgradeTower(tower);
  });
  els.moveBtn.addEventListener('click', () => {
    const tower = getSelectedTower();
    if (!tower) return;
    game.movingTowerId = tower.id;
    log(tower.type === 'warrior' ? `Select an adjacent open tile to move ${tower.name}.` : `Select any open tile to move ${tower.name}.`);
    render();
  });

  function gameLoop() {
    if (game.crashed) return;
    const realNow = Date.now();
    if (!game.realLastTick) game.realLastTick = realNow;
    if (!game.virtualNow) game.virtualNow = realNow;
    const realDelta = Math.max(0, Math.min(250, realNow - game.realLastTick));
    game.realLastTick = realNow;
    game.virtualNow += realDelta * game.timeScale;
    try {
      update();
      // Keep the battlefield/top bar live without rebuilding the control panel every frame.
      // Rebuilding buttons on every animation frame can interrupt click events before they fire.
      renderGrid();
      renderEnemyLayer();
      refreshSelectedPanelLive();
      updateTopbar();
      updateMobileBoardFit();
    } catch (error) {
      showCrashReport('runtime', error);
      return;
    }
    requestAnimationFrame(gameLoop);
  }

  els.grid.addEventListener('click', (event) => {
    const tileEl = event.target.closest('.tile');
    if (!tileEl) return;
    handleTileClick(Number(tileEl.dataset.x), Number(tileEl.dataset.y));
  });

  // Preview portal / obstacle placements on hover.
  els.grid.addEventListener('mousemove', (event) => {
    const tileEl = event.target.closest('.tile');
    clearPathPreview();
    game.hoveredTowerId = null;
    if (!tileEl) return;
    const x = Number(tileEl.dataset.x);
    const y = Number(tileEl.dataset.y);
    const hoverTile = tileAt(x, y);
    if (hoverTile && hoverTile.towerId) game.hoveredTowerId = hoverTile.towerId;
    if (game.phase === SETUP_PHASES.PORTAL) {
      const valid = canPlacePortal(x, y);
      const points = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }].filter(p => inBounds(p.x, p.y));
      points.forEach(p => { tileAt(p.x, p.y).pathPreview = valid ? 'valid' : 'invalid'; });
    } else if (game.phase === SETUP_PHASES.OBSTACLES) {
      tileAt(x, y).pathPreview = canPlacePlayerObstacle(x, y) ? 'valid' : 'invalid';
    }
    renderGrid();
  });
  els.grid.addEventListener('mouseleave', () => { clearPathPreview(); game.hoveredTowerId = null; renderGrid(); });

  const rerenderPortalArtOnLayoutChange = () => {
    if (!game.portal) return;
    window.requestAnimationFrame(() => renderPortalArt());
  };

  window.addEventListener('resize', rerenderPortalArtOnLayoutChange);
  if ('ResizeObserver' in window) {
    const portalLayoutObserver = new ResizeObserver(rerenderPortalArtOnLayoutChange);
    portalLayoutObserver.observe(els.grid);
  }


  function shouldIgnoreOpaqueRuntimeEvent(event) {
    const message = String(event?.message || event?.reason?.message || event?.reason || '').trim();
    const filename = String(event?.filename || '').trim();
    const stack = String(event?.error?.stack || event?.reason?.stack || '');
    if (!message && !filename && !stack) return true;
    const opaqueScriptError = message === 'Script error.' || message === 'Script error';
    const pointsToApp = filename.includes('js/app.js') || stack.includes('js/app.js') || filename.includes('js/security-wallet.js') || stack.includes('js/security-wallet.js');
    return opaqueScriptError && !pointsToApp;
  }

  window.addEventListener('error', (event) => {
    if (shouldIgnoreOpaqueRuntimeEvent(event)) {
      console.warn('Ignored opaque runtime error event.', event);
      return;
    }
    showCrashReport('runtime', event.error || new Error(event.message || 'Unknown runtime error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (shouldIgnoreOpaqueRuntimeEvent(event)) {
      console.warn('Ignored opaque unhandled rejection event.', event);
      return;
    }
    showCrashReport('runtime', event.reason || new Error('Unhandled promise rejection'));
  });

  game.virtualNow = Date.now();
  game.realLastTick = Date.now();
  window.addEventListener('resize', () => {
    setViewportUnits();
    updateMobileInstallPrompt();
    updateMobileBoardFit();
    nudgeMobileChrome();
  });
  window.addEventListener('orientationchange', () => {
    setViewportUnits();
    updateMobileInstallPrompt();
    updateMobileBoardFit();
    nudgeMobileChrome();
  });
  window.visualViewport?.addEventListener('resize', () => {
    setViewportUnits();
    updateMobileInstallPrompt();
    updateMobileBoardFit();
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateMobileInstallPrompt();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    game.mobileInstallDismissed = true;
    updateMobileInstallPrompt();
  });

  if (window.DFKDefenseWallet && typeof window.DFKDefenseWallet.refreshBank === 'function') {
    window.DFKDefenseWallet.refreshBank().catch(() => {});
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && game.introOpen) {
      if (els.bountyModal && !els.bountyModal.classList.contains('hidden')) closeBountyModal();
      else closeIntroModal();
      return;
    }
    if (!game.introOpen) return;
    if (event.key === 'ArrowRight' && game.introPageIndex < INTRO_PAGES.length - 1) {
      game.introPageIndex += 1;
      renderIntroPage();
    } else if (event.key === 'ArrowLeft' && game.introPageIndex > 0) {
      game.introPageIndex -= 1;
      renderIntroPage();
    }
  });

  window.DFKDefenseGameControl = {
    hasMeaningfulRunInProgress,
    restartForTracking: () => resetGame({ skipTrackedResetConfirm: true }),
  };

  resetGame();
  game.lastTick = now();
  setPlayMode('easy', false);
  updatePauseButton();
  requestAnimationFrame(gameLoop);
})();


// === Disable Jewel Bank & Player Profile (coming soon) ===
function disableFutureMenus() {
  const ids = ['mobileBankHost','mobileProfileHost','mobileBankBtn','mobileProfileBtn'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        return false;
      });
    }
  });
}
disableFutureMenus();







(function rebindRunLogChevron() {
  function bind() {
    const btn = document.getElementById('runLogToggleBtn');
    if (btn) btn.onclick = window.DFKToggleRunLog;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
