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
    if (!token || isBadRunTrackingSessionToken(token)) return;
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
    authPausedUntil: 0,
    lastAuthFailureAt: 0,
  };

  const ui = {};

  function qs(id) { return document.getElementById(id); }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }
  function setText(el, text) { if (el) el.textContent = text; }
  function nowMs() { return Date.now(); }
  function tokenFingerprint(token) { const v = String(token || ''); return v ? `${v.slice(0, 6)}…${v.slice(-4)}` : ''; }

  function isUserRejectedAuthError(error) {
    const message = String(error && (error.message || error.code || error.reason) || '').toLowerCase();
    const code = Number(error && error.code || 0);
    return code === 4001 || message.includes('user rejected') || message.includes('user denied') || message.includes('rejected the request');
  }

  function isRunTrackingAuthPaused() {
    return Number(state.authPausedUntil || 0) > nowMs();
  }

  function pauseRunTrackingAuth(ms = 120000, reason = 'Run tracking signature paused.') {
    state.authPausedUntil = nowMs() + Math.max(15000, Number(ms || 0));
    state.lastAuthFailureAt = nowMs();
    applyStatus(reason, 'bad');
  }

  function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }

  function isBadRunTrackingSessionToken(token) {
    const text = String(token || '').trim();
    if (!text) return true;
    if (/^sb_(publishable|anon)_/i.test(text)) return true;

    // The submit-run shared wallet-session lookup expects a UUID session id.
    // Do not send Supabase JWTs, opaque JWTs, or other random strings as x-session-token.
    const parts = text.split('.');
    if (parts.length === 3 && parts.every(Boolean)) return true;
    if (!isUuidLike(text)) return true;

    return false;
  }

  function extractWalletSessionToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    const candidates = [
      payload.sessionToken,
      payload.session_token,
      payload.walletSessionToken,
      payload.wallet_session_token,
      payload.sessionId,
      payload.session_id,
      payload.id,
      payload.token,
      payload.session && payload.session.sessionToken,
      payload.session && payload.session.session_token,
      payload.session && payload.session.id,
    ];
    for (const candidate of candidates) {
      const token = String(candidate || '').trim();
      if (token && !isBadRunTrackingSessionToken(token)) return token;
    }
    return '';
  }

  function getUsableRunTrackingSession(session) {
    if (!session || !session.sessionToken) return null;
    if (isBadRunTrackingSessionToken(session.sessionToken)) return null;
    return session;
  }

  const RUN_TRACKING_SESSION_VERSION = 'v46_9_1_284';
  const RUN_TRACKING_SESSION_VERSION_KEY = 'dfkRunTrackingSessionVersion';

  function isSessionRefreshRequiredError(error) {
    const code = String(error && error.code || '').trim().toLowerCase();
    const message = String(error && error.message || '').trim().toLowerCase();
    return code === 'session_refresh_required'
      || code === 'session_lookup_failed'
      || code === 'missing_session_token'
      || code === 'session_expired'
      || code === 'session_revoked'
      || code === 'session_device_mismatch'
      || code === 'session_origin_mismatch'
      || code === 'wallet_mismatch'
      || /session refresh required|session lookup failed|valid session token required|session rejected|session expired|session revoked|session device mismatch|session origin mismatch|wallet mismatch/i.test(message);
  }

  function clearRunTrackingSessionForRefresh(address = '') {
    const normalized = normalizeAddress(address || state.address || getTrackingAddress() || '');
    const keys = Object.keys(localStorage || {});
    for (const key of keys) {
      const lower = key.toLowerCase();
      const targetsRunSession = lower.includes('runtrackersession')
        || lower.includes('run-tracker-session')
        || lower.includes('walletsession')
        || lower.includes('wallet-session')
        || (normalized && lower.includes(normalized) && lower.includes('session'));
      if (targetsRunSession) {
        try { localStorage.removeItem(key); } catch (_error) {}
      }
    }
    try { sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY); } catch (_error) {}
    try { localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY); } catch (_error) {}
    state.session = null;
    state.lastAuthenticatedAddress = null;
  }

  function enforceRunTrackingSessionVersion() {
    try {
      const saved = localStorage.getItem(RUN_TRACKING_SESSION_VERSION_KEY);
      if (saved === RUN_TRACKING_SESSION_VERSION) return false;
      clearRunTrackingSessionForRefresh();
      localStorage.setItem(RUN_TRACKING_SESSION_VERSION_KEY, RUN_TRACKING_SESSION_VERSION);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function refreshRunTrackingSessionForUpload(walletAddress, options = {}) {
    const normalized = normalizeAddress(walletAddress || state.address || getTrackingAddress() || '');
    if (!normalized) throw new Error('Wallet reconnect required before run upload.');
    clearRunTrackingSessionForRefresh(normalized);
    applyStatus('Run Tracking: Refreshing session…', 'warn');

    if (typeof ensureSession === 'function') {
      const session = await ensureSession(normalized, { interactive: !!options.interactive, force: true });
      if (session && session.sessionToken) return session;
    }

    if (typeof authenticateWallet === 'function') {
      const session = await authenticateWallet(normalized, { interactive: !!options.interactive, force: true });
      if (session && session.sessionToken) return session;
    }

    const restored = restoreSession(normalized);
    if (restored && !isSessionStale(restored)) {
      state.session = restored;
      state.lastAuthenticatedAddress = normalized;
      return restored;
    }

    throw new Error('Run tracking session refresh failed.');
  }

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

  function setWalletDependentDisabled(el, disabled, label = 'Connect wallet to use this.') {
    if (!el) return;
    const shouldDisable = !!disabled;
    el.disabled = shouldDisable;
    el.classList.toggle('wallet-dependent-disabled', shouldDisable);
    el.setAttribute('aria-disabled', shouldDisable ? 'true' : 'false');
    if (shouldDisable) {
      if (!el.dataset.enabledTitle) el.dataset.enabledTitle = el.getAttribute('title') || '';
      el.setAttribute('title', label);
      el.style.setProperty('opacity', '0.36', 'important');
      el.style.setProperty('filter', 'grayscale(0.9) saturate(0.4)', 'important');
      el.style.setProperty('cursor', 'not-allowed', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    } else {
      const priorTitle = el.dataset.enabledTitle || '';
      if (priorTitle) el.setAttribute('title', priorTitle);
      else el.removeAttribute('title');
      el.style.removeProperty('opacity');
      el.style.removeProperty('filter');
      el.style.removeProperty('cursor');
      el.style.removeProperty('pointer-events');
    }
  }

  function render() {
    setText(ui.status, state.status);
    setText(ui.summary, state.summary);
    if (ui.status) ui.status.className = `wallet-tracking-status ${state.statusClass}`.trim();
    const walletConnected = !!state.address;
    if (ui.enableBtn) {
      const showEnable = !state.session;
      setWalletDependentDisabled(ui.enableBtn, !showEnable || !walletConnected || !CONFIG.url || !CONFIG.key);
      ui.enableBtn.textContent = 'Enable Run Tracking';
      ui.enableBtn.classList.toggle('hidden', !showEnable);
      ui.enableBtn.setAttribute('aria-hidden', showEnable ? 'false' : 'true');
    }
    if (ui.disableBtn) {
      const showDisable = !!state.session || !!restoreSession(state.address || state.lastAuthenticatedAddress || '');
      setWalletDependentDisabled(ui.disableBtn, !showDisable || !walletConnected);
      ui.disableBtn.textContent = 'Disable Run Tracking';
      ui.disableBtn.classList.toggle('hidden', !showDisable);
      ui.disableBtn.setAttribute('aria-hidden', showDisable ? 'false' : 'true');
    }
    if (ui.clearStuckWavesBtn) {
      const showClear = !!state.session;
      setWalletDependentDisabled(ui.clearStuckWavesBtn, !showClear || !walletConnected);
      ui.clearStuckWavesBtn.textContent = 'Clear Stuck Waves';
      ui.clearStuckWavesBtn.classList.toggle('hidden', !showClear);
      ui.clearStuckWavesBtn.setAttribute('aria-hidden', showClear ? 'false' : 'true');
    }
    updateManageQueuedRunsButton();
    if (ui.vanityStatus) ui.vanityStatus.textContent = `Vanity Name: ${state.vanityName || '--'}`;
    if (ui.vanityInput && document.activeElement !== ui.vanityInput) ui.vanityInput.value = state.vanityName || '';
    if (ui.vanityInput) ui.vanityInput.classList.toggle('wallet-dependent-disabled', !walletConnected);
    if (ui.saveVanityBtn) setWalletDependentDisabled(ui.saveVanityBtn, !state.session || !CONFIG.url || !CONFIG.key || !walletConnected);
    if (ui.vanitySection) {
      const showVanity = true;
      ui.vanitySection.classList.toggle('hidden', !showVanity);
      ui.vanitySection.setAttribute('aria-hidden', showVanity ? 'false' : 'true');
    }
    try {
      window.dispatchEvent(new CustomEvent('dfk-defense:tracking-state', {
        detail: {
          enabled: isTrackingEnabled(),
          hasSession: !!state.session,
          status: state.status,
          address: state.address || state.lastAuthenticatedAddress || null,
        },
      }));
    } catch (_error) {}
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
      if (isBadRunTrackingSessionToken(parsed.sessionToken) || isSessionStale(parsed)) {
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

  const MAX_UPLOADED_QUEUE_RECORDS = 8;

  function compactReplayDataForQueue(replayData, aggressive = false) {
    if (!replayData || typeof replayData !== 'object') return null;
    const compact = {
      storageVersion: sanitizeInt(replayData.storageVersion || 0),
      shareId: sliceText(replayData.shareId, 64, ''),
      startedAt: sliceText(replayData.startedAt, 64, ''),
      completedAt: sliceText(replayData.completedAt, 64, ''),
      gameVersion: sliceText(replayData.gameVersion, 80, ''),
      appVersion: sliceText(replayData.appVersion, 80, ''),
      result: sliceText(replayData.result, 32, ''),
    };
    if (!aggressive) {
      const waveSnapshots = Array.isArray(replayData.waveSnapshots) ? replayData.waveSnapshots : [];
      const lightweightSnapshots = waveSnapshots.slice(-3).map((snapshot) => ({
        waveNumber: sanitizeInt(snapshot && snapshot.waveNumber),
        label: sliceText(snapshot && snapshot.label, 40, ''),
        portalHp: sanitizeInt(snapshot && snapshot.portalHp),
        jewel: sanitizeInt(snapshot && snapshot.jewel),
        premiumJewels: sanitizeInt(snapshot && snapshot.premiumJewels),
      })).filter((snapshot) => snapshot.waveNumber > 0 || snapshot.label);
      if (lightweightSnapshots.length) compact.waveSnapshots = lightweightSnapshots;
      compact.eventCount = Array.isArray(replayData.events) ? replayData.events.length : 0;
    }
    return compact;
  }

  function compactQueuePayloadForStorage(payload, aggressive = false) {
    if (!payload || typeof payload !== 'object') return payload;
    const compact = {
      ...payload,
      replayData: compactReplayDataForQueue(payload.replayData, aggressive),
    };
    if (compact.replayData == null) delete compact.replayData;
    return compact;
  }

  function compactQueueRecordsForStorage(queue, aggressive = false) {
    const normalizedQueue = Array.isArray(queue) ? queue : [];
    const uploaded = [];
    const pending = [];
    for (const item of normalizedQueue) {
      if (item && item.status === 'uploaded') uploaded.push(item);
      else pending.push(item);
    }
    uploaded.sort((a, b) => String(b && b.updatedAt || '').localeCompare(String(a && a.updatedAt || '')));
    const trimmedUploaded = uploaded.slice(0, MAX_UPLOADED_QUEUE_RECORDS);
    return [...pending, ...trimmedUploaded].map((item) => (
      !item || typeof item !== 'object'
        ? item
        : {
            ...item,
            payload: compactQueuePayloadForStorage(item.payload, aggressive),
          }
    ));
  }

  function writeQueue(queue) {
    const normalizedQueue = Array.isArray(queue) ? queue : [];
    const attempts = [
      normalizedQueue,
      compactQueueRecordsForStorage(normalizedQueue, false),
      compactQueueRecordsForStorage(normalizedQueue, true),
    ];
    for (const candidate of attempts) {
      try {
        localStorage.setItem(getQueueStorageKey(), JSON.stringify(candidate));
        return true;
      } catch (_error) {
        // try a smaller version below
      }
    }
    applyStatus('Run Tracking: Local queue storage failed', 'bad');
    return false;
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



  function getQueuedRunsForPlayer(address) {
    const normalized = normalizeAddress(address || state.address || getTrackingAddress() || '');
    if (!normalized) return [];
    return getQueueForAddress(normalized)
      .filter((item) => item && item.status !== 'uploaded')
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || (a.payload && a.payload.completedAt) || 0).getTime() || 0;
        const bTime = new Date(b.createdAt || (b.payload && b.payload.completedAt) || 0).getTime() || 0;
        return bTime - aTime;
      });
  }

  function formatQueuedRunDate(value) {
    const time = new Date(value || 0);
    if (!Number.isFinite(time.getTime())) return 'Unknown date';
    try {
      return time.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (_error) {
      return time.toISOString();
    }
  }

  function describeQueuedRunStatus(item) {
    const status = String(item && item.status || 'pending_upload').replace(/_/g, ' ');
    if (item && item.status === 'pending_secure_signature') return 'needs run signature';
    if (item && item.status === 'pending_auth') return 'needs tracking signature';
    if (item && item.status === 'failed') return 'retry needed';
    return status || 'pending upload';
  }

  function escapeQueuedRunHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function queuedRunMetric(item, key, fallback = 0) {
    const payload = item && item.payload ? item.payload : {};
    const value = Number(payload[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function renderQueuedRunsModalStatus(modal, text, klass = '') {
    const statusEl = modal ? modal.querySelector('[data-queued-runs-status]') : null;
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.className = `queued-runs-summary ${klass}`.trim();
  }

  function updateManageQueuedRunsButton() {
    if (!ui.manageQueuedRunsBtn) return;
    const walletConnected = !!(state.address || getTrackingAddress());
    const count = walletConnected ? getPendingQueueCount(state.address || getTrackingAddress()) : 0;
    ui.manageQueuedRunsBtn.textContent = count > 0 ? `Manage Queued Runs (${count})` : 'Manage Queued Runs';
    setWalletDependentDisabled(ui.manageQueuedRunsBtn, !walletConnected, 'Connect wallet to manage queued runs.');
  }

  function closeQueuedRunsModal() {
    const existing = document.getElementById('queuedRunsModalBackdrop');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  async function submitSingleQueuedRun(queueId, modal) {
    const address = normalizeAddress(state.address || getTrackingAddress() || '');
    const item = getQueuedRunsForPlayer(address).find((entry) => entry && entry.queueId === queueId);
    if (!item) {
      renderQueuedRunsModalStatus(modal, 'That queued run is no longer pending.', 'good');
      openQueuedRunsModal();
      return;
    }
    renderQueuedRunsModalStatus(modal, 'Submitting queued run… sign if prompted.', '');
    const result = await uploadQueuedRun(item, { interactive: true });
    purgeUploadedQueueRecords(address);
    await refreshSummary().catch(() => null);
    notifyTrackingDataChanged();
    openQueuedRunsModal();
    const reopened = document.getElementById('queuedRunsModalBackdrop');
    if (result && result.ok) renderQueuedRunsModalStatus(reopened, 'Queued run submitted.', 'good');
    else renderQueuedRunsModalStatus(reopened, `Still queued: ${result && result.error ? result.error : 'upload did not complete.'}`, 'bad');
  }

  async function retryAllQueuedRuns(modal) {
    const address = normalizeAddress(state.address || getTrackingAddress() || '');
    renderQueuedRunsModalStatus(modal, 'Retrying all queued runs… sign if prompted.', '');
    const result = await processPendingRuns({ address, interactive: true, force: true });
    openQueuedRunsModal();
    const reopened = document.getElementById('queuedRunsModalBackdrop');
    const uploaded = Number(result && result.uploaded || 0);
    const pending = Number(result && result.pending || 0);
    const failed = Number(result && result.failed || 0);
    if (pending <= 0) renderQueuedRunsModalStatus(reopened, `Retry complete. Uploaded ${uploaded} queued run${uploaded === 1 ? '' : 's'}.`, 'good');
    else renderQueuedRunsModalStatus(reopened, `Retry complete. Uploaded ${uploaded}; ${pending} still queued${failed ? `; ${failed} failed this attempt` : ''}.`, 'bad');
  }

  function openQueuedRunsModal() {
    closeQueuedRunsModal();
    const address = normalizeAddress(state.address || getTrackingAddress() || '');
    const runs = getQueuedRunsForPlayer(address);
    const backdrop = document.createElement('div');
    backdrop.id = 'queuedRunsModalBackdrop';
    backdrop.className = 'queued-runs-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    const cards = runs.length ? runs.map((item) => {
      const payload = item && item.payload ? item.payload : {};
      const created = item.createdAt || payload.completedAt || payload.startedAt || '';
      const completed = payload.completedAt || created;
      const waveReached = Math.max(queuedRunMetric(item, 'waveReached'), queuedRunMetric(item, 'wavesCleared'));
      const result = String(payload.result || 'run').replace(/_/g, ' ');
      const status = describeQueuedRunStatus(item);
      const attempts = Math.max(0, Number(item.attempts || 0) || 0);
      const error = item.lastError ? `<div class="queued-run-error">${escapeQueuedRunHtml(item.lastError)}</div>` : '';
      return `
        <div class="queued-run-card" data-queue-id="${escapeQueuedRunHtml(item.queueId)}">
          <div class="queued-run-main">
            <div class="queued-run-title">Wave ${escapeQueuedRunHtml(waveReached || '--')} · ${escapeQueuedRunHtml(result)}</div>
            <div class="queued-run-meta">
              <span class="queued-run-pill">Recorded ${escapeQueuedRunHtml(formatQueuedRunDate(created))}</span>
              <span class="queued-run-pill">Completed ${escapeQueuedRunHtml(formatQueuedRunDate(completed))}</span>
              <span class="queued-run-pill">${escapeQueuedRunHtml(status)}</span>
              <span class="queued-run-pill">Attempts ${escapeQueuedRunHtml(attempts)}</span>
            </div>
            ${error}
          </div>
          <div class="queued-run-actions">
            <button type="button" class="queued-run-submit" data-submit-queued-run="${escapeQueuedRunHtml(item.queueId)}">Submit</button>
          </div>
        </div>`;
    }).join('') : '<div class="queued-runs-empty">No queued runs for this connected wallet.</div>';

    backdrop.innerHTML = `
      <div class="queued-runs-modal">
        <div class="queued-runs-header">
          <div>
            <div class="queued-runs-title">Queued Runs</div>
            <div class="queued-runs-subtitle">Runs are sorted newest first. High-value runs may ask for a fresh signature before upload.</div>
          </div>
          <button type="button" class="queued-runs-close" data-close-queued-runs aria-label="Close queued runs">×</button>
        </div>
        <div class="queued-runs-body">
          <div class="queued-runs-summary" data-queued-runs-status>${runs.length ? `${runs.length} pending run${runs.length === 1 ? '' : 's'} found.` : 'Nothing needs attention right now.'}</div>
          ${cards}
        </div>
        <div class="queued-runs-footer">
          <button type="button" class="queued-runs-action secondary" data-close-queued-runs>Close</button>
          <button type="button" class="queued-runs-action" data-retry-all-queued-runs ${runs.length ? '' : 'disabled'}>Retry All</button>
        </div>
      </div>`;
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-close-queued-runs]')) {
        closeQueuedRunsModal();
        return;
      }
      const submitBtn = event.target.closest('[data-submit-queued-run]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitSingleQueuedRun(submitBtn.getAttribute('data-submit-queued-run'), backdrop).catch((error) => {
          renderQueuedRunsModalStatus(backdrop, error && error.message ? error.message : 'Queued run submit failed.', 'bad');
          submitBtn.disabled = false;
        });
        return;
      }
      const retryBtn = event.target.closest('[data-retry-all-queued-runs]');
      if (retryBtn && !retryBtn.disabled) {
        retryBtn.disabled = true;
        retryAllQueuedRuns(backdrop).catch((error) => {
          renderQueuedRunsModalStatus(backdrop, error && error.message ? error.message : 'Retry all failed.', 'bad');
          retryBtn.disabled = false;
        });
      }
    });
    document.body.appendChild(backdrop);
    updateManageQueuedRunsButton();
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
    if (token) {
      if (isBadRunTrackingSessionToken(token)) {
        const err = new Error('Run tracking session refresh required.');
        err.code = 'session_refresh_required';
        err.status = 401;
        throw err;
      }
      headers['x-session-token'] = token;
    }
    const controller = new AbortController();
    const timeoutMs = functionName === CONFIG.submitFunction ? 20000 : 15000;
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(`${CONFIG.url}/functions/v1/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
        signal: controller.signal,
      });
    } catch (error) {
      const err = new Error(error && error.name === 'AbortError' ? `${functionName} timed out.` : (error && error.message ? error.message : 'Network request failed.'));
      err.code = error && error.name === 'AbortError' ? 'timeout' : 'fetch_failed';
      err.status = error && error.name === 'AbortError' ? 408 : 0;
      throw err;
    } finally {
      window.clearTimeout(timeout);
    }
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
    return /invalid or expired session|session lookup failed|session not found|missing authorization header|jwt|expired|unauthorized|wallet mismatch|session device mismatch|session origin mismatch|missing user agent|missing_session_token|session_lookup_failed|session_expired|session_revoked|session_device_mismatch|session_origin_mismatch/i.test(String(message || ''));
  }

  function isRetryableUploadError(error) {
    const status = Number(error && error.status || 0);
    const code = String(error && error.code || '').trim().toLowerCase();
    const message = String(error && error.message || '').trim().toLowerCase();
    if (status >= 500 || status === 408 || status === 409 || status === 425 || status === 429) return true;
    if (/networkerror|failed to fetch|load failed|network request failed|timeout|temporarily unavailable|temporarily overloaded|edge function not reachable|service unavailable/.test(message)) return true;
    if (/fetch|timeout|temporarily_unavailable|service_unavailable|rate_limit|overloaded/.test(code)) return true;
    return false;
  }

  async function waitMs(ms) {
    const delay = Math.max(0, Number(ms || 0));
    if (!delay) return;
    await new Promise((resolve) => window.setTimeout(resolve, delay));
  }

  function withTimeout(promise, ms, message = 'Operation timed out.') {
    let timer = null;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          const error = new Error(message);
          error.code = 'timeout';
          reject(error);
        }, Math.max(1000, Number(ms || 0)));
      }),
    ]).finally(() => {
      if (timer) window.clearTimeout(timer);
    });
  }

  async function submitTrackedRunWithRetry(payload, sessionToken, options = {}) {
    const maxAttempts = Math.max(1, Number(options.maxAttempts || 1));
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await callFunction(CONFIG.submitFunction, payload, sessionToken);
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !isRetryableUploadError(error)) throw error;
        await waitMs(Math.min(4000, 600 * attempt));
      }
    }
    throw lastError || new Error('Upload failed');
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
    return authenticate({ manual: !!options.manual });
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

    if (!CONFIG.url || !CONFIG.key) {
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
      if (/session not found|session revoked|session expired|session lookup failed|session refresh required|wallet mismatch|unauthorized/i.test(message)) {
        clearSession(walletAddress);
        state.session = null;
        state.summary = 'Tracked Runs: -- · Best Wave: --';
        applyStatus('Run Tracking: Disabled', 'warn');
        return true;
      }
      clearSession(walletAddress);
      state.session = null;
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      applyStatus('Run Tracking: Disabled locally', 'warn');
      return true;
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
    const manual = !!(options && options.manual);
    if (!manual && isRunTrackingAuthPaused()) {
      throw new Error('Run tracking signature paused. Click Enable Run Tracking to try again.');
    }
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
      let signature = '';
      try {
        signature = await wallet.selectedProvider.request({
          method: 'personal_sign',
          params: [message, wallet.address],
        });
      } catch (error) {
        if (isUserRejectedAuthError(error)) {
          pauseRunTrackingAuth(120000, 'Run Tracking: Signature rejected. Click Enable Run Tracking to try again.');
        }
        throw error;
      }
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
        const extractedSessionToken = extractWalletSessionToken(verifyPayload);
        if (extractedSessionToken) {
          state.sessionToken = extractedSessionToken;
          persistSessionToken(state.sessionToken);
        }
      } catch (error) {
        const errorMessage = String(error && error.message ? error.message : '');
        if (/nonce (?:already used|mismatch|expired)/i.test(errorMessage)) {
          const retryNoncePayload = await callFunction(CONFIG.nonceFunction, { address: wallet.address });
          const retryMessage = retryNoncePayload && retryNoncePayload.message
            ? String(retryNoncePayload.message)
            : buildLoginMessage(retryNoncePayload.nonce, wallet.address);
          let retrySignature = '';
          try {
            retrySignature = await wallet.selectedProvider.request({
              method: 'personal_sign',
              params: [retryMessage, wallet.address],
            });
          } catch (error) {
            if (isUserRejectedAuthError(error)) {
              pauseRunTrackingAuth(120000, 'Run Tracking: Signature rejected. Click Enable Run Tracking to try again.');
            }
            throw error;
          }
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
      const finalSessionToken = extractWalletSessionToken(verifyPayload);
      if (!finalSessionToken) {
        console.warn('[run-tracker] verify response did not contain a UUID wallet session token', verifyPayload);
        throw new Error('Run tracking session response was invalid. Redeploy verify-run-session / wallet session functions.');
      }
      const session = {
        sessionToken: finalSessionToken,
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
    const address = normalizeAddress(state.address || getTrackingAddress() || '');
    const pendingCount = address ? getPendingQueueCount(address) : 0;
    const securePendingCount = address ? getPendingSecureCount(address) : 0;
    const pendingCopy = pendingCount > 0 ? ` · Pending: ${pendingCount}${securePendingCount > 0 ? ` (Secure: ${securePendingCount})` : ''}` : '';
    state.summary = address ? `Tracked Runs: -- · Best Wave: --${pendingCopy}` : 'Tracked Runs: -- · Best Wave: --';
    render();
    if (options && options.flushPending && pendingCount > 0 && state.session && !isSessionStale(state.session)) {
      try {
        await processPendingRuns({ address, interactive: false, force: true });
      } catch (_error) {}
    }
    return null;
  }

  async function uploadQueuedRun(queueItem, options = {}) {
    if (!queueItem || !queueItem.payload) return { ok: false, queued: false, error: 'Missing queue item.' };
    const interactive = !!options.interactive;
    const walletAddress = normalizeAddress(queueItem.walletAddress || (queueItem.payload && queueItem.payload.walletAddress) || '');
    if (!walletAddress) return { ok: false, queued: true, error: 'Missing wallet address.' };
    if (!CONFIG.url || !CONFIG.key) return { ok: false, queued: true, error: 'Supabase is not configured.' };

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

    const currentSession = getUsableRunTrackingSession(restoreSession(walletAddress));
    if (currentSession) {
      state.session = currentSession;
      state.lastAuthenticatedAddress = walletAddress;
    }

    if (!getUsableRunTrackingSession(state.session) || isSessionStale(state.session)) {
      clearSession(walletAddress);
      state.session = null;
      updateQueueStatus(queueItem.queueId, 'pending_auth', {
        lastError: 'Wallet signature needed. Click Enable Run Tracking to continue.',
        nextRetryAt: null,
      });
      pauseRunTrackingAuth(120000, 'Run Tracking: Wallet signature needed. Click Enable Run Tracking to continue.');
      return { ok: false, queued: true, authRequired: true, error: 'Signature needed.' };
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
      if (!getUsableRunTrackingSession(state.session)) throw Object.assign(new Error('Run tracking session refresh required.'), { code: 'session_refresh_required' });
      const result = await submitTrackedRunWithRetry(payloadToSubmit, state.session.sessionToken, {
        maxAttempts: interactive ? 3 : 2,
      });
      markQueuedRunUploaded(queueItem.queueId);
      return { ok: true, queued: false, result };
    } catch (error) {
      const message = error && error.message ? error.message : 'Upload failed';
      if (isSessionRefreshRequiredError(error)) {
        clearRunTrackingSessionForRefresh(walletAddress);
        if (interactive) {
          try {
            await refreshRunTrackingSessionForUpload(walletAddress, { interactive: true });
            const retried = await submitTrackedRunWithRetry(normalizeQueuedRunPayload(queueItem.payload, walletAddress), state.session.sessionToken, {
              maxAttempts: 1,
            });
            markQueuedRunUploaded(queueItem.queueId);
            applyStatus('Run Tracking: Session refreshed', 'good');
            return { ok: true, queued: false, result: retried, sessionRefreshed: true };
          } catch (retryError) {
            const retryMessage = retryError && retryError.message ? retryError.message : message;
            updateQueueStatus(queueItem.queueId, 'pending_auth', {
              lastError: retryMessage,
              nextRetryAt: null,
            });
            applyStatus('Run Tracking: Wallet signature needed to refresh session', 'bad');
            return { ok: false, queued: true, authRequired: true, error: retryMessage, sessionRefreshRequired: true };
          }
        }
        updateQueueStatus(queueItem.queueId, 'pending_auth', {
          lastError: 'Run tracking session refresh required.',
          nextRetryAt: null,
        });
        pauseRunTrackingAuth(120000, 'Run Tracking: Wallet signature needed. Click Enable Run Tracking to continue.');
        return { ok: false, queued: true, authRequired: true, error: 'Run tracking session refresh required.', sessionRefreshRequired: true };
      }
      if (isAuthErrorMessage(message)) {
        clearSession(walletAddress);
        state.session = null;
        updateQueueStatus(queueItem.queueId, 'pending_auth', {
          lastError: 'Wallet signature needed. Click Enable Run Tracking to continue.',
          nextRetryAt: null,
        });
        pauseRunTrackingAuth(120000, 'Run Tracking: Wallet signature needed. Click Enable Run Tracking to continue.');
        return { ok: false, queued: true, authRequired: true, error: message };
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
              const retried = await submitTrackedRunWithRetry(retriedPayload, state.session.sessionToken, {
                maxAttempts: interactive ? 3 : 2,
              });
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
    if (!interactive && isRunTrackingAuthPaused()) return { uploaded: 0, pending: getPendingQueueCount(address), failed: 0, authPaused: true };
    if (state.queueFlushPromise && !force) return state.queueFlushPromise;

    state.queueFlushPromise = (async () => {
      const queue = getQueueForAddress(address)
        .filter((item) => item && item.status !== 'uploaded')
        .filter((item) => interactive ? true : String(item && item.status || '') !== 'pending_secure_signature')
        .filter((item) => force || !item.nextRetryAt || nowMs() >= new Date(item.nextRetryAt).getTime())
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

      let uploaded = 0;
      let failed = 0;
      for (const item of queue) {
        try {
          const result = await withTimeout(uploadQueuedRun(item, { interactive }), interactive ? 60000 : 30000, 'Pending run upload timed out.');
          if (result && result.ok) uploaded += 1;
          else if (result && !result.ok) failed += 1;
        } catch (error) {
          failed += 1;
          const message = error && error.message ? error.message : 'Pending run upload timed out.';
          updateQueueStatus(item.queueId, 'pending', {
            lastError: message,
            nextRetryAt: new Date(nowMs() + 60_000).toISOString(),
          });
        }
      }

      purgeUploadedQueueRecords(address);
      await refreshSummary();
      if (uploaded > 0) notifyTrackingDataChanged();

      const pending = getPendingQueueCount(address);
      if (pending > 0) {
        const statusText = buildStatusText();
        applyStatus(failed > 0 ? `${statusText} · Retry paused` : statusText, /pending secure submission/i.test(statusText) ? 'bad' : 'warn');
      } else if (state.address) {
        applyStatus(buildStatusText(), isTrackingEnabled() ? 'good' : 'warn');
      }

      return { uploaded, pending, failed };
    })();

    try {
      return await state.queueFlushPromise;
    } finally {
      state.queueFlushPromise = null;
    }
  }

  function flushPendingRunsSoon(options = {}) {
    const delayMs = Math.max(0, Number(options.delayMs || 0));
    window.setTimeout(() => {
      try {
        const address = normalizeAddress(options.address || state.address || getTrackingAddress() || '');
        if (!address) return;
        const pendingCount = getPendingQueueCount(address);
        if (pendingCount <= 0) return;
        const currentSession = restoreSession(address);
        if (!currentSession || isSessionStale(currentSession)) return;
        if (isRunTrackingAuthPaused()) return;
        state.session = currentSession;
        state.lastAuthenticatedAddress = address;
        processPendingRuns({ address, interactive: !!options.interactive, force: !!options.force }).catch(() => {});
      } catch (_error) {}
    }, delayMs);
  }

  function scheduleQueueFlush() {
    if (state.queueFlushTimer) {
      clearInterval(state.queueFlushTimer);
      state.queueFlushTimer = null;
    }
    state.queueFlushTimer = window.setInterval(() => {
      try {
        if (document.hidden) return;
        flushPendingRunsSoon({ delayMs: 0, interactive: false });
      } catch (_error) {}
    }, 10000);
  }

  async function submitCompletedRun(runPayload, options = {}) {
    let walletAddress = '';
    let payload = null;
    try {
      const wallet = getWalletState();
      walletAddress = wallet && wallet.address ? wallet.address : getTrackingAddress();
      if (!walletAddress) return { ok: false, queued: false, error: 'Missing wallet address.' };
      if (wallet && wallet.address) {
        state.address = wallet.address;
        state.profileName = wallet.profileName || null;
      }
      payload = {
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

      if (!CONFIG.url || !CONFIG.key) {
        applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
        return { ok: false, queued: true, localOnly: true, queueId: queueItem.queueId };
      }

      const secureRequired = requiresSecureSubmission(payload);
      if (!getUsableRunTrackingSession(state.session) || isSessionStale(state.session)) {
        if (options && options.interactive) {
          try {
            await authenticate({ manual: true, forceRefresh: true });
          } catch (authError) {
            const authMessage = authError && authError.message ? authError.message : 'Wallet signature needed. Click Enable Run Tracking to upload.';
            updateQueueStatus(queueItem.queueId, 'pending_auth', {
              lastError: authMessage,
              nextRetryAt: null,
            });
            applyStatus('Run Tracking: Wallet signature needed to submit this run', 'bad');
            return { ok: false, queued: true, authRequired: true, queueId: queueItem.queueId, error: authMessage };
          }
        }
        if (!getUsableRunTrackingSession(state.session) || isSessionStale(state.session)) {
          updateQueueStatus(queueItem.queueId, 'pending_auth', {
            lastError: 'Wallet signature needed. Click Enable Run Tracking to upload.',
            nextRetryAt: null,
          });
          applyStatus('Run Tracking: Saved locally. Click Enable Run Tracking to upload.', 'warn');
          return { ok: false, queued: true, authRequired: true, queueId: queueItem.queueId };
        }
      }
      applyStatus(secureRequired ? 'Run Tracking: High-value run secure submit opened' : 'Run Tracking: Saving run…', 'warn');
      const result = await uploadQueuedRun(queueItem, { interactive: !!(options && options.interactive) });
      await refreshSummary().catch(() => null);

      if (result && result.ok) {
        notifyTrackingDataChanged();
        applyStatus('Run Tracking: Ready', 'good');
        return { ...result, queueId: queueItem.queueId };
      }

      if (result && result.queued) flushPendingRunsSoon({ address: walletAddress, delayMs: 2500, interactive: false, force: true });
      if (result && result.secureSignatureRequired) {
        applyStatus('Run Tracking: High-value run pending secure submission', 'bad');
      } else {
        applyStatus('Run Tracking: Saved locally, upload pending', 'warn');
      }
      return { ...(result || { ok: false, queued: true, error: 'Upload pending.' }), queueId: queueItem.queueId };
    } catch (error) {
      const message = error && error.message ? error.message : 'Run submission failed.';
      flushPendingRunsSoon({ address: payload && payload.walletAddress ? payload.walletAddress : walletAddress, delayMs: 2500, interactive: false, force: true });
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
    if (!CONFIG.url || !CONFIG.key) {
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
    if (!CONFIG.url || !CONFIG.key) {
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
        await ensureAuthenticatedSession({ forceRefresh: true, manual: true });
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
    ui.manageQueuedRunsBtn = qs('manageQueuedRunsBtn');
    ui.vanitySection = qs('walletVanitySection');
    ui.vanityInput = qs('walletVanityInput');
    ui.vanityStatus = qs('walletVanityStatus');
    ui.saveVanityBtn = qs('saveVanityBtn');
    if (ui.manageQueuedRunsBtn) {
      ui.manageQueuedRunsBtn.addEventListener('click', () => {
        openQueuedRunsModal();
      });
    }
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
          state.authPausedUntil = 0;
          await authenticate({ manual: true, forceRefresh: true });
          if (enablingDuringActiveUntrackedGame) await restartGameForTrackingIfNeeded();
          try { await processPendingRuns({ address: state.address || getTrackingAddress(), interactive: false, force: true }); } catch (_error) {}
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
    enforceRunTrackingSessionVersion();
    if (state.initialized) return;
    state.initialized = true;
    bindUi();
    scheduleQueueFlush();
    state.client = null; // Avoid direct browser REST calls; run tracking uses Edge Functions only.
    window.addEventListener('dfk-defense:wallet-state', (event) => {
      handleWalletState(event.detail).catch((error) => applyStatus(`Run Tracking: ${error.message || 'Failed'}`, 'bad'));
    });
    window.addEventListener('online', () => flushPendingRunsSoon({ delayMs: 250, interactive: false, force: true }));
    window.addEventListener('focus', () => flushPendingRunsSoon({ delayMs: 250, interactive: false, force: true }));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) flushPendingRunsSoon({ delayMs: 250, interactive: false, force: true });
    });
    window.addEventListener('pageshow', () => flushPendingRunsSoon({ delayMs: 250, interactive: false, force: true }));
    const wallet = getWalletState();
    await handleWalletState(wallet || null);
  }

  window.DFKRunTracker = {
    init,
    authenticate,
    reauthenticate: () => authenticate({ forceRefresh: true, manual: true }),
    debugSession,
    disableTracking,
    refreshSummary,
    flushPendingRuns: (options = {}) => processPendingRuns(options),
    submitCompletedRun,
    submitCompletedRunKeepalive,
    requiresSecureSubmission,
    processPendingRuns,
    isTrackingEnabled,
    shouldWarnBeforeEnable,
    getTrackingAddress,
    getState: () => ({ ...state }),
    getQueuedRuns: (address = '') => getQueuedRunsForPlayer(address || state.address || getTrackingAddress()),
    openQueuedRunsModal,
    clearWalletQueueState,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
