    renderGrid();
    renderSelection();
    renderHirePanel();
    renderRelics();
    updateTopbar();
  }

  function renderGrid() {
    const selectedTower = getSelectedTower();
    const moveTargets = selectedTower && game.movingTowerId === selectedTower.id ? getAdjacentMoveTargets(selectedTower) : [];

    for (const tile of game.grid) {
      tile.el.className = 'tile';
      tile.el.innerHTML = '';
      if (tile.type === 'spawn') tile.el.classList.add('spawn');
      if (tile.portal) tile.el.classList.add('portal');
      if (tile.obstacle === 'random') tile.el.classList.add('random-obstacle');
      if (tile.obstacle === 'player') tile.el.classList.add('player-obstacle');
      if (tile.pathPreview === 'valid') tile.el.classList.add('preview-valid');
      if (tile.pathPreview === 'invalid') tile.el.classList.add('preview-invalid');
      if (tile.hitFlash && tile.hitFlash.until <= now()) tile.hitFlash = null;
      if (tile.hitFlash) tile.el.classList.add(`hit-${tile.hitFlash.colorKey}`);
      if (selectedTower && selectedTower.x === tile.x && selectedTower.y === tile.y) tile.el.classList.add('selected');
      if (moveTargets.some(p => p.x === tile.x && p.y === tile.y)) tile.el.classList.add('move-target');
      const tower = tile.towerId ? game.towers.find(t => t.id === tile.towerId) : null;
      const enemiesHere = game.enemies.filter(e => e.x === tile.x && e.y === tile.y).slice(0, 3);

      if (tower) {
        const chip = document.createElement('div');
        chip.className = `tower-chip tower-${tower.type}`;
        chip.textContent = tower.template.letter;
        tile.el.appendChild(chip);

        const hpBar = document.createElement('div');
        hpBar.className = 'hp-bar';
        const hpFill = document.createElement('div');
        hpFill.className = 'hp-fill';
        hpFill.style.width = `${Math.max(0, (tower.hp / tower.maxHp) * 100)}%`;
        hpBar.appendChild(hpFill);
        tile.el.appendChild(hpBar);

        const cdBar = document.createElement('div');
        cdBar.className = 'cooldown-bar';
        const cdFill = document.createElement('div');
        cdFill.className = 'cooldown-fill';
        const ratio = tower.basicCooldown > 0 ? 1 - clamp(tower.attackCooldownMs / tower.basicCooldown, 0, 1) : 1;
        cdFill.style.width = `${ratio * 100}%`;
        cdBar.appendChild(cdFill);
        tile.el.appendChild(cdBar);

        const small = document.createElement('div');
        small.className = 'tile-small';
        small.textContent = `L${tower.level} ${rarityForLevel(tower.level)}`;
        tile.el.appendChild(small);

        const hover = document.createElement('div');
        hover.className = 'tile-hover-card';

        const hoverTitle = document.createElement('div');
        hoverTitle.className = 'tile-hover-title';
        hoverTitle.textContent = tower.name;
        hover.appendChild(hoverTitle);

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

      if (tile.portal) {
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = 'PORT';
        tile.el.appendChild(label);
      }

      if (tile.obstacle && !tower) {
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = tile.obstacle === 'random' ? 'ROCK' : 'BARR';
        tile.el.appendChild(label);
      }

      if (tile.type === 'spawn' && !tile.portal && !tile.obstacle) {
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = 'BREACH';
        tile.el.appendChild(label);
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
  }

  function renderSelection() {
    const tower = getSelectedTower();
    game.renderedSelectionTowerId = tower ? tower.id : null;
    if (!tower) {
      els.selectedInfo.textContent = 'Nothing selected.';
      els.abilitiesPanel.innerHTML = '<div class="muted">Select a tower to upgrade, move, or cast abilities.</div>';
      els.upgradeBtn.disabled = true;
      els.moveBtn.disabled = true;
      els.rebuildBarriersBtn.disabled = !canStartBarrierRebuild();
      els.rebuildBarriersBtn.textContent = `Rebuild Barriers (${formatJewel(BARRIER_REBUILD_COST)} JEWEL)`;
      return;
    }
    const nextCost = getUpgradeCost(tower.level + 1);
    const ownedRelics = getOwnedRelicObjects();
    const relicHtml = ownedRelics.length ? `<div class="selected-relics"><strong>Owned Relics:</strong><br>${ownedRelics.map(r => r.name).join(', ')}</div>` : '<div class="muted">No relics owned yet.</div>';
    els.selectedInfo.innerHTML = `
      <strong>${tower.name}</strong><br>
      ${tower.type.toUpperCase()} • ${rarityForLevel(tower.level)} • Level ${tower.level}<br>
      HP: ${Math.round(tower.hp)} / ${Math.round(tower.maxHp)}<br>
      Damage: ${Math.round(tower.damage)}<br>
      Range: ${tower.range}<br>
      Attack Interval: ${tower.getAttackInterval().toFixed(2)}s<br>
      Move Cooldown: ${Math.max(0, (tower.moveReadyAt - now()) / 1000).toFixed(1)}s<br>
      Upgrade Cost: ${formatJewel(nextCost)} JEWEL<br>
      Upgrade Cap This Wave: L${getUpgradeLevelCap()}
      ${relicHtml}
    `;
    els.upgradeBtn.disabled = !canUpgradeTower(tower) || !(game.phase === SETUP_PHASES.BATTLE || game.phase === SETUP_PHASES.WARRIOR || game.phase === SETUP_PHASES.OBSTACLES);
    els.moveBtn.disabled = now() < tower.moveReadyAt || !!tower.buffs.rooted || game.phase === SETUP_PHASES.GAME_OVER;
    els.rebuildBarriersBtn.disabled = !canStartBarrierRebuild();
    els.rebuildBarriersBtn.textContent = `Rebuild Barriers (${formatJewel(BARRIER_REBUILD_COST)} JEWEL)`;

    els.abilitiesPanel.innerHTML = '';
    for (const ability of tower.abilities) {
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
      icon.title = getAbilityDescription(tower, ability.key);
      const showInfo = () => showAbilityInfo(getAbilityDescription(tower, ability.key));
      icon.addEventListener('mouseenter', showInfo);
      icon.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); showInfo(); });
      wrapper.appendChild(btn);
      wrapper.appendChild(icon);
      els.abilitiesPanel.appendChild(wrapper);
    }
    if (tower.template.passive) {
      const passive = document.createElement('div');
      passive.className = 'card';
      passive.innerHTML = `<h4>Passive</h4><p>${tower.template.passive}</p>`;
      els.abilitiesPanel.appendChild(passive);
    }
  }

  function refreshSelectedPanelLive() {
    const tower = getSelectedTower();
    if (!tower) return;
    if (game.renderedSelectionTowerId !== tower.id) {
      renderSelection();
      return;
    }
    const nextCost = getUpgradeCost(tower.level + 1);
    const ownedRelics = getOwnedRelicObjects();
    const relicHtml = ownedRelics.length ? `<div class="selected-relics"><strong>Owned Relics:</strong><br>${ownedRelics.map(r => r.name).join(', ')}</div>` : '<div class="muted">No relics owned yet.</div>';
    els.selectedInfo.innerHTML = `
      <strong>${tower.name}</strong><br>
      ${tower.type.toUpperCase()} • ${rarityForLevel(tower.level)} • Level ${tower.level}<br>
      HP: ${Math.round(tower.hp)} / ${Math.round(tower.maxHp)}<br>
      Damage: ${Math.round(tower.damage)}<br>
      Range: ${tower.range}<br>
      Attack Interval: ${tower.getAttackInterval().toFixed(2)}s<br>
      Move Cooldown: ${Math.max(0, (tower.moveReadyAt - now()) / 1000).toFixed(1)}s<br>
      Upgrade Cost: ${formatJewel(nextCost)} JEWEL<br>
      Upgrade Cap This Wave: L${getUpgradeLevelCap()}
      ${relicHtml}
    `;
    els.upgradeBtn.disabled = !canUpgradeTower(tower) || !(game.phase === SETUP_PHASES.BATTLE || game.phase === SETUP_PHASES.WARRIOR || game.phase === SETUP_PHASES.OBSTACLES);
    els.moveBtn.disabled = now() < tower.moveReadyAt || !!tower.buffs.rooted || game.phase === SETUP_PHASES.GAME_OVER;
    els.rebuildBarriersBtn.disabled = !canStartBarrierRebuild();
    els.rebuildBarriersBtn.textContent = `Rebuild Barriers (${formatJewel(BARRIER_REBUILD_COST)} JEWEL)`;
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
      const icon = row.querySelector('.ability-info-icon');
      if (icon) icon.title = getAbilityDescription(tower, abilityKey);
    });
  }

  function getLivingHireCount() {
    return game.towers.filter(t => t.type !== 'warrior').length + (game.placingHeroType ? 1 : 0);
  }

  function getNextHireCost() {
    const index = Math.min(getLivingHireCount(), HIRE_COSTS.length - 1);
    return HIRE_COSTS[index];
  }

  function renderHirePanel() {
    els.hirePanel.innerHTML = '';

    const available = ['warrior', 'archer', 'wizard', 'priest', 'pirate'].filter(type => !game.towers.some(t => t.type === type) && game.placingHeroType !== type);
    if (!available.length && !game.placingHeroType) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<p>All hireable heroes are currently on the field.</p>';
      els.hirePanel.appendChild(card);
      return;
    }

    const cost = getNextHireCost();
    for (const type of available) {
      const t = TOWER_TEMPLATES[type];
      const card = document.createElement('div');
      card.className = 'card';
      const btn = document.createElement('button');
      const pendingThisType = game.placingHeroType === type;
      btn.textContent = pendingThisType ? `Placing… ${formatJewel(game.placingHeroCost)} JEWEL` : `Hire ${t.name} (${formatJewel(cost)} JEWEL)`;
      btn.disabled = game.jewel < cost || !!game.placingHeroType || game.phase === SETUP_PHASES.GAME_OVER || game.phase !== SETUP_PHASES.BATTLE;
      btn.addEventListener('click', () => {
        game.placingHeroType = type;
        game.placingHeroCost = cost;
        log(`Select a tile to place ${t.name}.`);
        render();
      });
      card.innerHTML = `<h4>${t.name}</h4><p>${type === 'priest' ? 'Support and heals' : type === 'warrior' ? 'Tank and chokepoint anchor' : type === 'wizard' ? 'Burst caster' : type === 'pirate' ? 'Utility and economy' : 'Ranged DPS'}</p>`;
      card.appendChild(btn);
      els.hirePanel.appendChild(card);
    }
  }

  function renderRelics() {
    els.relicPanel.innerHTML = '';

    const owned = getOwnedRelicObjects();
    const ownedCard = document.createElement('div');
    ownedCard.className = 'card relic-owned-card';
    ownedCard.innerHTML = owned.length
      ? `<h4>Owned Relics</h4><p>${owned.map(r => `<span class="relic-pill" title="${r.desc}">${r.name}</span>`).join(' ')}</p>`
      : '<h4>Owned Relics</h4><p>No relics yet.</p>';
    els.relicPanel.appendChild(ownedCard);

    if (!game.relicChoices.length) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<p>Relics appear every 7 waves.</p>';
      els.relicPanel.appendChild(card);
      return;
    }

    for (const relic of game.relicChoices) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h4>${relic.name}</h4><p>${relic.desc}</p><p class="gold">${formatJewel(relic.cost)} JEWEL</p>`;
      const btn = document.createElement('button');
      btn.className = 'buy-btn';
      btn.textContent = `Buy ${relic.name}`;
      btn.disabled = game.jewel < relic.cost;
      btn.addEventListener('click', () => buyRelic(relic.id));
      card.appendChild(btn);
      els.relicPanel.appendChild(card);
    }

    const skip = document.createElement('button');
    skip.className = 'secondary';
    skip.textContent = 'Skip relic shop';
    skip.addEventListener('click', () => {
      game.relicChoices = [];
      log('Skipped relic shop.');
      setCountdown(WAVE_BREAK_SECONDS);
      render();
    });
    els.relicPanel.appendChild(skip);
  }

  function canPlacePortal(x, y) {
