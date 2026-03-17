    if (game.phase !== SETUP_PHASES.BATTLE) return;
    game.nextWavePlan = buildWavePlan(game.waveNumber + 1);
    const mutationText = game.nextWavePlan.mutation ? ` • Mutation: ${game.nextWavePlan.mutation.name}` : '';
    const rebuildText = canStartBarrierRebuild(false) ? ` Barrier rebuild is available for ${formatJewel(BARRIER_REBUILD_COST)} JEWEL.` : '';
    setInstruction(`Wave ${game.waveNumber + 1} ready. Pattern: ${prettyPattern(game.nextWavePlan.pattern)}${mutationText}. Spend JEWEL, move towers, or start the wave.${rebuildText}`);
    els.startWaveBtn.disabled = false;
    updateTopbar();
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

  function buildStandardWave(waveNumber, pattern, sizeMultiplier) {
    const baseCount = Math.round((6 + waveNumber * 2) * sizeMultiplier);
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
    return [{ bossId: boss.id, lane, delayMs: 1000 }];
  }

  function chooseEnemyType(waveNumber) {
    if (waveNumber < 3) return 'grunt';
    if (waveNumber < 5) return chance(0.2) ? 'runner' : 'grunt';
    if (waveNumber < 8) return chance(0.25) ? 'brute' : (chance(0.25) ? 'runner' : 'grunt');
    return chance(0.25) ? 'brute' : (chance(0.30) ? 'runner' : 'grunt');
  }

  function startWave() {
    if (!game.nextWavePlan || game.runningWave || game.phase !== SETUP_PHASES.BATTLE) return;
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
    log(`Wave ${game.waveNumber} started. Pattern: ${prettyPattern(game.currentPattern)}${mutationText ? `, Mutation: ${game.activeMutation.name}` : ''}.`);
    render();
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
    game.enemies.push(enemy);
  }

  function createEnemy(type, laneName) {
    const template = ENEMY_TEMPLATES[type];
    const lane = BREACH_LANES[laneName];
    const spawn = pickRandom(lane);
    return {
      id: `e${game.nextEnemyId++}`,
      type,
      name: template.name,
      x: spawn.x,
      y: spawn.y,
      hp: template.hp * (1 + Math.max(0, game.waveNumber - 1) * 0.12),
      maxHp: template.hp * (1 + Math.max(0, game.waveNumber - 1) * 0.12),
      damage: template.damage * (1 + Math.max(0, game.waveNumber - 1) * 0.08),
      moveInterval: template.moveInterval,
      attackInterval: template.attackInterval,
      jewel: template.jewel * ENEMY_JEWEL_MULTIPLIER,
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
      isBoss: false,
      slowResistance: 0,
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
      hp: boss.hp,
      maxHp: boss.hp,
      damage: boss.damage,
      moveInterval: boss.moveInterval,
      attackInterval: boss.attackInterval,
      jewel: boss.jewel * ENEMY_JEWEL_MULTIPLIER,
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
      isBoss: true,
      bossTemplate: boss,
      nextAbilityAt: now() + boss.abilityInterval * 1000,
      slowResistance: 0,
    };
  }

  function update() {
    if (game.phase === SETUP_PHASES.GAME_OVER) return;
    const current = now();
    const delta = current - game.lastTick;
    game.lastTick = current;

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

    if (game.portalHp <= 0 && game.phase !== SETUP_PHASES.GAME_OVER) {
      game.phase = SETUP_PHASES.GAME_OVER;
      game.runningWave = false;
      setInstruction('The portal fell. Start a new run to try again.');
      showBanner('Game Over', 3000);
      log('The portal was destroyed.');
    }
  }

  function allSpawnsDone() {
    return game.pendingSpawns && game.pendingSpawns.every(s => s.spawned);
  }

  function finishWave() {
    game.runningWave = false;
    game.pendingSpawns = null;
    game.activeMutation = null;
    log(`Wave ${game.waveNumber} cleared.`);
    if (game.waveNumber % 7 === 0) {
      offerRelics();
      setInstruction(`Wave ${game.waveNumber} cleared. Relic shop is open. You can buy one relic or skip.`);
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
    if (!relic || game.jewel < relic.cost) return;
    game.jewel -= relic.cost;
    game.ownedRelics.push(relic.id);
    relic.apply(game);
    game.relicChoices = [];
    log(`Bought relic: ${relic.name}.`);
    showBanner(`Bought relic: ${relic.name}`);
    setCountdown(WAVE_BREAK_SECONDS);
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

  function updateTower(tower, delta, current) {
    tickEffects(tower, current);
    tower.attackCooldownMs = Math.max(0, tower.attackCooldownMs - delta);
    if (!tower.template.autoAttack || tower.attackCooldownMs > 0 || game.phase === SETUP_PHASES.GAME_OVER) return;
    if (tower.type === 'priest') {
      autoPriestHeal(tower);
      return;
    }
    const target = nearestEnemyInRange(tower, tower.range);
    if (!target) return;
    let damage = tower.damage;
    if (tower.type === 'archer' && game.modifiers.rangerLine && isBehindWarrior(tower)) damage *= 1.10;
    if (target.debuffs.warning_shot) damage *= 1.2;
    if (target.debuffs.hunters_mark) damage += 2;
    damageEnemy(tower, target, damage, `${tower.name} hit ${target.name}`);
    tower.attackCooldownMs = tower.getAttackInterval() * 1000;
  }

  function isBehindWarrior(tower) {
    const warrior = game.towers.find(t => t.type === 'warrior');
    return !!warrior && tower.x > warrior.x && Math.abs(tower.y - warrior.y) <= 1;
  }

  function autoPriestHeal(tower) {
    if (isAbilityUnlocked(tower, 'healing_aura')) {
      const tickAt = tower.auraTickAt || 0;
      if (now() >= tickAt) {
        const auraTargets = game.towers.filter(t => t.id !== tower.id && dist(t, tower) <= 2 && t.hp < t.maxHp);
        const auraHeal = 2 * tower.level;
        auraTargets.forEach(target => healTower(target, auraHeal, null));
        tower.auraTickAt = now() + 1000;
      }
    }
    const allies = game.towers.filter(t => dist(t, tower) <= tower.range && t.hp < t.maxHp);
    if (!allies.length) return;
    const target = allies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    healTower(target, 25 * game.modifiers.priestHealing, `${tower.name} healed ${target.name}`);
    tower.attackCooldownMs = tower.getAttackInterval() * 1000;
  }

  function nearestEnemyInRange(tower, range) {
    const enemies = game.enemies.filter(e => dist(tower, e) <= range);
    enemies.sort((a, b) => dist(tower, a) - dist(tower, b));
    return enemies[0] || null;
  }


  function getEnemyAggroTarget(enemy) {
    if (!enemy.threat) return null;
    for (const [tid, value] of Object.entries(enemy.threat)) {
      const next = value * 0.995;
      if (next < 1) delete enemy.threat[tid];
      else enemy.threat[tid] = next;
    }
    let bestId = enemy.aggroTargetId;
    let bestThreat = bestId ? (enemy.threat[bestId] || 0) : 0;
    for (const [tid, value] of Object.entries(enemy.threat)) {
      if (!bestId || value > bestThreat * 1.1) {
        bestId = tid;
        bestThreat = value;
      }
    }
    if (!bestId || bestThreat <= 5) return null;
    const tower = game.towers.find(t => t.id === bestId);
    if (!tower) {
      delete enemy.threat[bestId];
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

  function updateEnemy(enemy, current) {
    tickEffects(enemy, current);

    if (enemy.isBoss && enemy.bossTemplate && current >= enemy.nextAbilityAt) {
      enemy.bossTemplate.useAbility(enemy, game);
      enemy.nextAbilityAt = current + enemy.bossTemplate.abilityInterval * 1000;
    }

    const warrior = game.towers.find(t => t.type === 'warrior');
    const portalTargets = getPortalTargets();
    let targets = portalTargets;
    let attackTarget = null;

    if (enemy.tauntedTo && current < enemy.tauntUntil && game.towers.some(t => t.id === enemy.tauntedTo.id)) {
      const tauntTarget = enemy.tauntedTo;
      const adj = getTowerApproachTiles(tauntTarget);
      if (dist(enemy, tauntTarget) <= 1) {
        attackTarget = tauntTarget;
      } else if (adj.length) {
        targets = adj;
      }
    } else {
      enemy.tauntedTo = null;
      const aggroTarget = getEnemyAggroTarget(enemy);
      if (aggroTarget) {
        const adj = getTowerApproachTiles(aggroTarget);
        if (dist(enemy, aggroTarget) <= 1) {
          attackTarget = aggroTarget;
        } else if (adj.length) {
          targets = adj;
        }
      }
    }

    if (!attackTarget) {
      const path = pathfind({ x: enemy.x, y: enemy.y }, targets);
      if (path && path.length > 1) {
        enemy.targetPath = path;
        enemy.attacking = false;
        if (current >= enemy.nextMoveAt && !enemy.debuffs.rooted) {
          const next = path[1];
          if (canEnemyEnter(next.x, next.y, enemy)) {
            enemy.prevX = enemy.x;
            enemy.prevY = enemy.y;
            enemy.x = next.x;
            enemy.y = next.y;
            enemy.moveStartedAt = current;
            enemy.moveEndAt = current + getEnemyMoveMs(enemy);
            enemy.nextMoveAt = enemy.moveEndAt;
          } else {
            enemy.nextMoveAt = current + 200;
          }
        }
      } else if (warrior) {
        const warriorAdj = getTowerApproachTiles(warrior);
        if (dist(enemy, warrior) <= 1) {
          attackTarget = warrior;
        } else {
          const warriorPath = pathfind({ x: enemy.x, y: enemy.y }, warriorAdj);
          if (warriorPath && warriorPath.length > 1) {
            if (current >= enemy.nextMoveAt && !enemy.debuffs.rooted) {
              const next = warriorPath[1];
              if (canEnemyEnter(next.x, next.y, enemy)) {
                enemy.prevX = enemy.x;
                enemy.prevY = enemy.y;
                enemy.x = next.x;
                enemy.y = next.y;
                enemy.moveStartedAt = current;
                enemy.moveEndAt = current + getEnemyMoveMs(enemy);
                enemy.nextMoveAt = enemy.moveEndAt;
              }
            }
          }
        }
      }
    }

    if (!attackTarget && portalTargets.some(t => t.x === enemy.x && t.y === enemy.y)) {
      attackTarget = { portal: true };
    }

    if (attackTarget) {
      enemy.attacking = true;
      if (current >= enemy.nextAttackAt) {
        if (attackTarget.portal) {
          game.portalHp -= enemy.damage;
          log(`${enemy.name} hit the portal for ${Math.round(enemy.damage)}.`);
        } else {
          damageTower(game, attackTarget, enemy.damage, `${enemy.name} hit ${attackTarget.name}`);
        }
        enemy.nextAttackAt = current + enemy.attackInterval * 1000;
      }
    }
  }

  function getEnemyMoveMs(enemy) {
    let mult = 1;
    if (enemy.debuffs.slow) mult *= (1 + ((enemy.debuffs.slow.percent || 0.3) * (1 - enemy.slowResistance)));
    return enemy.moveInterval * 1000 * mult;
  }

  function canEnemyEnter(x, y, enemy) {
    if (!inBounds(x, y)) return false;
    const tile = tileAt(x, y);
    if (!tile || tile.obstacle || tile.portal) return false;
    if (tile.towerId) {
      const tower = game.towers.find(t => t.id === tile.towerId);
      return !tower || tower.type !== 'warrior';
    }
    const occupants = game.enemies.filter(e => e.x === x && e.y === y).length;
    return occupants < 3 || (enemy.x === x && enemy.y === y);
  }


  function getTilePixelPosition(x, y) {
    const tile = tileAt(x, y);
    if (!tile || !tile.el) return { left: 0, top: 0, width: 56, height: 56 };
    return {
      left: tile.el.offsetLeft,
      top: tile.el.offsetTop,
      width: tile.el.offsetWidth,
      height: tile.el.offsetHeight,
    };
  }

  function renderEnemyLayer() {
    if (!els.enemyLayer) return;
    els.enemyLayer.innerHTML = '';
    els.enemyLayer.style.left = `${els.grid.offsetLeft}px`;
    els.enemyLayer.style.top = `${els.grid.offsetTop}px`;
    els.enemyLayer.style.width = `${els.grid.offsetWidth}px`;
    els.enemyLayer.style.height = `${els.grid.offsetHeight}px`;
    const current = now();
    const byTile = new Map();
    for (const enemy of game.enemies) {
      const key = `${enemy.x},${enemy.y}`;
      if (!byTile.has(key)) byTile.set(key, []);
      byTile.get(key).push(enemy);
    }
    const laneOffsets = [
      { x: -10, y: 8 },
      { x: 0, y: 0 },
      { x: 10, y: -8 },
    ];
    for (const enemy of game.enemies) {
      const enemiesHere = byTile.get(`${enemy.x},${enemy.y}`) || [enemy];
      const stackIndex = Math.max(0, enemiesHere.findIndex(e => e.id === enemy.id));
      const offset = laneOffsets[Math.min(stackIndex, laneOffsets.length - 1)];
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
      dot.className = `enemy-dot enemy-${enemy.cssClass} enemy-floating${enemy.attacking ? ' attacking' : ''}`;
      dot.style.left = `${px + offset.x}px`;
      dot.style.top = `${py + offset.y}px`;
      els.enemyLayer.appendChild(dot);
    }
  }

  function cleanupEntities() {
    for (const enemy of [...game.enemies]) {
      if (enemy.hp <= 0) {
        awardKill(enemy);
        game.enemies = game.enemies.filter(e => e.id !== enemy.id);
      }
    }
    for (const tower of [...game.towers]) {
      if (tower.hp <= 0) {
        tileAt(tower.x, tower.y).towerId = null;
        game.towers = game.towers.filter(t => t.id !== tower.id);
        log(`${tower.name} fell.`);
        if (game.selectedId === tower.id) game.selectedId = null;
      }
    }
  }

  function awardKill(enemy) {
    let jewel = enemy.jewel;
    if (enemy.killedBy === 'pirate') jewel *= (1 + game.modifiers.pirateSteal);
    game.jewel += jewel;
    log(`${enemy.name} died. +${formatJewel(jewel)} JEWEL.`);
  }

  function damageEnemy(sourceTower, enemy, amount, message) {
    let damage = amount;
    if (enemy.reductionUntil && now() < enemy.reductionUntil) damage *= 0.5;
    enemy.hp -= damage;
    enemy.killedBy = sourceTower.type;
    enemy.threat[sourceTower.id] = (enemy.threat[sourceTower.id] || 0) + damage;
    enemy.lastAggroAt = now();
    const currentThreat = enemy.aggroTargetId ? (enemy.threat[enemy.aggroTargetId] || 0) : 0;
    if (!enemy.aggroTargetId || enemy.threat[sourceTower.id] > currentThreat * 1.15) enemy.aggroTargetId = sourceTower.id;
    createHitFlash(enemy.x, enemy.y, heroColorKey(sourceTower.type), `-${Math.round(damage)}`);
    if (message && chance(0.15)) log(`${message} for ${Math.round(damage)}.`);
  }

  function damageTower(gameState, tower, amount, message) {
    let damage = amount;
    if (tower.type === 'warrior' && game.modifiers.shieldWall && game.towers.some(t => t.type === 'priest' && dist(t, tower) === 1)) {
      damage *= 0.9;
    }
    tower.hp -= damage;
    if (message && chance(0.2)) log(`${message} for ${Math.round(damage)}.`);
  }

  function healTower(tower, amount, message) {
    tower.hp = Math.min(tower.maxHp, tower.hp + amount);
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
        if (buff.until && current >= buff.until) delete unit.buffs[name];
      }
    }
    if (unit.debuffs) {
      for (const [name, debuff] of Object.entries(unit.debuffs)) {
        if (debuff.until && current >= debuff.until) {
          delete unit.debuffs[name];
          continue;
        }
        if (name === 'hunters_mark' && unit.hp > 0 && debuff.nextTickAt && current >= debuff.nextTickAt) {
          unit.hp -= debuff.damage;
          debuff.nextTickAt = current + 1000;
        }
        if (name === 'kraken' && unit.hp > 0 && debuff.nextTickAt && current >= debuff.nextTickAt) {
          unit.hp -= debuff.damage;
          debuff.nextTickAt = current + 1000;
        }
      }
    }
  }

  function castAbility(tower, abilityKey) {
