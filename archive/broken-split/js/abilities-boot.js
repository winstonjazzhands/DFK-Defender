    if (!isAbilityUnlocked(tower, abilityKey)) return;
    const readyAt = tower.abilityReadyAt[abilityKey] || 0;
    if (now() < readyAt) return;
    const powerMult = getAbilityPowerMultiplier(tower, abilityKey);
    const ctx = { game, tower };
    const handlers = {
      gladiator_strike() {
        const target = nearestEnemyInRange(tower, 1);
        if (!target) return false;
        damageEnemy(tower, target, tower.damage * 2 * powerMult, `${tower.name} used Gladiator Strike`);
        healTower(tower, tower.maxHp * 0.05, `${tower.name} healed`);
        return true;
      },
      whirlwind() {
        const targets = game.enemies.filter(e => dist(e, tower) <= 1);
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
        targets.forEach(e => damageEnemy(tower, e, tower.damage * 0.7, null));
        return true;
      },
      rapid_shot() {
        applyBuff(tower, 'rapid_shot', 4, { bonus: 0.8 * powerMult });
        return true;
      },
      piercing_shot() {
        const targets = game.enemies.filter(e => dist(e, tower) <= tower.range).sort((a, b) => dist(tower, a) - dist(tower, b)).slice(0, 3);
        if (!targets.length) return false;
        [1, 0.8, 0.6].forEach((mult, i) => { if (targets[i]) damageEnemy(tower, targets[i], tower.damage * mult * powerMult, null); });
        return true;
      },
      hunters_mark() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        applyDebuff(target, 'hunters_mark', 8, { damage: 6 * powerMult, nextTickAt: now() + 1000 });
        return true;
      },
      firebolt() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        damageEnemy(tower, target, 40 * game.modifiers.wizardSpellDamage, `${tower.name} cast Firebolt`);
        return true;
      },
      frost_bolt() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        damageEnemy(tower, target, 35 * game.modifiers.wizardSpellDamage, null);
        applyDebuff(target, 'slow', 3, { percent: 0.3 });
        return true;
      },
      fireball() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        const targets = game.enemies.filter(e => dist(e, target) <= 2);
        targets.forEach(e => damageEnemy(tower, e, 70 * powerMult * game.modifiers.wizardSpellDamage, null));
        return true;
      },
      frost_lance() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        let dmg = 90 * powerMult * game.modifiers.wizardSpellDamage;
        if (target.debuffs.slow) dmg *= 2;
        damageEnemy(tower, target, dmg, `${tower.name} cast Frost Lance`);
        return true;
      },
      prayer_of_healing() {
        const allies = game.towers.filter(t => dist(t, tower) <= 3 && t.hp < t.maxHp);
        if (!allies.length) return false;
        allies.forEach(a => healTower(a, 120 * game.modifiers.priestHealing, null));
        return true;
      },
      freedom() {
        const allies = game.towers.filter(t => dist(t, tower) <= 3);
        allies.forEach(a => { delete a.buffs.blizzardSlow; delete a.debuffs.rooted; applyBuff(a, 'freedom', 2, {}); });
        return true;
      },
      swiftness() {
        const allies = game.towers.filter(t => dist(t, tower) <= 3);
        allies.forEach(a => applyBuff(a, 'swiftness', 5, { bonus: 0.25 * powerMult }));
        return true;
      },
      warning_shot() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        applyDebuff(target, 'warning_shot', 6, {});
        return true;
      },
      starboard_cannons() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        const shots = 5 + game.modifiers.extraCannons;
        for (let i = 0; i < shots; i += 1) {
          const targets = game.enemies.filter(e => dist(e, target) <= 2);
          const chosen = targets.length ? pickRandom(targets) : target;
          damageEnemy(tower, chosen, 45, null);
        }
        return true;
      },
      kraken() {
        const target = nearestEnemyInRange(tower, tower.range);
        if (!target) return false;
        const targets = game.enemies.filter(e => dist(e, target) <= 2);
        targets.forEach(e => applyDebuff(e, 'kraken', 5, { damage: 30 * powerMult, nextTickAt: now() + 1000 }));
        return true;
      },
    };
    const ok = handlers[abilityKey]?.(ctx);
    if (!ok) {
      showBanner('No valid target in range', 1200);
      return;
    }
    const cooldown = getAbilityCooldownSeconds(tower, abilityKey);
    let mult = 1;
    if (tower.type === 'wizard') mult *= game.modifiers.wizardCooldown;
    if (tower.type === 'warrior') mult *= game.modifiers.warriorCooldown;
    tower.abilityReadyAt[abilityKey] = now() + cooldown * 1000 * mult;
    log(`${tower.name} used ${abilityKey.replaceAll('_', ' ')}.`);
    render();
  }

  function showAbilityInfo(text) {
    els.banner.innerHTML = `<div class="ability-banner">${text}</div>`;
    els.banner.classList.remove('hidden');
    clearTimeout(game.bannerTimeout);
    game.bannerTimeout = setTimeout(() => els.banner.classList.add('hidden'), 5200);
  }

  function clearPathPreview() {
    game.grid.forEach(tile => { tile.pathPreview = null; });
  }

  function buyableWaveStart() {
    return game.phase === SETUP_PHASES.BATTLE && !game.runningWave && !game.relicChoices.length;
  }

  els.startWaveBtn.addEventListener('click', () => {
    if (buyableWaveStart()) startWave();
  });
  els.restartBtn.addEventListener('click', resetGame);
  els.skipSetupBtn.addEventListener('click', autoPlaceWarrior);
  els.upgradeBtn.addEventListener('click', () => {
    const tower = getSelectedTower();
    if (tower) upgradeTower(tower);
  });
  els.moveBtn.addEventListener('click', () => {
    const tower = getSelectedTower();
    if (!tower) return;
    game.movingTowerId = tower.id;
    log(`Select an adjacent tile to move ${tower.name}.`);
    render();
  });

  function gameLoop() {
    update();
    // Keep the battlefield/top bar live without rebuilding the control panel every frame.
    // Rebuilding buttons on every animation frame can interrupt click events before they fire.
    renderGrid();
    renderEnemyLayer();
    refreshSelectedPanelLive();
    updateTopbar();
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

  resetGame();
  game.lastTick = now();
  requestAnimationFrame(gameLoop);
