    grid: document.getElementById('grid'),
    portalHp: document.getElementById('portalHp'),
    jewelCount: document.getElementById('jewelCount'),
    waveCount: document.getElementById('waveCount'),
    patternLabel: document.getElementById('patternLabel'),
    mutationLabel: document.getElementById('mutationLabel'),
    countdownLabel: document.getElementById('countdownLabel'),
    phaseLabel: document.getElementById('phaseLabel'),
    instructionText: document.getElementById('instructionText'),
    log: document.getElementById('log'),
    selectedInfo: document.getElementById('selectedInfo'),
    abilitiesPanel: document.getElementById('abilitiesPanel'),
    hirePanel: document.getElementById('hirePanel'),
    relicPanel: document.getElementById('relicPanel'),
    banner: document.getElementById('banner'),
    startWaveBtn: document.getElementById('startWaveBtn'),
    skipSetupBtn: document.getElementById('skipSetupBtn'),
    restartBtn: document.getElementById('restartBtn'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    moveBtn: document.getElementById('moveBtn'),
    rebuildBarriersBtn: document.getElementById('rebuildBarriersBtn'),
    enemyLayer: null,
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
    nextEnemyId: 1,
    nextTowerId: 1,
    nextWavePlan: null,
    activeMutation: null,
    recentMutations: [],
    recentLanes: [],
    hireCount: 0,
    rebuildingBarriers: false,
    barrierRefitCount: 0,
    jewel: 0,
    portalHp: 2000,
    relicChoices: [],
    ownedRelics: [],
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
    },
    logLimit: 120,
    bannerTimeout: null,
  };

  function now() { return Date.now(); }
  function key(x, y) { return `${x},${y}`; }
  function tileAt(x, y) { return game.tilesByKey.get(key(x, y)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function dist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  function chance(n) { return Math.random() < n; }
  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function adjacentTiles(x, y) { return DIRECTIONS.map(d => ({ x: x + d.x, y: y + d.y })).filter(p => inBounds(p.x, p.y)); }
  function inBounds(x, y) { return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT; }
  function rarityForLevel(level) { return RARITIES[Math.min(4, Math.floor((level - 1) / 5))]; }

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
      els.grid.parentElement.appendChild(els.enemyLayer);
    }
    for (let y = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1) {
        const tile = {
          x,
          y,
          type: x === 0 ? 'spawn' : 'open',
          obstacle: null,
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
  }

  function resetGame() {
    game.phase = SETUP_PHASES.PORTAL;
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
    game.hoveredTowerId = null;
    game.nextEnemyId = 1;
    game.nextTowerId = 1;
    game.nextWavePlan = null;
    game.activeMutation = null;
    game.recentMutations = [];
    game.recentLanes = [];
    game.hireCount = 0;
    game.rebuildingBarriers = false;
    game.barrierRefitCount = 0;
    game.jewel = 0;
    game.portalHp = 2000;
    game.relicChoices = [];
    game.ownedRelics = [];
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
    };
    els.log.innerHTML = '';
    initGrid();
    placeRandomObstacles();
    setInstruction('Place the 2x2 portal anywhere at least 3 tiles away from the breach. Then place 12 choke-point obstacles, then place your Warrior.');
    log('New run started. Random obstacles are already on the field.');
    updateTopbar();
    render();
  }

  function placeRandomObstacles() {
    const placed = [];
    while (placed.length < RANDOM_OBSTACLE_COUNT) {
      const x = randInt(2, 8);
      const y = randInt(0, 7);
      const tile = tileAt(x, y);
      if (!tile || tile.obstacle || tile.portal || x <= 1) continue;
      // avoid clustering too hard
      if (placed.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) <= 1)) continue;
      tile.obstacle = 'random';
      placed.push({ x, y });
    }
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function setInstruction(text) {
    els.instructionText.textContent = text;
    const phaseMap = {
      [SETUP_PHASES.PORTAL]: 'Setup: Place Portal',
      [SETUP_PHASES.OBSTACLES]: `Setup: Place Obstacles (${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT})`,
      [SETUP_PHASES.WARRIOR]: 'Setup: Place Warrior',
      [SETUP_PHASES.BATTLE]: game.runningWave ? 'Battle in Progress' : 'Preparation Phase',
      [SETUP_PHASES.GAME_OVER]: 'Game Over',
    };
    els.phaseLabel.textContent = phaseMap[game.phase] || 'Ready';
  }

  function log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    els.log.prepend(entry);
    while (els.log.children.length > game.logLimit) els.log.removeChild(els.log.lastChild);
  }

  function showBanner(text, duration = 2400) {
    els.banner.textContent = text;
    els.banner.classList.remove('hidden');
    clearTimeout(game.bannerTimeout);
    game.bannerTimeout = setTimeout(() => els.banner.classList.add('hidden'), duration);
  }

  function updateTopbar() {
    els.portalHp.textContent = `${Math.max(0, Math.round(game.portalHp))} / 2000`;
    els.jewelCount.textContent = formatJewel(game.jewel);
    els.waveCount.textContent = `${game.waveNumber}`;
    els.patternLabel.textContent = game.nextWavePlan ? prettyPattern(game.nextWavePlan.pattern) : (game.runningWave ? prettyPattern(game.currentPattern || 'boss') : '--');
    els.mutationLabel.textContent = game.activeMutation ? game.activeMutation.name : (game.nextWavePlan?.mutation?.name || 'None');
    els.countdownLabel.textContent = game.runningWave ? 'Live' : (game.countdownMs > 0 ? `${Math.ceil(game.countdownMs / 1000)}s` : 'Ready');
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

  function formatJewel(value) {
    if (Math.abs(value - Math.round(value)) < 0.001) return `${Math.round(value)}`;
    return `${value.toFixed(1)}`;
  }

  function render() {
