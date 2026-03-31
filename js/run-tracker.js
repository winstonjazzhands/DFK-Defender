(() => {
  'use strict';

  const CONFIG = Object.freeze({
    url: window.DFK_SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '',
    key: window.DFK_SUPABASE_PUBLISHABLE_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '',
    nonceFunction: window.DFK_SUPABASE_NONCE_FUNCTION || 'wallet-auth-nonce',
    verifyFunction: window.DFK_SUPABASE_VERIFY_FUNCTION || 'wallet-auth-verify',
    submitFunction: window.DFK_SUPABASE_SUBMIT_RUN_FUNCTION || 'submit-run',
    revokeFunction: window.DFK_SUPABASE_REVOKE_RUN_SESSION_FUNCTION || 'revoke-run-session',
    sessionHours: Number(window.DFK_SUPABASE_SESSION_HOURS || 168),
  });

  const SESSION_TOKEN_STORAGE_KEY = 'dfk_wallet_session_token';

  function persistSessionToken(token) {
    if (!token) return;
    try { sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token); } catch (_error) {}
    try { localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token); } catch (_error) {}
  }

  function getPersistedSessionToken() {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
        || localStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
        || null;
    } catch (_error) {
      return null;
    }
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
  };

  const ui = {};

  function qs(id) { return document.getElementById(id); }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }
  function setText(el, text) { if (el) el.textContent = text; }

  function sessionStorageKey(address) {
    return `dfkRunTrackerSession:${normalizeAddress(address)}`;
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
      ui.enableBtn.disabled = !state.address || !state.client;
      ui.enableBtn.textContent = state.session ? 'Disable Run Tracking' : 'Enable Run Tracking';
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

  function restoreSession(address) {
    if (!address) return null;
    try {
      const raw = localStorage.getItem(sessionStorageKey(address));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.sessionToken || !parsed.expiresAt) return null;
      if (Date.now() >= new Date(parsed.expiresAt).getTime()) {
        localStorage.removeItem(sessionStorageKey(address));
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function persistSession(address, session) {
    if (!address) return;
    try {
      localStorage.setItem(sessionStorageKey(address), JSON.stringify(session));
    } catch (error) {
      // ignore storage failures
    }
  }

  function clearSession(address) {
    if (!address) return;
    try {
      localStorage.removeItem(sessionStorageKey(address));
    } catch (error) {
      // ignore storage failures
    }
  }

  async function callFunction(functionName, payload, token) {
    const headers = {
      'Content-Type': 'application/json',
      apikey: CONFIG.key,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${CONFIG.url}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {}),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const message = json && (json.error || json.message) ? (json.error || json.message) : `Request failed: ${response.status}`;
      if (!token && /authorization header/i.test(String(message || ''))) {
        throw new Error('Missing authorization header. Redeploy the Supabase functions with --no-verify-jwt.');
      }
      throw new Error(message);
    }
    return json;
  }

  function isAuthErrorMessage(message) {
    return /invalid or expired session|session not found|missing authorization header|jwt|expired/i.test(String(message || ''));
  }

  async function ensureAuthenticatedSession(options = {}) {
    const forceRefresh = !!options.forceRefresh;
    const wallet = getWalletState();
    if (!wallet || !wallet.address || !wallet.selectedProvider) {
      throw new Error('Connect your wallet first.');
    }
    state.address = wallet.address;
    state.profileName = wallet.profileName || state.profileName || null;
    if (forceRefresh) {
      clearSession(wallet.address);
      state.session = null;
    }
    if (state.session && !forceRefresh) {
      return state.session;
    }
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
      applyStatus(`Run Tracking: ${error.message || 'Disable failed'}`, 'bad');
      return false;
    }
  }

  function getTrackingAddress() {
    return state.address || state.lastAuthenticatedAddress || null;
  }

  function isTrackingEnabled() {
    return Boolean(state.session && state.session.sessionToken && getTrackingAddress());
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

  async function authenticate() {
    if (state.authPromise) return state.authPromise;

    state.authPromise = (async () => {
      const wallet = getWalletState();
      if (!wallet || !wallet.address || !wallet.selectedProvider) {
        throw new Error('Connect your wallet first.');
      }
      state.address = wallet.address;
      const restored = restoreSession(wallet.address);
      if (restored) {
        state.session = restored;
        state.lastAuthenticatedAddress = normalizeAddress(wallet.address);
        applyStatus('Run Tracking: Ready', 'good');
        await refreshSummary();
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
        if (verifyPayload && verifyPayload.displayName) {
          state.profileName = String(verifyPayload.displayName);
        }
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
      };
      state.session = session;
      state.lastAuthenticatedAddress = normalizeAddress(wallet.address);
      persistSession(wallet.address, session);
      applyStatus('Run Tracking: Ready', 'good');
      await refreshSummary();
      return session;
    })();

    try {
      return await state.authPromise;
    } finally {
      state.authPromise = null;
    }
  }

  async function refreshSummary() {
    if (!state.client || !state.address) {
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      render();
      return null;
    }
    const address = normalizeAddress(state.address);
    const { data, error } = await state.client
      .from('players')
      .select('wallet_address,display_name,vanity_name,best_wave,total_runs,last_run_at')
      .eq('wallet_address', address)
      .maybeSingle();
    if (error) {
      state.summary = 'Tracked Runs: -- · Best Wave: --';
      render();
      return null;
    }
    if (!data) {
      state.summary = 'Tracked Runs: 0 · Best Wave: 0';
      render();
      return null;
    }
    state.vanityName = data.vanity_name || null;
    const runs = Number(data.total_runs || 0);
    const bestWave = Number(data.best_wave || 0);
    state.summary = `Tracked Runs: ${runs} · Best Wave: ${bestWave}`;
    render();
    return data;
  }

  async function submitCompletedRun(runPayload) {
    const wallet = getWalletState();
    const walletAddress = wallet && wallet.address ? wallet.address : getTrackingAddress();
    if (!walletAddress) return null;
    if (wallet && wallet.address) {
      state.address = wallet.address;
      state.profileName = wallet.profileName || null;
    }
    if (!state.client) {
      throw new Error('Supabase is not configured.');
    }
    if (!state.session) {
      const restored = restoreSession(walletAddress);
      if (restored) {
        state.session = restored;
        state.lastAuthenticatedAddress = normalizeAddress(walletAddress);
      }
    }
    if (!state.session) await authenticate();
    applyStatus('Run Tracking: Saving run…', 'warn');
    const payload = {
      ...runPayload,
      displayName: wallet && wallet.profileName ? wallet.profileName : (state.profileName || null),
      walletAddress,
    };
    try {
      const result = await callFunction(CONFIG.submitFunction, payload, state.session.sessionToken);
      applyStatus('Run Tracking: Ready', 'good');
      await refreshSummary();
      return result;
    } catch (error) {
      if (!isAuthErrorMessage(error && error.message ? error.message : error)) {
        throw error;
      }
      await ensureAuthenticatedSession({ forceRefresh: true });
      const result = await callFunction(CONFIG.submitFunction, payload, state.session.sessionToken);
      applyStatus('Run Tracking: Ready', 'good');
      await refreshSummary();
      return result;
    }
  }

  function submitCompletedRunKeepalive(runPayload) {
    const wallet = getWalletState();
    const walletAddress = wallet && wallet.address ? wallet.address : getTrackingAddress();
    if (!walletAddress || !state.session || !state.session.sessionToken || !CONFIG.url) return false;
    const payload = {
      ...runPayload,
      displayName: wallet && wallet.profileName ? wallet.profileName : (state.profileName || null),
      walletAddress,
    };
    try {
      fetch(`${CONFIG.url}/functions/v1/${CONFIG.submitFunction}`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.key,
          Authorization: `Bearer ${state.session.sessionToken}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
      return true;
    } catch (error) {
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
    if (state.session) {
      applyStatus('Run Tracking: Ready', 'good');
    } else {
      applyStatus('Run Tracking: Signature needed', 'warn');
    }
    await refreshSummary();
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
        if (!isAuthErrorMessage(error && error.message ? error.message : error)) {
          throw error;
        }
        await ensureAuthenticatedSession({ forceRefresh: true });
        result = await callFunction('set-vanity-name', { vanityName }, state.session && state.session.sessionToken ? state.session.sessionToken : '');
      }
      state.vanityName = result && Object.prototype.hasOwnProperty.call(result, 'vanityName') ? (result.vanityName || null) : vanityName;
      await refreshSummary();
      applyStatus(vanityName ? 'Run Tracking: Vanity name saved' : 'Run Tracking: Vanity name cleared', 'good');
      if (window.DFKDefenseWallet && typeof window.DFKDefenseWallet.setVanityName === 'function') {
        window.DFKDefenseWallet.setVanityName(vanityName);
      }
      if (window.DFKLeaderboardRows) {
        window.DFKLeaderboardRows = [];
      }
      window.dispatchEvent(new CustomEvent('dfk:leaderboard-refresh-requested'));
    } finally {
      render();
    }
  }

  function bindUi() {
    ui.status = qs('walletTrackingStatus');
    ui.summary = qs('walletTrackingSummary');
    ui.enableBtn = qs('enableTrackingBtn');
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
        if (state.session) {
          ui.enableBtn.disabled = true;
          try {
            await disableTracking();
          } finally {
            render();
          }
          return;
        }

        const enablingDuringActiveUntrackedGame = hasMeaningfulUntrackedGameInProgress();
        const confirmMessage = enablingDuringActiveUntrackedGame
          ? 'This will cancel the current game and start a new one with run tracking enabled. Continue?'
          : 'If the player enables tracking, runs will be tracked until they disable it. Leaving in the middle of a game will end the run and the score will appear at whatever wave the player was at.';
        const shouldEnable = window.confirm(confirmMessage);
        if (!shouldEnable) return;

        ui.enableBtn.disabled = true;
        try {
          await authenticate();
          if (enablingDuringActiveUntrackedGame) {
            await restartGameForTrackingIfNeeded();
          }
          applyStatus('Run Tracking: Ready', 'good');
        } catch (error) {
          applyStatus(`Run Tracking: ${error.message || 'Failed'}`, 'bad');
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
    disableTracking,
    refreshSummary,
    submitCompletedRun,
    submitCompletedRunKeepalive,
    isTrackingEnabled,
    shouldWarnBeforeEnable,
    getTrackingAddress,
    getState: () => ({ ...state }),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
