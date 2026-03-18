    if (x < 6 || y > HEIGHT - 2 || x > WIDTH - 2) return false;
    const points = [{ x, y }, { x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }];
    return points.every(p => {
      const tile = tileAt(p.x, p.y);
      return tile && !tile.obstacle && !tile.towerId && tile.type !== 'spawn';
    });
  }

  function placePortal(x, y) {
    if (!canPlacePortal(x, y)) return false;
    game.portal = { x, y, width: 2, height: 2 };
    game.portalHp = 2000;
    for (let py = y; py < y + 2; py += 1) {
      for (let px = x; px < x + 2; px += 1) {
        tileAt(px, py).portal = true;
      }
    }
    game.phase = SETUP_PHASES.OBSTACLES;
    setInstruction(`Place ${PLAYER_OBSTACLE_COUNT} player obstacles. They cannot fully block all paths from the breach to the portal.`);
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
    game.playerObstacleCount += 1;
    log(`Placed obstacle ${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT} at (${x + 1}, ${y + 1}).`);
    if (game.playerObstacleCount >= PLAYER_OBSTACLE_COUNT) {
      if (game.rebuildingBarriers) {
        game.phase = SETUP_PHASES.BATTLE;
        game.rebuildingBarriers = false;
        setInstruction(`Barrier rebuild complete. Wave ${game.waveNumber + 1} is ready when you are.`);
        els.startWaveBtn.disabled = false;
        if (!game.nextWavePlan) prepareNextWave();
      } else {
        game.phase = SETUP_PHASES.WARRIOR;
        setInstruction('Place your starting Warrior on any open tile.');
        els.skipSetupBtn.classList.remove('hidden');
      }
    } else {
      const prefix = game.rebuildingBarriers ? 'Rebuild your 12 player barriers.' : `Place ${PLAYER_OBSTACLE_COUNT} player obstacles.`;
      setInstruction(`${prefix} ${game.playerObstacleCount}/${PLAYER_OBSTACLE_COUNT} placed.`);
    }
    return true;
  }

  function beginBarrierRebuild() {
    if (!canStartBarrierRebuild()) {
      showBanner('Barrier rebuild is not available right now.', 1400);
      return;
    }
    game.jewel -= BARRIER_REBUILD_COST;
    for (const tile of game.grid) {
      if (tile.obstacle === 'player') tile.obstacle = null;
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
    game.hoveredTowerId = null;
    setInstruction(`Barrier rebuild purchased for ${formatJewel(BARRIER_REBUILD_COST)} JEWEL. Place ${PLAYER_OBSTACLE_COUNT} new player barriers.`);
    log(`Barrier rebuild purchased for ${formatJewel(BARRIER_REBUILD_COST)} JEWEL.`);
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
    game.phase = SETUP_PHASES.BATTLE;
    setInstruction('Setup complete. Start the first wave, then hire more heroes, upgrade towers, and protect the portal.');
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
        return this.basicCooldown / 1000 / mult;
      },
    };
    for (const ability of template.abilities) tower.abilityReadyAt[ability.key] = 0;
    return tower;
  }

  function isNearPriest(tower) {
    return game.towers.some(t => t.type === 'priest' && t.id !== tower.id && dist(t, tower) <= 2);
  }

  function getAbilityIndex(tower, abilityKey) {
    return tower.abilities.findIndex(a => a.key === abilityKey);
  }

  function getAbilityUnlockLevel(tower, abilityKey) {
    if (abilityKey === 'healing_aura') return 15;
    const idx = getAbilityIndex(tower, abilityKey);
    if (idx < 0) return 1;
    if (idx < 2) return 1;
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

  function getAbilityCooldownSeconds(tower, abilityKey) {
    const base = tower.template.abilities.find(a => a.key === abilityKey)?.cooldown || 5;
    if (abilityKey === 'healing_aura') return 0;
    return getAbilityIndex(tower, abilityKey) >= 2 ? base * 1.5 : base;
  }

  function getUpgradeLevelCap() {
    return Math.max(5, game.waveNumber + 5);
  }

  function canUpgradeTower(tower) {
    const nextLevel = tower.level + 1;
    return nextLevel <= getUpgradeLevelCap() && game.jewel >= getUpgradeCost(nextLevel);
  }

  function getOwnedRelicObjects() {
    return game.ownedRelics.map(id => RELICS.find(r => r.id === id)).filter(Boolean);
  }

  function getAbilityDescription(tower, abilityKey) {
    const powerMult = getAbilityPowerMultiplier(tower, abilityKey);
    const stronger = powerMult > 1 ? ' This is an unlock skill, so it is 100% stronger and has 50% longer cooldown.' : '';
    const common = ` Unlocks at level ${getAbilityUnlockLevel(tower, abilityKey)}. Cooldown: ${getAbilityCooldownSeconds(tower, abilityKey).toFixed(1)}s.`;
    const scale = ' Level ups increase hero damage by +5% each level, hero health by +4.5% each level, and attack-speed gain by +5% for most heroes and +4.5% for Archer.';
    const d = tower.damage;
    const hp = tower.maxHp;
    const map = {
      gladiator_strike: `Deals ${Math.round(d * 2 * powerMult)} damage and heals ${Math.round(hp * 0.05)} HP.${stronger}${common}${scale}`,
      whirlwind: `Hits adjacent enemies for ${Math.round(60 * powerMult)} damage.${stronger}${common}${scale}`,
      rapid_onslaught: `Boosts attack speed by ${Math.round((1 * powerMult) * 100)}% for 4s.${stronger}${common}${scale}`,
      taunt: `Taunts enemies within ${2 * powerMult} tiles for ${3 * powerMult}s.${stronger}${common}${scale}`,
      multi_shot: `Fires 3 arrows for ${Math.round(d * 0.7)} damage each.${common}${scale}`,
      rapid_shot: `Boosts attack speed by ${Math.round((0.8 * powerMult) * 100)}% for 4s.${stronger}${common}${scale}`,
      piercing_shot: `Hits up to 3 enemies for ${Math.round(d * 1 * powerMult)}, ${Math.round(d * 0.8 * powerMult)}, and ${Math.round(d * 0.6 * powerMult)} damage.${stronger}${common}${scale}`,
      hunters_mark: `Applies a damage-over-time debuff for 8s dealing ${Math.round(6 * powerMult)} damage per second.${stronger}${common}${scale}`,
      firebolt: `Deals ${Math.round(40 * game.modifiers.wizardSpellDamage)} spell damage.${common}${scale}`,
      frost_bolt: `Deals ${Math.round(35 * game.modifiers.wizardSpellDamage)} damage and slows for 3s.${common}${scale}`,
      fireball: `Explodes in a 2-tile area for ${Math.round(70 * powerMult * game.modifiers.wizardSpellDamage)} damage.${stronger}${common}${scale}`,
      frost_lance: `Deals ${Math.round(90 * powerMult * game.modifiers.wizardSpellDamage)} damage, or double to slowed enemies.${stronger}${common}${scale}`,
      prayer_of_healing: `Heals nearby allies for ${Math.round(120 * game.modifiers.priestHealing)} HP.${common}${scale}`,
      freedom: `Removes slows and roots from nearby allies, then grants 2s slow immunity.${common}${scale}`,
      swiftness: `Boosts nearby allies' attack speed by ${Math.round(25 * powerMult)}% for 5s.${stronger}${common}${scale}`,
      healing_aura: `Passive. Unlocks at level 15. Heals nearby allies within 2 tiles for ${Math.round(2 * tower.level)} HP each second. This scales directly with Priest level, so every level adds +2 HP per second to the aura.${common}${scale}`,
      warning_shot: `Marks one enemy to take 20% more damage for 6s.${common}${scale}`,
      starboard_cannons: `Fires ${5 + game.modifiers.extraCannons} cannonballs for ${Math.round(45)} damage each in a small splash area.${common}${scale}`,
      kraken: `Applies a 5s kraken effect dealing ${Math.round(30 * powerMult)} damage per second in a 2-tile cluster.${stronger}${common}${scale}`,
    };
    return map[abilityKey] || `${common}${scale}`;
  }

  function getUpgradeCost(nextLevel) {
    let base = 15;
    if (nextLevel <= 5) base = 1;
    else if (nextLevel <= 10) base = 2;
    else if (nextLevel <= 15) base = 4;
    else if (nextLevel <= 20) base = 8;
    return Math.round(base * UPGRADE_COST_MULTIPLIER * 10) / 10;
  }

  function upgradeTower(tower) {
    const nextLevel = tower.level + 1;
    const cost = getUpgradeCost(nextLevel);
    if (nextLevel > getUpgradeLevelCap()) {
      showBanner(`Upgrade cap reached for this wave. Max level is ${getUpgradeLevelCap()}.`, 1500);
      return;
    }
    if (game.jewel < cost) return;
    game.jewel -= cost;
    tower.level = nextLevel;
    const hpRatio = tower.hp / tower.maxHp;
    tower.maxHp *= 1.045;
    tower.hp = tower.maxHp * hpRatio;
    tower.damage *= 1.05;
    tower.basicCooldown /= tower.type === 'archer' ? 1.045 : 1.05;
    log(`${tower.name} upgraded to level ${tower.level} (${rarityForLevel(tower.level)}).`);
    render();
  }

  function getSelectedTower() {
    return game.towers.find(t => t.id === game.selectedId) || null;
  }

  function handleTileClick(x, y) {
    clearPathPreview();
    const tile = tileAt(x, y);

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
      if (!placePlayerObstacle(x, y)) showBanner('Obstacle would block all paths or is invalid', 1500);
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
        showBanner('Move must be to an adjacent open tile and cannot break pathing', 1500);
      }
      render();
      return;
    }
  }

  function placeHiredHero(x, y) {
    if (!isOpenForTower(x, y)) {
      showBanner('Pick an open tile for the new hero', 1200);
      return;
    }
    const cost = game.placingHeroCost || getNextHireCost();
    if (game.jewel < cost) {
      showBanner(`Not enough JEWEL. Need ${formatJewel(cost)}.`, 1400);
      game.placingHeroType = null;
      game.placingHeroCost = 0;
      render();
      return;
    }
    game.jewel -= cost;
    const tower = createTower(game.placingHeroType, x, y);
    game.towers.push(tower);
    tileAt(x, y).towerId = tower.id;
    log(`Hired ${tower.name} for ${formatJewel(cost)} JEWEL and placed it at (${x + 1}, ${y + 1}).`);
    game.hireCount = Math.max(game.hireCount, getLivingHireCount());
    game.selectedId = tower.id;
    game.placingHeroType = null;
    game.placingHeroCost = 0;
    render();
  }

  function getAdjacentMoveTargets(tower) {
    return adjacentTiles(tower.x, tower.y).filter(pos => isOpenForTower(pos.x, pos.y) && moveWouldPreservePath(tower, pos.x, pos.y));
  }

  function moveWouldPreservePath(tower, nx, ny) {
    const fromTile = tileAt(tower.x, tower.y);
    const toTile = tileAt(nx, ny);
    fromTile.towerId = null;
    toTile.towerId = tower.id;
    const oldX = tower.x;
    const oldY = tower.y;
    tower.x = nx;
    tower.y = ny;
    const okay = existsPathFromBreachToPortal(true);
    tower.x = oldX;
    tower.y = oldY;
    fromTile.towerId = tower.id;
    toTile.towerId = null;
    return okay;
  }

  function moveTower(tower, nx, ny) {
    if (!adjacentTiles(tower.x, tower.y).some(p => p.x === nx && p.y === ny)) return false;
    if (!isOpenForTower(nx, ny)) return false;
    if (!moveWouldPreservePath(tower, nx, ny)) return false;
    tileAt(tower.x, tower.y).towerId = null;
    tower.x = nx;
    tower.y = ny;
    tileAt(nx, ny).towerId = tower.id;
    tower.moveReadyAt = now() + (tower.type === 'warrior' ? 5700 : 6000);
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

  function pathfind(start, targets, allowPortalTargets = true) {
    const targetKeys = new Set(targets.map(t => key(t.x, t.y)));
    const frontier = [{ x: start.x, y: start.y }];
    const cameFrom = new Map();
    const visited = new Set([key(start.x, start.y)]);
    while (frontier.length) {
      const current = frontier.shift();
      if (targetKeys.has(key(current.x, current.y))) {
        return reconstructPath(cameFrom, current, start);
      }
      const next = adjacentTiles(current.x, current.y).sort((a, b) => heuristic(a, targets) - heuristic(b, targets));
      for (const n of next) {
        const k = key(n.x, n.y);
        if (visited.has(k)) continue;
        const tile = tileAt(n.x, n.y);
        if (!tile) continue;
        if (isBlockedForPath(tile, true)) continue;
        visited.add(k);
        cameFrom.set(k, current);
        frontier.push(n);
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
