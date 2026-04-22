(() => {
  'use strict';

  const CONFIG = Object.freeze({
    url: window.DFK_SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '',
    key: window.DFK_SUPABASE_PUBLISHABLE_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '',
    nonceFunction: window.DFK_SUPABASE_NONCE_FUNCTION || 'wallet-auth-nonce',
    verifyFunction: window.DFK_SUPABASE_VERIFY_FUNCTION || 'wallet-auth-verify',
    submitFunction: window.DFK_SUPABASE_SUBMIT_RUN_FUNCTION || 'submit-run',
    revokeFunction: window.DFK_SUPABASE_REVOKE_RUN_SESSION_FUNCTION || 'revoke-run-session',
    sessionHours: Number(window.DFK_SUPABASE_SESSION_HOURS || 24),
    retryBaseMs: 15 * 1000,
    retryMaxMs: 15 * 60 * 1000,
    flushIntervalMs: 30 * 1000,
    debugFunction: window.DFK_SUPABASE_SESSION_DEBUG_FUNCTION || 'wallet-session-debug',
    secureSubmitChallengeFunction: window.DFK_SUPABASE_SECURE_SUBMIT_CHALLENGE_FUNCTION || 'run-submit-challenge',
    highValueWaveThreshold: Number(window.DFK_SECURE_RUN_SIGNATURE_WAVE_THRESHOLD || 30),
  });

  const SESSION_TOKEN_STORAGE_KEY = 'dfk_wallet_session_token';
  const GLOBAL_QUEUE_STORAGE_KEY = 'dfkRunTrackerQueue:v2';
  const QUEUE_RECORD_VERSION = 2;

  function persistSessionToken(token) {
    if (!token) return;
    try { sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token); } catch (_error) {}
    try { localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token); } catch (_error) {}
  }

  const state = {
    client: null,
    address: null,
    profileName: null,
    vanityName: null,
    status: 'Run Tracking: Not configured',
    statusClass: 'warn',
    summary: 'Tracked Runs: -- · Best Wave: --',
    session: null,
    lastAuthenticatedAddress: null,
    initialized: false,
    authPromise: null,
    queueFlushPromise: null,
    queueFlushTimer: null,
  };

  const ui = {};

  function qs(id) { return document.getElementById(id); }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }
  function setText(el, text) { if (el) el.textContent = text; }
  function nowMs() { return Date.now(); }
  function tokenFingerprint(token) { const v = String(token || ''); return v ? `${v.slice(0, 6)}…${v.slice(-4)}` : ''; }

  function sessionStorageKey(address) {
    return `dfkRunTrackerSession:${normalizeAddress(address)}`;
  }

  function getQueueStorageKey() {
    return GLOBAL_QUEUE_STORAGE_KEY;
  }

  function applyStatus(text, klass = 'warn') {
    state.status = text;
    state.statusClass = klass;
    render();
  }

  function render() {
    setText(ui.status, state.status);
    setText(ui.summary, state.summary);
    if (ui.status) ui.status.className = `wallet-tracking-status ${state.statusClass}`.trim();
    if (ui.enableBtn) {
      const showEnable = !state.session;
      ui.enableBtn.disabled = !showEnable || !state.address || !state.client;
      ui.enableBtn.textContent = 'Enable Run Tracking';
      ui.enableBtn.classList.toggle('hidden', !showEnable);
      ui.enableBtn.setAttribute('aria-hidden', showEnable ? 'false' : 'true');
    }
    if (ui.disableBtn) {
      const showDisable = !!state.session;
      ui.disableBtn.disabled = !showDisable || !state.address || !state.client;
      ui.disableBtn.textContent = 'Disable Run Tracking';
      ui.disableBtn.classList.toggle('hidden', !showDisable);
      ui.disableBtn.setAttribute('aria-hidden', showDisable ? 'false' : 'true');
    }
    if (ui.clearStuckWavesBtn) {
      const showClear = !!state.session;
      ui.clearStuckWavesBtn.disabled = !showClear;
      ui.clearStuckWavesBtn.textContent = 'Clear Stuck Waves';
      ui.clearStuckWavesBtn.classList.toggle('hidden', !showClear);
      ui.clearStuckWavesBtn.setAttribute('aria-hidden', showClear ? 'false' : 'true');
    }
    if (ui.vanityStatus) ui.vanityStatus.textContent = `Vanity Name: ${state.vanityName || '--'}`;
    if (ui.vanityInput && document.activeElement !== ui.vanityInput) ui.vanityInput.value = state.vanityName || '';
    if (ui.saveVanityBtn) ui.saveVanityBtn.disabled = !state.session || !state.client || !state.address;
    if (ui.vanitySection) {
      const showVanity = !!state.address;
      ui.vanitySection.classList.toggle('hidden', !showVanity);
      ui.vanitySection.setAttribute('aria-hidden', showVanity ? 'false' : 'true');
    }
  }

  function getWalletState() {
    return window.DFKDefenseWallet && typeof window.DFKDefenseWallet.getState === 'function'
      ? window.DFKDefenseWallet.getState()
      : null;
  }

  function isSessionStale(session) {
    if (!session) return true;
    const hardExpiryAt = session.expiresAt ? new Date(session.expiresAt).getTime() : 0;
    const authenticatedAt = session.authenticatedAt ? new Date(session.authenticatedAt).getTime() : 0;
    const staleAt = authenticatedAt ? authenticatedAt + (CONFIG.sessionHours * 60 * 60 * 1000) : 0;
    if (hardExpiryAt && nowMs() >= hardExpiryAt) return true;
    if (staleAt && nowMs() >= staleAt) return true;
    return false;
  }

  function restoreSession(address) {
    if (!address) return null;
    try {
      const raw = localStorage.getItem(sessionStorageKey(address));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.sessionToken) return null;
      if (isSessionStale(parsed)) {
        localStorage.removeItem(sessionStorageKey(address));
        return null;
      }
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function persistSession(address, session) {
    if (!address) return;
    try {
      localStorage.setItem(sessionStorageKey(address), JSON.stringify(session));
    } catch (_error) {
      // ignore storage failures
    }
  }

  function clearSession(address) {
    if (!address) return;
    try {
      localStorage.removeItem(sessionStorageKey(address));
    } catch (_error) {
      // ignore storage failures
    }
  }

  function parseQueuePayload(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function readQueue() {
    try {
      const raw = localStorage.getItem(getQueueStorageKey());
      return parseQueuePayload(raw);
    } catch (_error) {
      return [];
    }
  }

  function writeQueue(queue) {
    const normalizedQueue = Array.isArray(queue) ? queue : [];
    try {
      localStorage.setItem(getQueueStorageKey(), JSON.stringify(normalizedQueue));
      return true;
    } catch (_error) {
      applyStatus('Run Tracking: Local queue storage failed', 'bad');
      return false;
    }
  }

  function getQueueForAddress(address) {
    const normalized = normalizeAddress(address);
    return readQueue().filter((item) => normalizeAddress(item && item.walletAddress) === normalized);
  }

  function getPendingQueueCount(address) {
    return getQueueForAddress(address).filter((item) => item && item.status !== 'uploaded').length;
  }


  function clearQueueForAddress(address) {
    const normalized = normalizeAddress(address);
    if (!normalized) return { removed: 0, remaining: readQueue().length };
    const queue = readQueue();
    const filtered = queue.filter((item) => normalizeAddress(item && item.walletAddress) !== normalized);
    const removed = Math.max(0, queue.length - filtered.length);
    writeQueue(filtered);
    return { removed, remaining: filtered.length };
  }

  function clearRecentSubmissionMarker(address) {
    const normalized = normalizeAddress(address);
    if (!normalized) return;
    try {
      localStorage.removeItem(`dfkRecentTrackedRunSubmission:v1:${normalized}`);
    } catch (_error) {
      // ignore storage failures
    }
  }

  function clearWalletQueueState(address) {
    const normalized = normalizeAddress(address || state.address || getTrackingAddress() || '');
    if (!normalized) return { removed: 0, remaining: readQueue().length };
    const result = clearQueueForAddress(normalized);
    clearRecentSubmissionMarker(normalized);
    if (state.address && normalizeAddress(state.address) === normalized) {
      refreshSummary().catch(() => null);
      const pending = getPendingQueueCount(normalized);
      if (pending > 0) {
        const statusText = buildStatusText();
        applyStatus(statusText, /pending secure submission/i.test(statusText) ? 'bad' : 'warn');
      } else {
        applyStatus(buildStatusText(), isTrackingEnabled() ? 'good' : 'warn');
      }
    }
    notifyTrackingDataChanged();
    return result;
  }

  function makeQueueId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

function requiresSecureSubmission(payload) {
  if (payload && payload.continueAvailable) return false;
  const threshold = Math.max(1, Number(CONFIG.highValueWaveThreshold || 30));
  const waveReached = Number(payload && payload.waveReached || 0);
  const wavesCleared = Number(payload && payload.wavesCleared || 0);
  return Math.max(waveReached, wavesCleared) >= threshold;
}

function countQueueByStatus(address, status) {
  const normalized = normalizeAddress(address);
  return readQueue().filter((item) => (
    normalizeAddress(item && item.walletAddress) === normalized
    && String(item && item.status || '') === String(status || '')
  )).length;
}

function getPendingSecureCount(address) {
  return countQueueByStatus(address, 'pending_secure_signature');
}

function buildStatusText() {
  const address = normalizeAddress(state.address || getTrackingAddress() || '');
  const secureCount = address ? getPendingSecureCount(address) : 0;
  const uploadCount = address ? countQueueByStatus(address, 'pending_upload') : 0;
  if (secureCount > 0) {
    const uploadSuffix = uploadCount > 0 ? ` · ${uploadCount} upload pending` : '';
    return `Run Tracking: High-value run pending secure submission (${secureCount}${secureCount === 1 ? ' run' : ' runs'}${uploadSuffix})`;
  }
  if (uploadCount > 0) {
    const detail = `${uploadCount} pending upload${uploadCount === 1 ? '' : 's'} · stuck runs likely will not be accepted as tracked`;
    return isTrackingEnabled()
      ? `Run Tracking: Ready (${detail})`
      : `Run Tracking: Signature needed (${detail})`;
  }
  return isTrackingEnabled() ? 'Run Tracking: Ready' : 'Run Tracking: Signature needed';
}

function toBase64Url(bytes) {
  let binary = '';
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function canonicalize(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      if (value[key] === undefined) return acc;
      acc[key] = canonicalize(value[key]);
      return acc;
    }, {});
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

function sanitizeInt(value) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function sliceText(value, limit, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, limit);
}

function clampInt(value, min, max, fallback) {
  const parsed = Number(value);
  const fallbackNumber = Number(fallback || 0);
  const base = Number.isFinite(parsed) ? Math.round(parsed) : Math.round(Number.isFinite(fallbackNumber) ? fallbackNumber : 0);
  if (base < min) return min;
  if (base > max) return max;
  return base;
}

function hardenRunStatsForSubmission(input) {
  const source = input && input.stats && typeof input.stats === 'object' ? input.stats : {};
  const waveReached = Math.max(0, sanitizeInt(input && input.waveReached));
  const wavesCleared = Math.max(0, sanitizeInt(input && input.wavesCleared));
  const goldOnHand = Math.max(0, sanitizeInt(input && input.goldOnHand));
  const heroes = Array.isArray(input && input.heroes) ? input.heroes : [];
  const wavesStartedFloor = Math.max(waveReached, wavesCleared);
  const wavesCompletedCap = Math.max(0, wavesCleared);
  const wavesStartedCap = Math.max(wavesStartedFloor, wavesCompletedCap);
  let aggregateHeroCount = 0;
  let aggregateSatelliteCount = 0;
  let aggregateWalletHeroCount = 0;
  let warriorCount = 0;
  let spellbowCount = 0;
  let sageCount = 0;

  for (const hero of heroes) {
    const row = hero && typeof hero === 'object' ? hero : null;
    if (!row) continue;
    const type = sliceText(row.type, 40, '').toLowerCase();
    const count = sanitizeInt(row.count);
    aggregateHeroCount += count;
    aggregateSatelliteCount += Math.min(count, sanitizeInt(row.satellites));
    aggregateWalletHeroCount += Math.min(count, sanitizeInt(row.walletHeroCount));
    if (type === 'warrior') warriorCount += count;
    if (type === 'spellbow') spellbowCount += count;
    if (type === 'sage') sageCount += count;
  }

  const safeHeroCapacity = Math.max(aggregateHeroCount, 1) * Math.max(wavesCleared, 1);
  const killsCap = Math.max(5000, wavesStartedCap * 1000 + 5000);
  const heroDamageCap = Math.max(1000000, wavesStartedCap * 1000000 + 5000000);
  const supportHealingCap = Math.max(250000, safeHeroCapacity * 50000);
  const goldSpendCap = Math.max(250000, sanitizeInt(source.dfkGoldBurnedTotal || source.dfk_gold_burned_total) * 4 + wavesStartedCap * 50000 + 250000);
  const goldEarnedCap = Math.max(goldSpendCap, goldOnHand + goldSpendCap + wavesStartedCap * 25000 + 250000);
  const relicChoiceCap = Math.max(10, wavesStartedCap * 5 + 25);
  const upgradeCap = Math.max(25, wavesStartedCap * 10 + 50);
  const abilityTriggerCap = Math.max(100, wavesStartedCap * 100 + 500);
  const manualAbilityCap = Math.max(50, wavesStartedCap * 50 + 250);
  const bossCap = Math.min(killsCap, Math.max(10, wavesStartedCap * 5 + 25));

  const out = {
    towerCount: clampInt(source.towerCount, 0, 32, aggregateHeroCount),
    satelliteCount: clampInt(source.satelliteCount, 0, aggregateHeroCount, aggregateSatelliteCount),
    playerBarriersPlaced: clampInt(source.playerBarriersPlaced, 0, 2000),
    randomObstacles: clampInt(source.randomObstacles, 0, 2000),
    barrierRefits: clampInt(source.barrierRefits, 0, 2000),
    hireCount: clampInt(source.hireCount, 0, 32),
    crashed: Boolean(source.crashed),
    usedWalletHeroes: Boolean(source.usedWalletHeroes || source.used_wallet_heroes || aggregateWalletHeroCount > 0),
    usedWalletHeroCount: clampInt(source.usedWalletHeroCount || source.used_wallet_hero_count, 0, aggregateHeroCount, aggregateWalletHeroCount),
    dfkGoldBurnedTotal: clampInt(source.dfkGoldBurnedTotal || source.dfk_gold_burned_total, 0, 50000000),

    killsTotal: clampInt(source.killsTotal, 0, killsCap),
    killsElite: clampInt(source.killsElite, 0, killsCap),
    killsBoss: clampInt(source.killsBoss, 0, bossCap),
    heroKills: clampInt(source.heroKills, 0, killsCap),
    abilityKills: clampInt(source.abilityKills, 0, killsCap),
    killsSlowed: clampInt(source.killsSlowed, 0, killsCap),
    killsBurning: clampInt(source.killsBurning, 0, killsCap),
    killsStunned: clampInt(source.killsStunned, 0, killsCap),
    killsQuickSpawn: clampInt(source.killsQuickSpawn, 0, killsCap),
    killsNearPortal: clampInt(source.killsNearPortal, 0, killsCap),
    killsNearStatue: clampInt(source.killsNearStatue, 0, killsCap),
    killsMultiWave: clampInt(source.killsMultiWave, 0, killsCap),
    killsMulti3: clampInt(source.killsMulti3, 0, killsCap),
    killsPortalBelow75: clampInt(source.killsPortalBelow75, 0, killsCap),
    killsPortalBelow25: clampInt(source.killsPortalBelow25, 0, killsCap),
    critKills: clampInt(source.critKills, 0, killsCap),
    championKills: clampInt(source.championKills, 0, killsCap),

    heroesDeployed: clampInt(source.heroesDeployed, 0, Math.max(aggregateHeroCount + sanitizeInt(source.hireCount), sanitizeInt(source.hireCount), aggregateHeroCount)),
    wavesWithWarrior: clampInt(source.wavesWithWarrior, 0, warriorCount > 0 ? wavesCleared : 0),
    wavesWithSpellbow: clampInt(source.wavesWithSpellbow, 0, spellbowCount > 0 ? wavesCleared : 0),
    wavesWithSage: clampInt(source.wavesWithSage, 0, sageCount > 0 ? wavesCleared : 0),
    heroDamage: clampInt(source.heroDamage, 0, heroDamageCap),
    supportHealing: clampInt(source.supportHealing, 0, supportHealingCap),
    heroAbilityTriggers: clampInt(source.heroAbilityTriggers, 0, abilityTriggerCap),
    manualHeroAbilityTriggers: clampInt(source.manualHeroAbilityTriggers, 0, manualAbilityCap),
    heroAliveWaves: clampInt(source.heroAliveWaves, 0, safeHeroCapacity),
    barriersPlaced: clampInt(source.barriersPlaced, 0, 2000, sanitizeInt(source.playerBarriersPlaced)),
    barrierBlocks: clampInt(source.barrierBlocks, 0, Math.max(5000, wavesStartedCap * 50 + 500)),
    barrierReroutes: clampInt(source.barrierReroutes, 0, Math.max(5000, wavesStartedCap * 50 + 500)),
    wavesAllBarriersPlaced: clampInt(source.wavesAllBarriersPlaced, 0, wavesCleared),
    wavesZeroBarrierLoss: clampInt(source.wavesZeroBarrierLoss, 0, wavesCleared),
    runsAllBarriersPlaced: clampInt(source.runsAllBarriersPlaced, 0, 1),
    portalMoves: clampInt(source.portalMoves, 0, Math.max(25, wavesStartedCap)),
    wavesAfterPortalMove: clampInt(source.wavesAfterPortalMove, 0, wavesCleared),

    wavesStarted: clampInt(source.wavesStarted, 0, wavesStartedCap, wavesStartedFloor),
    wavesCompleted: clampInt(source.wavesCompleted, 0, wavesCleared, wavesCleared),
    wavesPast20: clampInt(source.wavesPast20, 0, Math.max(0, wavesCleared - 20), Math.max(0, wavesCleared - 20)),
    wavesPast30: clampInt(source.wavesPast30, 0, Math.max(0, wavesCleared - 30), Math.max(0, wavesCleared - 30)),
    wavesMulti2: clampInt(source.wavesMulti2, 0, wavesCleared),
    wavesMulti3: clampInt(source.wavesMulti3, 0, wavesCleared),
    multiWaveBonusTriggers: clampInt(source.multiWaveBonusTriggers, 0, wavesStartedCap),
    wavesFinishedNoRestart: clampInt(source.wavesFinishedNoRestart, 0, wavesCleared),
    runsReach10: clampInt(source.runsReach10, 0, waveReached >= 10 ? 1 : 0, waveReached >= 10 ? 1 : 0),
    runsReach20: clampInt(source.runsReach20, 0, waveReached >= 20 ? 1 : 0, waveReached >= 20 ? 1 : 0),

    goldSpent: clampInt(source.goldSpent, 0, goldSpendCap),
    goldEarned: clampInt(source.goldEarned, 0, goldEarnedCap),
    heroesHired: clampInt(source.heroesHired, 0, Math.max(sanitizeInt(source.hireCount), 0)),
    upgrades: clampInt(source.upgrades, 0, upgradeCap),
    avaxSpent: clampInt(source.avaxSpent, 0, 1000000000),
    dailyEliteQuestsCompleted: clampInt(source.dailyEliteQuestsCompleted, 0, 7),
    relicChoicesOpened: clampInt(source.relicChoicesOpened, 0, relicChoiceCap),
    foundRelicIds: Array.from(new Set((Array.isArray(source.foundRelicIds || source.found_relic_ids) ? (source.foundRelicIds || source.found_relic_ids) : [])
      .map((value) => sliceText(value, 64, ''))
      .filter(Boolean))).slice(0, 128),
  };

  out.killsElite = Math.min(sanitizeInt(out.killsElite), sanitizeInt(out.killsTotal));
  out.killsBoss = Math.min(sanitizeInt(out.killsBoss), sanitizeInt(out.killsTotal));
  out.heroKills = Math.min(sanitizeInt(out.heroKills), sanitizeInt(out.killsTotal));
  out.abilityKills = Math.min(sanitizeInt(out.abilityKills), sanitizeInt(out.killsTotal));
  out.killsSlowed = Math.min(sanitizeInt(out.killsSlowed), sanitizeInt(out.killsTotal));
  out.killsBurning = Math.min(sanitizeInt(out.killsBurning), sanitizeInt(out.killsTotal));
  out.killsStunned = Math.min(sanitizeInt(out.killsStunned), sanitizeInt(out.killsTotal));
  out.killsQuickSpawn = Math.min(sanitizeInt(out.killsQuickSpawn), sanitizeInt(out.killsTotal));
  out.killsNearPortal = Math.min(sanitizeInt(out.killsNearPortal), sanitizeInt(out.killsTotal));
  out.killsNearStatue = Math.min(sanitizeInt(out.killsNearStatue), sanitizeInt(out.killsTotal));
  out.killsMultiWave = Math.min(sanitizeInt(out.killsMultiWave), sanitizeInt(out.killsTotal));
  out.killsMulti3 = Math.min(sanitizeInt(out.killsMulti3), sanitizeInt(out.killsMultiWave));
  out.killsPortalBelow75 = Math.min(sanitizeInt(out.killsPortalBelow75), sanitizeInt(out.killsTotal));
  out.killsPortalBelow25 = Math.min(sanitizeInt(out.killsPortalBelow25), sanitizeInt(out.killsTotal));
  out.critKills = Math.min(sanitizeInt(out.critKills), sanitizeInt(out.killsTotal));
  out.championKills = Math.min(sanitizeInt(out.championKills), sanitizeInt(out.killsTotal));
  out.manualHeroAbilityTriggers = Math.min(sanitizeInt(out.manualHeroAbilityTriggers), sanitizeInt(out.heroAbilityTriggers));
  out.wavesMulti2 = Math.min(sanitizeInt(out.wavesMulti2), sanitizeInt(out.wavesCompleted));
  out.wavesMulti3 = Math.min(sanitizeInt(out.wavesMulti3), sanitizeInt(out.wavesMulti2));
  out.multiWaveBonusTriggers = Math.min(sanitizeInt(out.multiWaveBonusTriggers), sanitizeInt(out.wavesStarted));
  out.goldSpent = Math.min(sanitizeInt(out.goldSpent), goldSpendCap);
  out.goldEarned = Math.min(sanitizeInt(out.goldEarned), goldEarnedCap);
  return out;
}

async function sha256Base64Url(input) {
  const buffer = new TextEncoder().encode(String(input || ''));
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return toBase64Url(new Uint8Array(digest));
}


  function backoffDelayMs(attemptCount) {
    const attempt = Math.max(0, Number(attemptCount || 0));
    return Math.min(CONFIG.retryBaseMs * (2 ** attempt), CONFIG.retryMaxMs);
  }

  function upsertQueuedRun(runPayload, walletAddress) {
    const queue = readQueue();
    const normalized = normalizeAddress(walletAddress);
    const clientRunId = String(runPayload && runPayload.clientRunId ? runPayload.clientRunId : '').trim();
    if (!clientRunId || !normalized) return null;

    const existingIndex = queue.findIndex((item) => (
      normalizeAddress(item && item.walletAddress) === normalized
      && String(item && item.clientRunId ? item.clientRunId : '') === clientRunId
    ));

    const nowIso = new Date().toISOString();
    const base = existingIndex >= 0 && queue[existingIndex] ? queue[existingIndex] : null;
    const nextStatus = base && base.status === 'uploaded'
      ? 'uploaded'
      : (
        requiresSecureSubmission(runPayload) && !(runPayload && runPayload.secureSubmission && runPayload.secureSubmission.signature)
          ? 'pending_secure_signature'
          : 'pending_upload'
      );

    const record = {
      queueId: base && base.queueId ? base.queueId : makeQueueId(),
      formatVersion: QUEUE_RECORD_VERSION,
      walletAddress: normalized,
      clientRunId,
      status: nextStatus,
      createdAt: base && base.createdAt ? base.createdAt : nowIso,
      updatedAt: nowIso,
      uploadedAt: base && base.uploadedAt ? base.uploadedAt : null,
      attempts: Number(base && base.attempts ? base.attempts : 0),
      repairAttempts: Number(base && base.repairAttempts ? base.repairAttempts : 0),
      repairedAt: base && base.repairedAt ? base.repairedAt : null,
      nextRetryAt: base && base.nextRetryAt ? base.nextRetryAt : nowIso,
      lastError: base && base.lastError ? base.lastError : '',
      payload: {
        ...(base && base.payload ? base.payload : {}),
        ...(runPayload || {}),
        walletAddress: normalized,
      },
    };

    if (existingIndex >= 0) queue[existingIndex] = record;
    else queue.push(record);
    if (!writeQueue(queue)) return null;
    return record;
  }

  function markQueuedRunUploaded(queueId) {
    const queue = readQueue();
    const index = queue.findIndex((item) => item && item.queueId === queueId);
    if (index < 0) return;
    queue[index] = {
      ...queue[index],
      status: 'uploaded',
      updatedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      lastError: '',
      nextRetryAt: null,
    };
    writeQueue(queue);
  }


function updateQueueStatus(queueId, status, updates = {}) {
  const queue = readQueue();
  const index = queue.findIndex((item) => item && item.queueId === queueId);
  if (index < 0) return null;
  queue[index] = {
    ...queue[index],
    ...updates,
    status,
    updatedAt: new Date().toISOString(),
  };
  writeQueue(queue);
  return queue[index];
}

function attachSecureSubmission(queueId, secureSubmission) {
  const queue = readQueue();
  const index = queue.findIndex((item) => item && item.queueId === queueId);
  if (index < 0) return null;
  const current = queue[index];
  queue[index] = {
    ...current,
    status: 'pending_upload',
    updatedAt: new Date().toISOString(),
    lastError: '',
    nextRetryAt: new Date().toISOString(),
    payload: {
      ...(current && current.payload ? current.payload : {}),
      secureSubmission,
    },
  };
  writeQueue(queue);
  return queue[index];
}

  function markQueuedRunFailed(queueId, errorMessage) {
    const queue = readQueue();
    const index = queue.findIndex((item) => item && item.queueId === queueId);
    if (index < 0) return;
    const current = queue[index];
    const attempts = Number(current && current.attempts ? current.attempts : 0) + 1;
    const nextRetryAt = new Date(nowMs() + backoffDelayMs(attempts)).toISOString();
    queue[index] = {
      ...current,
      status: 'pending_upload',
      updatedAt: new Date().toISOString(),
      attempts,
      lastError: String(errorMessage || 'Upload failed'),
      nextRetryAt,
    };
    writeQueue(queue);
  }

  function purgeUploadedQueueRecords(address) {
    const normalized = normalizeAddress(address);
    const trimmed = readQueue().filter((item) => {
      if (normalizeAddress(item && item.walletAddress) !== normalized) return true;
      return item && item.status !== 'uploaded';
    });
    writeQueue(trimmed);
  }

  async function callFunction(functionName, payload, token) {
    const headers = {
      'Content-Type': 'application/json',
      apikey: CONFIG.key,
    };
    if (token) headers['x-session-token'] = token;
    const response = await fetch(`${CONFIG.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {}),
    });
    const responseText = await response.text().catch(() => '');
    let json = null;
    if (responseText) {
      try { json = JSON.parse(responseText); } catch (_error) { json = null; }
    }
    if (!response.ok) {
      const message = json && (json.error || json.message)
        ? (json.error || json.message)
        : (responseText || `Request failed: ${response.status}`);
      const requestId = response.headers.get('x-request-id') || response.headers.get('cf-ray') || '';
      const errorCode = json && (json.code || json.errorCode || json.reason) ? String(json.code || json.errorCode || json.reason) : '';
      const debugBits = [
        `fn=${functionName}`,
        `status=${response.status}`,
        errorCode ? `code=${errorCode}` : '',
        `sessionHeader=${token ? 'yes' : 'no'}`,
        requestId ? `requestId=${requestId}` : ''
      ].filter(Boolean);
      console.warn('[run-tracker] function call failed', {
        functionName,
        status: response.status,
        code: errorCode || null,
        sessionHeaderAttached: !!token,
        tokenFingerprint: tokenFingerprint(token),
        requestId,
        response: json || responseText || null,
      });
      if (!token && /authorization header|session token required|unauthorized|wallet mismatch/i.test(String(message || ''))) {
        throw new Error('Run tracking session missing. Re-enable run tracking, then press Refresh to flush pending runs.');
      }
      const err = new Error(`${message} [${debugBits.join(' ')}]`);
      err.status = response.status;
      err.code = errorCode || '';
      err.requestId = requestId || '';
      err.responseJson = json;
      throw err;
    }
    return json;
  }

  function isAuthErrorMessage(message) {
    return /invalid or expired session|session not found|missing authorization header|jwt|expired|unauthorized|wallet mismatch|session device mismatch|session origin mismatch|missing user agent|missing_session_token|session_expired|session_revoked|session_device_mismatch|session_origin_mismatch/i.test(String(message || ''));
  }


  function coerceIsoDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
  }

  function makeRunClientId(seed) {
    const base = String(seed || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const merged = (base ? `${base}-${suffix}` : `run-${suffix}`).slice(0, 120);
    return merged.length >= 8 ? merged : `run-${suffix}`;
  }

  function normalizeQueuedRunPayload(payload, fallbackWalletAddress) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const walletAddress = normalizeAddress(source.walletAddress || fallbackWalletAddress || state.address || getTrackingAddress() || '');
    const completedAt = coerceIsoDate(source.completedAt) || new Date().toISOString();
    const wavesCleared = Math.max(0, Number.isFinite(Number(source.wavesCleared)) ? Math.floor(Number(source.wavesCleared)) : 0);
    const waveReachedRaw = Number.isFinite(Number(source.waveReached)) ? Math.floor(Number(source.waveReached)) : wavesCleared;
    const waveReached = Math.max(wavesCleared, Math.max(0, waveReachedRaw));
    const approxDurationMs = Math.min(60 * 60 * 1000, Math.max(30 * 1000, Math.max(wavesCleared, 1) * 5 * 1000));
    const runStartedAt = coerceIsoDate(source.runStartedAt) || new Date(new Date(completedAt).getTime() - approxDurationMs).toISOString();
    const mode = source.mode === 'challenge' ? 'challenge' : 'easy';
    const result = source.result === 'win' ? 'win' : 'loss';
    const rawStats = source.stats && typeof source.stats === 'object' ? { ...source.stats } : {};
    const heroes = Array.isArray(source.heroes) ? source.heroes : [];
    const chainId = Number(source.chainId || (source.paymentSummary && source.paymentSummary.chainId) || window.DFK_AVAX_CHAIN_ID || 43114);
    const normalizedChainId = Number.isFinite(chainId) && chainId > 0 ? chainId : 43114;
    const portalHpLeft = Math.max(0, Number.isFinite(Number(source.portalHpLeft)) ? Math.floor(Number(source.portalHpLeft)) : 0);
    const goldOnHand = Math.max(0, Number.isFinite(Number(source.goldOnHand)) ? Math.floor(Number(source.goldOnHand)) : 0);
    const premiumJewels = Math.max(0, Number.isFinite(Number(source.premiumJewels)) ? Math.floor(Number(source.premiumJewels)) : 0);
    const stats = hardenRunStatsForSubmission({
      waveReached,
      wavesCleared,
      portalHpLeft,
      goldOnHand,
      result,
      heroes,
      stats: rawStats,
    });
    return {
      ...source,
      walletAddress,
      clientRunId: String(source.clientRunId || '').trim().length >= 8 ? String(source.clientRunId).trim() : makeRunClientId(walletAddress || 'run'),
      completedAt,
      runStartedAt,
      gameVersion: String(source.gameVersion || window.DFK_GAME_VERSION || 'V46.9.1.146').slice(0, 80),
      mode,
      result,
      chainId: normalizedChainId,
      waveReached,
      wavesCleared,
      portalHpLeft,
      goldOnHand,
      premiumJewels,
      heroes,
      stats,
    };
  }


function buildSecurePayloadForHash(payload, walletAddress) {
  const normalized = normalizeQueuedRunPayload(payload, walletAddress);
  return canonicalize({
    walletAddress: normalized.walletAddress,
    clientRunId: normalized.clientRunId,
    runStartedAt: normalized.runStartedAt,
    completedAt: normalized.completedAt,
    gameVersion: normalized.gameVersion,
    mode: normalized.mode,
    result: normalized.result,
    chainId: normalized.chainId,
    waveReached: normalized.waveReached,
    wavesCleared: normalized.wavesCleared,
    portalHpLeft: normalized.portalHpLeft,
    goldOnHand: normalized.goldOnHand,
    premiumJewels: normalized.premiumJewels,
    heroes: normalized.heroes,
    stats: normalized.stats,
  });
}

async function requestSecureRunSignature(queueItem, walletAddress) {
  const wallet = getWalletState();
  if (!wallet || !wallet.address || !wallet.selectedProvider) throw new Error('Connect your wallet first.');
  if (normalizeAddress(wallet.address) !== normalizeAddress(walletAddress)) throw new Error('Reconnect the wallet that owns this run to sign it.');
  await ensureAuthenticatedSession();
  const normalizedPayload = normalizeQueuedRunPayload(queueItem.payload, walletAddress);
  const payloadHash = await sha256Base64Url(JSON.stringify(buildSecurePayloadForHash(normalizedPayload, walletAddress)));
  const challenge = await callFunction(CONFIG.secureSubmitChallengeFunction, {
    walletAddress: normalizeAddress(walletAddress),
    clientRunId: normalizedPayload.clientRunId,
    waveReached: normalizedPayload.waveReached,
    completedAt: normalizedPayload.completedAt,
    payloadHash,
    gameVersion: normalizedPayload.gameVersion,
  }, state.session && state.session.sessionToken ? state.session.sessionToken : '');
  const message = String(challenge && challenge.message ? challenge.message : '').trim();
  if (!message) throw new Error('Secure submission message was missing.');
  const signature = await wallet.selectedProvider.request({
    method: 'personal_sign',
    params: [message, wallet.address],
  });
  const secureSubmission = {
    challengeToken: challenge.challengeToken,
    challengeId: challenge.challengeId,
    payloadHash,
    message,
    signature,
    signedAt: new Date().toISOString(),
    expiresAt: challenge.expiresAt || null,
  };
  return attachSecureSubmission(queueItem.queueId, secureSubmission) || queueItem;
}

  function isRepairableRunPayloadError(error) {
    const status = Number(error && error.status || 0);
    const code = String(error && error.code || '').trim().toLowerCase();
    return status === 400 && /invalid_|wallet_required|client_run_id_required|invalid_body|invalid_game_version|invalid_chain_id|invalid_mode|invalid_result|invalid_completed_at|invalid_run_started_at|invalid_wave_reached|invalid_waves_cleared|invalid_portal_hp_left|invalid_gold_on_hand|invalid_premium_jewels|invalid_heroes_payload|invalid_hero_|invalid_total_hero_count|invalid_hire_count|invalid_barrier_stats|invalid_dfk_gold_burned_total|run_duration_too_short/.test(code);
  }

  function isLegacyQueuedRun(queueItem) {
    const version = Number(queueItem && queueItem.formatVersion || 0);
    if (!version || version < QUEUE_RECORD_VERSION) return true;
    const payloadVersion = String(queueItem && queueItem.payload && queueItem.payload.gameVersion || '').trim();
    if (payloadVersion && String(window.DFK_GAME_VERSION || '').trim() && payloadVersion !== String(window.DFK_GAME_VERSION || '').trim()) return true;
    return false;
  }

  function buildRetryPayload(queueItem, walletAddress, options = {}) {
    const normalized = normalizeQueuedRunPayload((queueItem && queueItem.payload) || {}, walletAddress);
    const base = {
      walletAddress: normalized.walletAddress,
      clientRunId: normalized.clientRunId,
      completedAt: normalized.completedAt,
      runStartedAt: normalized.runStartedAt,
      gameVersion: String(window.DFK_GAME_VERSION || normalized.gameVersion || 'V46.9.1.146').slice(0, 80),
      mode: normalized.mode,
      result: normalized.result,
      chainId: normalized.chainId,
      waveReached: normalized.waveReached,
      wavesCleared: normalized.wavesCleared,
      portalHpLeft: normalized.portalHpLeft,
      goldOnHand: normalized.goldOnHand,
      premiumJewels: normalized.premiumJewels,
      heroes: Array.isArray(normalized.heroes) ? normalized.heroes : [],
      stats: normalized.stats,
    };
    if (!options.minimal) {
      const foundRelics = Array.isArray(normalized.foundRelicIds)
        ? normalized.foundRelicIds
        : Array.isArray(normalized.stats && normalized.stats.foundRelicIds)
          ? normalized.stats.foundRelicIds
          : [];
      if (foundRelics.length) base.foundRelicIds = Array.from(new Set(foundRelics.map((value) => sliceText(value, 64, '')).filter(Boolean))).slice(0, 128);
    }
    const secureRequired = requiresSecureSubmission(base);
    if (!options.dropSecureSubmission && secureRequired && normalized.secureSubmission && normalized.secureSubmission.signature) {
      base.secureSubmission = normalized.secureSubmission;
    }
    return base;
  }

  function persistRepairedQueueItem(queueItem, repairedPayload, extra = {}) {
    const queue = readQueue();
    const index = queue.findIndex((item) => item && item.queueId === (queueItem && queueItem.queueId));
    if (index < 0) return queueItem;
    const current = queue[index] || {};
    queue[index] = {
      ...current,
      formatVersion: QUEUE_RECORD_VERSION,
      updatedAt: new Date().toISOString(),
      repairedAt: new Date().toISOString(),
      repairAttempts: Number(current && current.repairAttempts ? current.repairAttempts : 0) + 1,
      lastError: '',
      nextRetryAt: new Date().toISOString(),
      payload: {
        ...(current && current.payload ? current.payload : {}),
        ...repairedPayload,
      },
      ...extra,
    };
    writeQueue(queue);
    return queue[index];
  }

  async function attemptAutomaticQueuedRunRepair(queueItem, walletAddress, options = {}) {
    const sessionToken = state.session && state.session.sessionToken ? state.session.sessionToken : '';
    if (!sessionToken) throw new Error('Run tracking session missing.');
    let workingItem = queueItem;
    const attempts = [
      { minimal: false, dropSecureSubmission: false, label: 'normalized' },
      { minimal: false, dropSecureSubmission: true, label: 'secure-reset' },
      { minimal: true, dropSecureSubmission: true, label: 'minimal-safe' },
    ];
    let lastError = null;
    for (const plan of attempts) {
      try {
        let payload = buildRetryPayload(workingItem, walletAddress, plan);
        if (requiresSecureSubmission(payload)) {
          if (plan.dropSecureSubmission || !payload.secureSubmission || !payload.secureSubmission.signature) {
            if (!options.interactive) {
              workingItem = persistRepairedQueueItem(workingItem, payload, {
                status: 'pending_secure_signature',
                lastError: 'This pending run was repaired automatically and needs a fresh secure signature.',
                nextRetryAt: null,
              });
              const err = new Error('This pending run was repaired automatically and needs a fresh secure signature.');
              err.secureSignatureRequired = true;
              throw err;
            }
            payload.secureSubmission = null;
            workingItem = persistRepairedQueueItem(workingItem, payload);
            const refreshed = await requestSecureRunSignature(workingItem, walletAddress);
            workingItem = refreshed || workingItem;
            payload = buildRetryPayload(workingItem, walletAddress, { minimal: plan.minimal, dropSecureSubmission: false });
          }
        }
        const result = await callFunction(CONFIG.submitFunction, payload, sessionToken);
        persistRepairedQueueItem(workingItem, payload);
        return { ok: true, result, repaired: true, queueItem: workingItem, strategy: plan.label };
      } catch (repairError) {
        lastError = repairError;
        if (repairError && repairError.secureSignatureRequired) throw repairError;
      }
    }
    throw lastError || new Error('Automatic pending run repair failed.');
  }


  async function debugSession(options = {}) {
    if (!CONFIG.url || !CONFIG.key || !CONFIG.debugFunction) {
      return { ok: false, error: 'Session debug function is not configured.' };
    }
    const wallet = getWalletState();
    const address = options.address || state.address || (wallet && wallet.address) || '';
    const currentSession = (options.forceRefresh && address) ? null : (state.session || restoreSession(address));
    const token = options.token || (currentSession && currentSession.sessionToken) || '';
    const payload = {
      walletAddress: address || null,
      reason: options.reason || null,
      source: options.source || 'run-tracker',
      includeClientContext: true,
    };
    const headers = {
      'Content-Type': 'application/json',
      apikey: CONFIG.key,
    };
    if (token) headers['x-session-token'] = token;
    try {
      const response = await fetch(`${CONFIG.url}/functions/v1/${CONFIG.debugFunction}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const raw = await response.text().catch(() => '');
      let json = {};
      try { json = raw ? JSON.parse(raw) : {}; } catch (_error) { json = { raw }; }
      const result = {
        ok: response.ok,
        status: response.status,
        tokenFingerprint: tokenFingerprint(token),
        requestOrigin: window.location.origin,
        walletAddress: address || null,
        debug: json,
      };
      console.warn('[run-tracker] session debug', result);
      return result;
    } catch (error) {
      const result = {
        ok: false,
        error: String(error && error.message ? error.message : error || 'Session debug failed.'),
        tokenFingerprint: tokenFingerprint(token),
        requestOrigin: window.location.origin,
        walletAddress: address || null,
      };
      console.warn('[run-tracker] session debug failed', result);
      return result;
    }
  }

  async function ensureAuthenticatedSession(options = {}) {
    const forceRefresh = !!options.forceRefresh;
    const wallet = getWalletState();
    if (!wallet || !wallet.address || !wallet.selectedProvider) throw new Error('Connect your wallet first.');
    state.address = wallet.address;
    state.profileName = wallet.profileName || state.profileName || null;
    if (forceRefresh) {
      clearSession(wallet.address);
      state.session = null;
    }
    if (state.session && !forceRefresh && !isSessionStale(state.session)) return state.session;
    const restored = !forceRefresh ? restoreSession(wallet.address) : null;
    if (restored) {
      state.session = restored;
      state.lastAuthenticatedAddress = normalizeAddress(wallet.address);
      return restored;
    }
    return authenticate();
  }

  function buildLoginMessage(nonce, address) {
    const domain = window.location.host;
    const origin = window.location.origin;
    return [
      `${domain} wants you to enable DFK Defender run tracking for:`,
      address,
      '',
      'This signs you in for run tracking only. It does not trigger a blockchain transaction.',
      '',
      `URI: ${origin}`,
      'Version: 1',
      'Chain ID: 53935',
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
  }

  async function disableTracking() {
    const walletAddress = getTrackingAddress();
    const sessionToken = state.session && state.session.sessionToken ? state.session.sessionToken : '';

    if (!state.client) {
      if (walletAddress) clearSession(walletAddress);
      state.session = null;
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      applyStatus('Run Tracking: Not configured', 'warn');
      return false;
    }
    if (!walletAddress) {
      state.session = null;
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      applyStatus('Run Tracking: Connect wallet', 'warn');
      return false;
    }
    if (!sessionToken) {
      clearSession(walletAddress);
      state.session = null;
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      applyStatus('Run Tracking: Disabled', 'warn');
      return true;
    }

    applyStatus('Run Tracking: Disabling…', 'warn');
    try {
      await callFunction(CONFIG.revokeFunction, { walletAddress }, sessionToken);
      clearSession(walletAddress);
      state.session = null;
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      applyStatus('Run Tracking: Disabled', 'warn');
      return true;
    } catch (error) {
      const message = String(error && error.message ? error.message : 'Disable failed');
      if (/session not found|session revoked|session expired|wallet mismatch|unauthorized/i.test(message)) {
        clearSession(walletAddress);
        state.session = null;
        state.summary = 'Tracked Runs: -- · Best Wave: --';
        applyStatus('Run Tracking: Disabled', 'warn');
        return true;
      }
      applyStatus(`Run Tracking: ${message || 'Disable failed'}`, 'bad');
      return false;
    }
  }

  function getTrackingAddress() {
    return state.address || state.lastAuthenticatedAddress || null;
  }

  function isTrackingEnabled() {
    const trackingAddress = getTrackingAddress();
    if (!trackingAddress || !state.session) return false;
    if (isSessionStale(state.session)) {
      clearSession(trackingAddress);
      state.session = null;
      applyStatus('Run Tracking: Signature needed', 'warn');
      return false;
    }
    return Boolean(state.session.sessionToken);
  }

  function shouldWarnBeforeEnable() {
    return !state.session;
  }

  function hasMeaningfulUntrackedGameInProgress() {
    if (state.session) return false;
    const controller = window.DFKDefenseGameControl;
    return Boolean(
      controller
      && typeof controller.hasMeaningfulRunInProgress === 'function'
      && controller.hasMeaningfulRunInProgress()
    );
  }

  async function restartGameForTrackingIfNeeded() {
    const controller = window.DFKDefenseGameControl;
    if (!controller || typeof controller.restartForTracking !== 'function') return;
    await controller.restartForTracking();
  }

  async function authenticate(options = {}) {
    if (state.authPromise) return state.authPromise;

    state.authPromise = (async () => {
      const forceRefresh = !!(options && options.forceRefresh);
      const wallet = getWalletState();
      if (!wallet || !wallet.address || !wallet.selectedProvider) throw new Error('Connect your wallet first.');
      state.address = wallet.address;
      if (forceRefresh) {
        clearSession(wallet.address);
        state.session = null;
        state.sessionToken = null;
        try { sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY); } catch (_error) {}
        try { localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY); } catch (_error) {}
      }
      const restored = forceRefresh ? null : restoreSession(wallet.address);
      if (restored) {
        state.session = restored;
        state.lastAuthenticatedAddress = normalizeAddress(wallet.address);
        applyStatus('Run Tracking: Ready', 'good');
        await refreshSummary();
        await processPendingRuns({ address: wallet.address, interactive: false });
        return restored;
      }
      applyStatus('Run Tracking: Waiting for signature…', 'warn');
      const noncePayload = await callFunction(CONFIG.nonceFunction, { address: wallet.address });
      const message = noncePayload && noncePayload.message ? String(noncePayload.message) : buildLoginMessage(noncePayload.nonce, wallet.address);
      const signature = await wallet.selectedProvider.request({
        method: 'personal_sign',
        params: [message, wallet.address],
      });
      let verifyPayload;
      try {
        verifyPayload = await callFunction(CONFIG.verifyFunction, {
          address: wallet.address,
          message,
          signature,
          displayName: wallet.profileName || null,
          walletProvider: wallet.providerInfo && wallet.providerInfo.name ? wallet.providerInfo.name : null,
        });
        if (verifyPayload && verifyPayload.displayName) state.profileName = String(verifyPayload.displayName);
        if (verifyPayload && verifyPayload.sessionToken) {
          state.sessionToken = String(verifyPayload.sessionToken);
          persistSessionToken(state.sessionToken);
        }
      } catch (error) {
        const errorMessage = String(error && error.message ? error.message : '');
        if (/nonce (?:already used|mismatch|expired)|nonce not found/i.test(errorMessage)) {
          const retryNoncePayload = await callFunction(CONFIG.nonceFunction, { address: wallet.address });
          const retryMessage = retryNoncePayload && retryNoncePayload.message
            ? String(retryNoncePayload.message)
            : buildLoginMessage(retryNoncePayload.nonce, wallet.address);
          const retrySignature = await wallet.selectedProvider.request({
            method: 'personal_sign',
            params: [retryMessage, wallet.address],
          });
          verifyPayload = await callFunction(CONFIG.verifyFunction, {
            address: wallet.address,
            message: retryMessage,
            signature: retrySignature,
            displayName: wallet.profileName || null,
            walletProvider: wallet.providerInfo && wallet.providerInfo.name ? wallet.providerInfo.name : null,
          });
        } else {
          throw error;
        }
      }
      const session = {
        sessionToken: verifyPayload.sessionToken,
        expiresAt: verifyPayload.expiresAt,
        authenticatedAt: new Date().toISOString(),
      };
      state.session = session;
      state.lastAuthenticatedAddress = normalizeAddress(wallet.address);
      persistSession(wallet.address, session);
      applyStatus('Run Tracking: Ready', 'good');
      await refreshSummary();
      await processPendingRuns({ address: wallet.address, interactive: false });
      return session;
    })();

    try {
      return await state.authPromise;
    } finally {
      state.authPromise = null;
    }
  }

  async function refreshSummary(options = {}) {
    if (!state.client || !state.address) {
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      render();
      return null;
    }
    const address = normalizeAddress(state.address);
    const pendingCount = getPendingQueueCount(address);
    const securePendingCount = getPendingSecureCount(address);
    const { data, error } = await state.client
      .from('players')
      .select('wallet_address,display_name,vanity_name,best_wave,total_runs,last_run_at')
      .eq('wallet_address', address)
      .maybeSingle();
    if (error) {
      state.summary = pendingCount > 0
        ? `Tracked Runs: -- · Best Wave: -- · Pending: ${pendingCount}${securePendingCount > 0 ? ` (Secure: ${securePendingCount})` : ''}`
        : 'Tracked Runs: -- · Best Wave: --';
      render();
      return null;
    }
    if (!data) {
      state.summary = pendingCount > 0
        ? `Tracked Runs: 0 · Best Wave: 0 · Pending: ${pendingCount}${securePendingCount > 0 ? ` (Secure: ${securePendingCount})` : ''}`
        : 'Tracked Runs: 0 · Best Wave: 0';
      render();
      return null;
    }
    state.vanityName = data.vanity_name || null;
    const runs = Number(data.total_runs || 0);
    const bestWave = Number(data.best_wave || 0);
    state.summary = pendingCount > 0
      ? `Tracked Runs: ${runs} · Best Wave: ${bestWave} · Pending: ${pendingCount}${securePendingCount > 0 ? ` (Secure: ${securePendingCount})` : ''}`
      : `Tracked Runs: ${runs} · Best Wave: ${bestWave}`;
    render();
    if (options && options.flushPending && pendingCount > 0 && state.session && !isSessionStale(state.session)) {
      try {
        await processPendingRuns({ address, interactive: false, force: true });
      } catch (_error) {}
    }
    return data;
  }

  async function uploadQueuedRun(queueItem, options = {}) {
    if (!queueItem || !queueItem.payload) return { ok: false, queued: false, error: 'Missing queue item.' };
    const interactive = !!options.interactive;
    const walletAddress = normalizeAddress(queueItem.walletAddress || (queueItem.payload && queueItem.payload.walletAddress) || '');
    if (!walletAddress) return { ok: false, queued: true, error: 'Missing wallet address.' };
    if (!state.client) return { ok: false, queued: true, error: 'Supabase is not configured.' };

    const secureRequired = requiresSecureSubmission(queueItem.payload);
    if (secureRequired) {
      const secureSubmission = queueItem.payload && queueItem.payload.secureSubmission ? queueItem.payload.secureSubmission : null;
      if (!secureSubmission || !secureSubmission.signature || !secureSubmission.challengeToken || !secureSubmission.payloadHash) {
        if (interactive) {
          try {
            const refreshed = await requestSecureRunSignature(queueItem, walletAddress);
            queueItem = refreshed || queueItem;
          } catch (error) {
            const message = error && error.message ? error.message : 'Secure signature needed.';
            updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
              lastError: message,
              nextRetryAt: null,
            });
            return { ok: false, queued: true, secureSignatureRequired: true, error: message };
          }
        } else {
          updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
            lastError: 'Secure signature needed.',
            nextRetryAt: null,
          });
          return { ok: false, queued: true, secureSignatureRequired: true, error: 'Secure signature needed.' };
        }
      }
    }

    const currentSession = restoreSession(walletAddress);
    if (currentSession) {
      state.session = currentSession;
      state.lastAuthenticatedAddress = walletAddress;
    }

    if (!state.session || isSessionStale(state.session)) {
      clearSession(walletAddress);
      state.session = null;
      if (interactive) {
        try {
          await ensureAuthenticatedSession({ forceRefresh: true });
        } catch (error) {
          const message = error && error.message ? error.message : 'Signature needed.';
          markQueuedRunFailed(queueItem.queueId, message);
          return { ok: false, queued: true, authRequired: true, error: message };
        }
      } else {
        markQueuedRunFailed(queueItem.queueId, 'Signature needed.');
        return { ok: false, queued: true, authRequired: true, error: 'Signature needed.' };
      }
    }

    try {
      const normalizedPayload = normalizeQueuedRunPayload(queueItem.payload, walletAddress);
      if (secureRequired) {
        const secureSubmission = normalizedPayload && normalizedPayload.secureSubmission ? normalizedPayload.secureSubmission : null;
        const expectedPayloadHash = await sha256Base64Url(JSON.stringify(buildSecurePayloadForHash(normalizedPayload, walletAddress)));
        if (!secureSubmission || String(secureSubmission.payloadHash || '').trim() !== expectedPayloadHash) {
          if (interactive) {
            try {
              const refreshed = await requestSecureRunSignature({ ...queueItem, payload: normalizedPayload }, walletAddress);
              queueItem = refreshed || queueItem;
            } catch (error) {
              const message = error && error.message ? error.message : 'Secure signature needed.';
              updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
                lastError: message,
                nextRetryAt: null,
              });
              return { ok: false, queued: true, secureSignatureRequired: true, error: message };
            }
          } else {
            updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
              lastError: 'Secure signature needs refresh.',
              nextRetryAt: null,
            });
            return { ok: false, queued: true, secureSignatureRequired: true, error: 'Secure signature needs refresh.' };
          }
        }
      }
      const payloadToSubmit = normalizeQueuedRunPayload((queueItem && queueItem.payload) || normalizedPayload, walletAddress);
      const result = await callFunction(CONFIG.submitFunction, payloadToSubmit, state.session.sessionToken);
      markQueuedRunUploaded(queueItem.queueId);
      return { ok: true, queued: false, result };
    } catch (error) {
      const message = error && error.message ? error.message : 'Upload failed';
      if (isAuthErrorMessage(message)) {
        clearSession(walletAddress);
        state.session = null;
        if (interactive) {
          try {
            await ensureAuthenticatedSession({ forceRefresh: true });
            const retried = await callFunction(CONFIG.submitFunction, normalizeQueuedRunPayload(queueItem.payload, walletAddress), state.session.sessionToken);
            markQueuedRunUploaded(queueItem.queueId);
            return { ok: true, queued: false, result: retried };
          } catch (retryError) {
            const retryMessage = retryError && retryError.message ? retryError.message : message;
            markQueuedRunFailed(queueItem.queueId, retryMessage);
            return { ok: false, queued: true, authRequired: true, error: retryMessage };
          }
        }
      }
      if (String(error && error.code || '').trim().toLowerCase() === 'secure_payload_hash_mismatch') {
        try {
          const repairedPayload = normalizeQueuedRunPayload({
            ...((queueItem && queueItem.payload) || {}),
            secureSubmission: null,
          }, walletAddress);
          const repairedItem = upsertQueuedRun(repairedPayload, walletAddress);
          queueItem = repairedItem || queueItem;
          if (interactive) {
            try {
              const refreshed = await requestSecureRunSignature(queueItem, walletAddress);
              queueItem = refreshed || queueItem;
              const retriedPayload = normalizeQueuedRunPayload(queueItem.payload, walletAddress);
              const retried = await callFunction(CONFIG.submitFunction, retriedPayload, state.session.sessionToken);
              markQueuedRunUploaded(queueItem.queueId);
              return { ok: true, queued: false, result: retried, repaired: true };
            } catch (repairError) {
              const repairMessage = repairError && repairError.message ? repairError.message : message;
              if (/secure signature needed|sign/i.test(repairMessage)) {
                updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
                  lastError: repairMessage,
                  nextRetryAt: null,
                });
                return { ok: false, queued: true, secureSignatureRequired: true, error: repairMessage };
              }
              markQueuedRunFailed(queueItem.queueId, repairMessage);
              return { ok: false, queued: true, error: repairMessage };
            }
          }
          updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
            lastError: 'Secure signature refresh required before upload.',
            nextRetryAt: null,
          });
          return { ok: false, queued: true, secureSignatureRequired: true, error: 'Secure signature refresh required before upload.' };
        } catch (repairPrepError) {
          const repairPrepMessage = repairPrepError && repairPrepError.message ? repairPrepError.message : message;
          markQueuedRunFailed(queueItem.queueId, repairPrepMessage);
          return { ok: false, queued: true, error: repairPrepMessage };
        }
      }
      if (isRepairableRunPayloadError(error) || isLegacyQueuedRun(queueItem)) {
        try {
          const repaired = await attemptAutomaticQueuedRunRepair(queueItem, walletAddress, { interactive });
          markQueuedRunUploaded(queueItem.queueId);
          return { ok: true, queued: false, result: repaired.result, repaired: true, repairStrategy: repaired.strategy };
        } catch (repairError) {
          const repairMessage = repairError && repairError.message ? repairError.message : message;
          if (repairError && repairError.secureSignatureRequired) {
            return { ok: false, queued: true, secureSignatureRequired: true, error: repairMessage };
          }
          markQueuedRunFailed(queueItem.queueId, repairMessage || 'This pending run was recorded on an older build and could not be repaired automatically.');
          return { ok: false, queued: true, error: repairMessage || 'This pending run was recorded on an older build and could not be repaired automatically.' };
        }
      }
      markQueuedRunFailed(queueItem.queueId, message);
      return { ok: false, queued: true, error: message };
    }
  }


  function notifyTrackingDataChanged() {
    try {
      if (window.DFKLeaderboardRows) window.DFKLeaderboardRows = [];
      window.dispatchEvent(new CustomEvent('dfk:leaderboard-refresh-requested'));
      window.dispatchEvent(new CustomEvent('dfk:tracked-runs-refresh-requested'));
    } catch (_error) {
      // ignore refresh-notify failures
    }
  }

  async function processPendingRuns(options = {}) {
    const address = normalizeAddress(options.address || state.address || getTrackingAddress() || '');
    const interactive = !!options.interactive;
    const force = !!options.force;
    if (!address) return { uploaded: 0, pending: 0 };
    if (state.queueFlushPromise && !force) return state.queueFlushPromise;

    state.queueFlushPromise = (async () => {
      const queue = getQueueForAddress(address)
        .filter((item) => item && item.status !== 'uploaded')
        .filter((item) => interactive ? true : String(item && item.status || '') !== 'pending_secure_signature')
        .filter((item) => force || !item.nextRetryAt || nowMs() >= new Date(item.nextRetryAt).getTime())
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      let uploaded = 0;
      for (const item of queue) {
        const result = await uploadQueuedRun(item, { interactive });
        if (result && result.ok) uploaded += 1;
      }

      purgeUploadedQueueRecords(address);
      await refreshSummary();
      if (uploaded > 0) notifyTrackingDataChanged();

      const pending = getPendingQueueCount(address);
      if (pending > 0) {
        const statusText = buildStatusText();
        applyStatus(statusText, /pending secure submission/i.test(statusText) ? 'bad' : 'warn');
      } else if (state.address) {
        applyStatus(buildStatusText(), isTrackingEnabled() ? 'good' : 'warn');
      }

      return { uploaded, pending };
    })();

    try {
      return await state.queueFlushPromise;
    } finally {
      state.queueFlushPromise = null;
    }
  }

  function scheduleQueueFlush() {
    if (state.queueFlushTimer) {
      clearInterval(state.queueFlushTimer);
      state.queueFlushTimer = null;
    }
    state.queueFlushTimer = window.setInterval(() => {
      try {
        const address = normalizeAddress(state.address || getTrackingAddress() || '');
        if (!address || document.hidden) return;
        const pendingCount = getPendingQueueCount(address);
        if (pendingCount <= 0) return;
        const currentSession = restoreSession(address);
        if (!currentSession || isSessionStale(currentSession)) return;
        state.session = currentSession;
        state.lastAuthenticatedAddress = address;
        processPendingRuns({ address, interactive: false }).catch(() => {});
      } catch (_error) {}
    }, 20000);
  }

  async function submitCompletedRun(runPayload) {
    try {
      const wallet = getWalletState();
      const walletAddress = wallet && wallet.address ? wallet.address : getTrackingAddress();
      if (!walletAddress) return { ok: false, queued: false, error: 'Missing wallet address.' };
      if (wallet && wallet.address) {
        state.address = wallet.address;
        state.profileName = wallet.profileName || null;
      }
      const payload = {
        ...runPayload,
        displayName: wallet && wallet.profileName ? wallet.profileName : (state.profileName || null),
        walletAddress: normalizeAddress(walletAddress),
      };

      const queueItem = upsertQueuedRun(payload, walletAddress);
      await refreshSummary().catch(() => null);
      if (!queueItem) {
        applyStatus('Run Tracking: Local queue save failed', 'bad');
        return { ok: false, queued: false, error: 'Local queue save failed.' };
      }

      if (!state.client) {
        applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
        return { ok: false, queued: true, localOnly: true, queueId: queueItem.queueId };
      }

      const secureRequired = requiresSecureSubmission(payload);
      applyStatus(secureRequired ? 'Run Tracking: High-value run pending secure submission' : 'Run Tracking: Saving run…', 'warn');
      const result = await uploadQueuedRun(queueItem, { interactive: true });
      await refreshSummary().catch(() => null);

      if (result && result.ok) {
        notifyTrackingDataChanged();
        applyStatus('Run Tracking: Ready', 'good');
        return { ...result, queueId: queueItem.queueId };
      }

      if (result && result.secureSignatureRequired) {
        applyStatus('Run Tracking: High-value run pending secure submission', 'bad');
      } else {
        applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
      }
      return { ...(result || { ok: false, queued: true, error: 'Upload pending.' }), queueId: queueItem.queueId };
    } catch (error) {
      const message = error && error.message ? error.message : 'Run submission failed.';
      applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
      return { ok: false, queued: true, error: message };
    }
  }

  function submitCompletedRunKeepalive(runPayload) {
    try {
      const wallet = getWalletState();
      const walletAddress = wallet && wallet.address ? wallet.address : getTrackingAddress();
      if (!walletAddress) return false;
      const payload = {
        ...runPayload,
        displayName: wallet && wallet.profileName ? wallet.profileName : (state.profileName || null),
        walletAddress: normalizeAddress(walletAddress),
      };

      const queueItem = upsertQueuedRun(payload, walletAddress);
      refreshSummary().catch(() => {});
      if (!queueItem) {
        applyStatus('Run Tracking: Local queue save failed', 'bad');
        return false;
      }

      if (requiresSecureSubmission(payload)) {
        updateQueueStatus(queueItem.queueId, 'pending_secure_signature', {
          lastError: 'High-value run pending secure submission.',
          nextRetryAt: null,
        });
        applyStatus('Run Tracking: High-value run pending secure submission', 'bad');
        return true;
      }

      if (!state.session || !state.session.sessionToken || !CONFIG.url || isSessionStale(state.session)) {
        applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
        return true;
      }

      try {
        const body = JSON.stringify(payload);
        fetch(`${CONFIG.url}/functions/v1/${CONFIG.submitFunction}`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            apikey: CONFIG.key,
            'x-session-token': String(state.session.sessionToken || ''),
          },
          body,
        }).then(async (response) => {
          if (!response || !response.ok) return;
          try {
            await processPendingRuns({ address: walletAddress, interactive: false, force: true });
          } catch (_error) {}
        }).catch(() => {});
      } catch (_error) {
        applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
      }
      return true;
    } catch (_error) {
      applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
      return false;
    }
  }

  async function handleWalletState(detail) {
    state.address = detail && detail.address ? detail.address : null;
    state.profileName = detail && detail.profileName ? detail.profileName : null;
    if (state.address) {
      state.session = restoreSession(state.address);
      if (state.session) state.lastAuthenticatedAddress = normalizeAddress(state.address);
    }
    if (!state.client) {
      applyStatus('Run Tracking: Not configured', 'warn');
      return;
    }
    if (!state.address) {
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      applyStatus('Run Tracking: Connect wallet', 'warn');
      return;
    }
    const pendingCount = getPendingQueueCount(state.address);
    const statusText = buildStatusText();
    if (state.session) {
      applyStatus(statusText, pendingCount > 0 ? (/pending secure submission/i.test(statusText) ? 'bad' : 'warn') : 'good');
    } else {
      applyStatus(statusText, /pending secure submission/i.test(statusText) ? 'bad' : 'warn');
    }
    await refreshSummary();
    if (state.session && !isSessionStale(state.session) && pendingCount > 0) {
      processPendingRuns({ address: state.address, interactive: false }).catch(() => {});
    }
  }

  async function saveVanityName() {
    if (!state.client) {
      applyStatus('Run Tracking: Not configured', 'warn');
      return;
    }
    const wallet = getWalletState();
    if (!wallet || !wallet.address) {
      applyStatus('Run Tracking: Connect wallet first', 'warn');
      return;
    }
    const raw = ui.vanityInput ? String(ui.vanityInput.value || '').trim() : '';
    const vanityName = raw ? raw.slice(0, 32) : null;
    if (vanityName && !/^[a-zA-Z0-9 _\-]{2,32}$/.test(vanityName)) {
      applyStatus('Run Tracking: Vanity name must be 2-32 letters, numbers, spaces, - or _', 'bad');
      return;
    }
    if (ui.saveVanityBtn) ui.saveVanityBtn.disabled = true;
    try {
      await ensureAuthenticatedSession();
      let result;
      try {
        result = await callFunction('set-vanity-name', { vanityName }, state.session && state.session.sessionToken ? state.session.sessionToken : '');
      } catch (error) {
        if (!isAuthErrorMessage(error && error.message ? error.message : error)) throw error;
        await ensureAuthenticatedSession({ forceRefresh: true });
        result = await callFunction('set-vanity-name', { vanityName }, state.session && state.session.sessionToken ? state.session.sessionToken : '');
      }
      state.vanityName = result && Object.prototype.hasOwnProperty.call(result, 'vanityName') ? (result.vanityName || null) : vanityName;
      await refreshSummary();
      applyStatus(vanityName ? 'Run Tracking: Vanity name saved' : 'Run Tracking: Vanity name cleared', 'good');
      if (window.DFKDefenseWallet && typeof window.DFKDefenseWallet.setVanityName === 'function') window.DFKDefenseWallet.setVanityName(vanityName);
      if (window.DFKLeaderboardRows) window.DFKLeaderboardRows = [];
      window.dispatchEvent(new CustomEvent('dfk:leaderboard-refresh-requested'));
    } finally {
      render();
    }
  }

  function bindUi() {
    ui.status = qs('walletTrackingStatus');
    ui.summary = qs('walletTrackingSummary');
    ui.enableBtn = qs('enableTrackingBtn');
    ui.disableBtn = qs('disableTrackingBtn');
    ui.clearStuckWavesBtn = qs('clearStuckWavesBtn');
    ui.vanitySection = qs('walletVanitySection');
    ui.vanityInput = qs('walletVanityInput');
    ui.vanityStatus = qs('walletVanityStatus');
    ui.saveVanityBtn = qs('saveVanityBtn');
    if (ui.saveVanityBtn) {
      ui.saveVanityBtn.addEventListener('click', () => {
        saveVanityName().catch((error) => applyStatus(`Run Tracking: ${error.message || 'Failed'}`, 'bad'));
      });
    }
    if (ui.enableBtn) {
      ui.enableBtn.addEventListener('click', async () => {
        const enablingDuringActiveUntrackedGame = hasMeaningfulUntrackedGameInProgress();
        const confirmMessage = enablingDuringActiveUntrackedGame
          ? 'This will cancel the current game and start a new one with run tracking enabled. Continue?'
          : 'If the player enables tracking, runs will be tracked until they disable it. Leaving in the middle of a game will end the run and the score will appear at whatever wave the player was at.';
        const shouldEnable = window.confirm(confirmMessage);
        if (!shouldEnable) return;

        ui.enableBtn.disabled = true;
        try {
          await authenticate();
          if (enablingDuringActiveUntrackedGame) await restartGameForTrackingIfNeeded();
          applyStatus('Run Tracking: Ready', 'good');
        } catch (error) {
          applyStatus(`Run Tracking: ${error.message || 'Failed'}`, 'bad');
        } finally {
          render();
        }
      });
    }
    if (ui.disableBtn) {
      ui.disableBtn.addEventListener('click', async () => {
        ui.disableBtn.disabled = true;
        try {
          await disableTracking();
        } catch (error) {
          applyStatus(`Run Tracking: ${error.message || 'Failed'}`, 'bad');
        } finally {
          render();
        }
      });
    }
    if (ui.clearStuckWavesBtn) {
      ui.clearStuckWavesBtn.addEventListener('click', () => {
        try {
          const control = window.DFKDefenseGameControl;
          const trackingAddress = normalizeAddress(state.address || getTrackingAddress() || '');
          let waveResult = { cleared: false, reason: 'unavailable' };
          if (control && typeof control.clearStuckWaves === 'function') {
            waveResult = control.clearStuckWaves() || waveResult;
          }
          let queueRemoved = 0;
          if (trackingAddress) {
            const queueClearResult = clearWalletQueueState(trackingAddress) || {};
            queueRemoved = Number(queueClearResult.removed || 0);
          }
          if (waveResult && waveResult.cleared && queueRemoved > 0) {
            applyStatus(`Run Tracking: Ready. Cleared the stuck wave and removed ${queueRemoved} pending tracked run${queueRemoved === 1 ? '' : 's'}. Stuck runs likely will not be accepted as tracked runs.`, 'warn');
          } else if (waveResult && waveResult.cleared) {
            applyStatus('Run Tracking: Ready. Stuck wave cleared. This run will likely not be accepted as a tracked run.', 'warn');
          } else if (queueRemoved > 0) {
            applyStatus(`Run Tracking: Ready. Removed ${queueRemoved} pending stuck tracked run${queueRemoved === 1 ? '' : 's'}.`, 'warn');
          } else if (!control || typeof control.clearStuckWaves !== 'function') {
            applyStatus('Run Tracking: Clear stuck waves is unavailable on this build.', 'bad');
          } else {
            applyStatus('Run Tracking: Ready. No stuck wave or pending stuck runs found to clear.', isTrackingEnabled() ? 'good' : 'warn');
          }
        } catch (error) {
          applyStatus(`Run Tracking: ${error.message || 'Failed to clear stuck wave.'}`, 'bad');
        } finally {
          render();
        }
      });
    }
  }

  async function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindUi();
    scheduleQueueFlush();
    if (window.supabase && CONFIG.url && CONFIG.key) {
      state.client = window.supabase.createClient(CONFIG.url, CONFIG.key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    window.addEventListener('dfk-defense:wallet-state', (event) => {
      handleWalletState(event.detail).catch((error) => applyStatus(`Run Tracking: ${error.message || 'Failed'}`, 'bad'));
    });
    const wallet = getWalletState();
    await handleWalletState(wallet || null);
  }

  window.DFKRunTracker = {
    init,
    authenticate,
    reauthenticate: () => authenticate({ forceRefresh: true }),
    debugSession,
    disableTracking,
    refreshSummary,
    flushPendingRuns: (options = {}) => processPendingRuns(options),
    submitCompletedRun,
    submitCompletedRunKeepalive,
    processPendingRuns,
    isTrackingEnabled,
    shouldWarnBeforeEnable,
    getTrackingAddress,
    getState: () => ({ ...state }),
    clearWalletQueueState,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
