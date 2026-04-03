(() => {
  'use strict';

  const BUILD_VERSION = 'v10.2.2';

  const CONFIG = Object.freeze({
    chainId: Number(window.DFK_AVAX_CHAIN_ID || 43114),
    chainHex: window.DFK_AVAX_CHAIN_HEX || '0xa86a',
    chainName: window.DFK_AVAX_CHAIN_NAME || 'Avalanche C-Chain',
    rpcUrl: window.DFK_AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    explorerBase: window.DFK_AVAX_EXPLORER_URL || 'https://snowtrace.io',
    supabaseUrl: window.DFK_SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '',
    supabaseAnonKey: window.DFK_SUPABASE_PUBLISHABLE_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '',
    createSessionFunction: window.DFK_SUPABASE_CREATE_AVAX_SESSION_FUNCTION || 'create-avax-session',
    verifyPaymentFunction: window.DFK_SUPABASE_VERIFY_AVAX_PAYMENT_FUNCTION || 'verify-avax-payment',
    runBalanceFunction: window.DFK_SUPABASE_AVAX_RUN_BALANCE_FUNCTION || 'avax-run-balance',
    consumeRunFunction: window.DFK_SUPABASE_AVAX_CONSUME_RUN_FUNCTION || 'avax-consume-run',
    treasurySummaryFunction: window.DFK_SUPABASE_AVAX_TREASURY_SUMMARY_FUNCTION || 'avax-treasury-summary',
    treasuryAddress: window.DFK_AVAX_TREASURY_ADDRESS || '0x971bDACd04EF40141ddb6bA175d4f76665103c81',
    runPriceWei: String(window.DFK_AVAX_RUN_PRICE_WEI || '2000000000000000'),
    bundleGames: Number(window.DFK_AVAX_BUNDLE_GAMES || 100),
    freeWeb3Runs: window.DFK_AVAX_FREE_WEB3_RUNS !== false,
    dailyFreeGames: Number(window.DFK_AVAX_DAILY_FREE_GAMES || 5),
    powerUps: Object.freeze({
      gold_crate: { label: '3,000 Gold', wei: String(window.DFK_AVAX_GOLD_CRATE_PRICE_WEI || '1000000000000000'), buttonId: 'buyGoldBoostBtn' },
      portal_patch: { label: 'Portal Patch', wei: String(window.DFK_AVAX_PORTAL_PATCH_PRICE_WEI || '400000000000000'), buttonId: 'buyPortalPatchBtn' },
    }),
  });

  const BALANCE_CACHE_KEY = 'dfk_avax_run_balance_cache';

  const state = {
    activeRunPayment: null,
    lastWallet: null,
    balance: null,
    initialized: false,
    purchaseBundlePending: false,
    balanceLoadError: '',
    treasurySummary: null,
  };
  const ui = {};

  function qs(id) { return document.getElementById(id); }
  function setText(el, value) { if (el) el.textContent = value; }
  function setStatus(text, cls = 'warn') {
    if (!ui.status) return;
    ui.status.textContent = text;
    ui.status.className = `wallet-tracking-status wallet-${cls}`;
  }
  function shortHash(hash) {
    const value = String(hash || '');
    return value ? `${value.slice(0, 10)}…${value.slice(-6)}` : '--';
  }
  function formatAvaxFromWei(wei) {
    try {
      const value = BigInt(String(wei || '0'));
      const whole = value / 1000000000000000000n;
      const frac = (value % 1000000000000000000n).toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
      return `${whole}${frac ? '.' + frac : ''} AVAX`;
    } catch (_error) {
      return '--';
    }
  }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }

  function isTreasuryWallet(address) {
    return !!normalizeAddress(address) && normalizeAddress(address) === normalizeAddress(CONFIG.treasuryAddress);
  }

  function formatShortAvaxFromWei(wei) {
    const full = formatAvaxFromWei(wei);
    return full === '--' ? '--' : full.replace(/\s+AVAX$/, '');
  }

  function updateTreasuryUi() {
    const panel = qs('avaxTreasuryPanel');
    const totalEl = qs('avaxTreasuryTotal');
    const todayEl = qs('avaxTreasuryToday');
    const breakdownEl = qs('avaxTreasuryBreakdown');
    const countEl = qs('avaxTreasuryTxCount');
    const statusEl = qs('avaxTreasuryStatus');
    const wallet = getWallet();
    const visible = !!(wallet && wallet.address && isTreasuryWallet(wallet.address));
    if (panel) {
      panel.classList.toggle('hidden', !visible);
      panel.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
    if (!visible) return;
    if (statusEl) statusEl.textContent = 'Private';
    if (!state.treasurySummary) {
      if (totalEl) totalEl.textContent = 'Treasury Earned: Loading…';
      if (todayEl) todayEl.textContent = 'Today: --';
      if (breakdownEl) breakdownEl.textContent = 'Bundles: -- · Gold swaps: -- · Hero hires: --';
      if (countEl) countEl.textContent = 'Confirmed payments: --';
      return;
    }
    const s = state.treasurySummary;
    if (totalEl) totalEl.textContent = `Treasury Earned: ${formatAvaxFromWei(s.totalConfirmedWei || '0')}`;
    if (todayEl) todayEl.textContent = `Today: ${formatAvaxFromWei(s.todayConfirmedWei || '0')}`;
    if (breakdownEl) breakdownEl.textContent = `Bundles: ${formatShortAvaxFromWei(s.entryFeeWei || '0')} · Gold swaps: ${formatShortAvaxFromWei(s.goldSwapWei || '0')} · Hero hires: ${formatShortAvaxFromWei(s.heroHireWei || '0')}`;
    if (countEl) countEl.textContent = `Confirmed payments: ${Number(s.confirmedCount || 0)} · Gold swaps: ${Number(s.goldSwapCount || 0)} · Hero hires: ${Number(s.heroHireCount || 0)}`;
  }

  function loadCachedBalance() {
    try {
      const raw = localStorage.getItem(BALANCE_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        freeGamesRemaining: Number(parsed.freeGamesRemaining || 0),
        paidGamesRemaining: Number(parsed.paidGamesRemaining || 0),
        totalGamesRemaining: Number(parsed.totalGamesRemaining || 0),
        nextFreeResetAt: parsed.nextFreeResetAt || null,
        freeGamesLastReset: parsed.freeGamesLastReset || null,
        schemaWarning: parsed.schemaWarning || null,
        isEstimated: !!parsed.isEstimated,
      };
    } catch (_error) {
      return null;
    }
  }

  function saveCachedBalance(balance) {
    try {
      if (!balance) {
        localStorage.removeItem(BALANCE_CACHE_KEY);
        return;
      }
      localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(balance));
    } catch (_error) {}
  }

  function setBalance(balance, { persist = true } = {}) {
    state.balance = balance ? { ...balance } : null;
    if (persist) saveCachedBalance(state.balance);
  }

  function buildEstimatedBalance() {
    const fallbackFree = CONFIG.dailyFreeGames;
    return {
      freeGamesRemaining: fallbackFree,
      paidGamesRemaining: 0,
      totalGamesRemaining: fallbackFree,
      nextFreeResetAt: null,
      freeGamesLastReset: null,
      schemaWarning: null,
      isEstimated: true,
    };
  }
  function isTrackingEnabled() {
    return !!(window.DFKRunTracker && typeof window.DFKRunTracker.isTrackingEnabled === 'function' && window.DFKRunTracker.isTrackingEnabled());
  }

  function isFreeWeb3RunsMode() {
    return !!CONFIG.freeWeb3Runs;
  }
  function formatNextResetLabel(iso) {
    const value = String(iso || '');
    return value ? `Next free reset: ${value.slice(0, 16).replace('T', ' ')} UTC` : 'Next free reset: 00:00 UTC';
  }
  function balanceText() {
    if (!state.lastWallet) return `Games: Free ${CONFIG.dailyFreeGames} daily · Paid connect to track`;
    if (!isTrackingEnabled()) return `Games: Free ${CONFIG.dailyFreeGames} daily · Paid enable tracking to load`;
    if (!state.balance) return `Games: Free ${CONFIG.dailyFreeGames} est. · Paid 0 est.`;
    const estimateSuffix = state.balance.isEstimated ? ' est.' : '';
    return `Games: Free ${state.balance.freeGamesRemaining}${estimateSuffix} · Paid ${state.balance.paidGamesRemaining}${estimateSuffix}`;
  }
  function balanceMarkup() {
    let freeGames = CONFIG.dailyFreeGames;
    let paidGames = 0;
    if (state.balance) {
      freeGames = state.balance.freeGamesRemaining;
      paidGames = state.balance.paidGamesRemaining;
    }
    return `<div class="wallet-tracking-summary avax-games-line"><div class="games-label">Games:</div><div class="games-free">Free ${freeGames}</div><div class="games-paid">Paid ${paidGames}</div></div>`;
  }
  function getWallet() {
    return window.DFKDefenseWallet && typeof window.DFKDefenseWallet.getState === 'function'
      ? window.DFKDefenseWallet.getState()
      : null;
  }
  function isNetworkLikeError(message) {
    const msg = String(message || '').toLowerCase();
    return msg.includes('failed to fetch') || msg.includes('load failed') || msg.includes('networkerror') || msg.includes('cors') || msg.includes('preflight');
  }

  function enhanceFunctionError(name, error) {
    const message = String(error && error.message ? error.message : error || `${name} failed.`).trim();
    if (isNetworkLikeError(message)) {
      return new Error(`${name} is unreachable. Deploy the AVAX Supabase functions and allow this site origin in Edge Function CORS settings.`);
    }
    if (/relation .*does not exist|column .*does not exist|players table is missing|crypto_payment_sessions/i.test(message)) {
      return new Error(`${name} is live, but the AVAX payment schema is not fully applied yet. Run the 20260403 AVAX migration, then redeploy the AVAX functions.`);
    }
    return error instanceof Error ? error : new Error(message);
  }

  async function callFunction(name, payload) {
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) throw new Error('Supabase config missing.');

    const trackerState =
      window.DFKRunTracker && typeof window.DFKRunTracker.getState === 'function'
        ? window.DFKRunTracker.getState()
        : null;

    const sessionToken =
      (trackerState && trackerState.session && trackerState.session.sessionToken) ||
      '';

    const headers = {
      'Content-Type': 'application/json',
      apikey: CONFIG.supabaseAnonKey,
    };

    if (sessionToken) {
      headers['x-session-token'] = String(sessionToken);
    }

    let response;
    try {
      response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {}),
      });
    } catch (error) {
      throw enhanceFunctionError(name, error);
    }

    const raw = await response.text().catch(() => '');
    let json = {};
    try {
      json = raw ? JSON.parse(raw) : {};
    } catch {
      json = { error: raw || `${name} failed.` };
    }

    if (!response.ok) throw enhanceFunctionError(name, new Error(json && json.error ? json.error : `${name} failed.`));
    return json;
  }

  function render() {
    const wallet = getWallet();
    if (!state.lastWallet && wallet && wallet.address) {
      state.lastWallet = normalizeAddress(wallet.address);
    }
    const walletConnected = !!(wallet && wallet.address);
    const freeWeb3Mode = walletConnected && isFreeWeb3RunsMode();
    if (ui.panel) {
      const panelDisabled = !walletConnected || freeWeb3Mode;
      ui.panel.classList.toggle('wallet-disabled', panelDisabled);
      ui.panel.setAttribute('aria-disabled', panelDisabled ? 'true' : 'false');
      ui.panel.style.opacity = panelDisabled ? '0.38' : '';
      ui.panel.style.filter = panelDisabled ? 'grayscale(1) saturate(0.12)' : '';
    }
    if (ui.panelToggle) {
      ui.panelToggle.disabled = !walletConnected;
      ui.panelToggle.setAttribute('aria-disabled', walletConnected ? 'false' : 'true');
      ui.panelToggle.title = !walletConnected ? 'Connect wallet first.' : (freeWeb3Mode ? 'AVAX Rails are disabled while web3 tracked games are free.' : 'AVAX Rails');
    }
    if (ui.runPrice) ui.runPrice.textContent = `${CONFIG.bundleGames} games · ${formatAvaxFromWei(CONFIG.runPriceWei)}`;
    if (ui.runBalance) {
      ui.runBalance.innerHTML = balanceMarkup();
      ui.runBalance.setAttribute('aria-label', balanceText());
    }
    updateTreasuryUi();
    if (!CONFIG.treasuryAddress) {
      setStatus('AVAX Rails: Set DFK_AVAX_TREASURY_ADDRESS', 'warn');
      setText(ui.summary, 'Bundle purchase is available after treasury config');
    } else if (!state.lastWallet) {
      setStatus('AVAX Rails: Connect wallet', 'warn');
      setText(ui.summary, `Includes ${CONFIG.dailyFreeGames} free games daily · resets at 00:00 UTC`);
    } else if (isFreeWeb3RunsMode()) {
      setStatus('AVAX Rails: Web3 games are free right now', 'warn');
      setText(ui.summary, 'AVAX Rails are temporarily disabled while tracked web3 games are free.');
    } else if (!isTrackingEnabled()) {
      setStatus('AVAX Rails: Enable run tracking', 'warn');
      setText(ui.summary, 'Enable tracking to load paid games.');
    } else if (state.activeRunPayment && state.activeRunPayment.clientRunId) {
      setStatus('AVAX Rails: Run access ready', 'good');
      const accessLabel = state.activeRunPayment.consumedFrom === 'free' ? 'Free game used' : 'Paid game used';
      setText(ui.summary, `${accessLabel} · ${formatNextResetLabel(state.balance && state.balance.nextFreeResetAt)}`);
    } else {
      setStatus('AVAX Rails: Ready', 'good');
      setText(ui.summary, formatNextResetLabel(state.balance && state.balance.nextFreeResetAt));
    }
    const bundleBtn = qs('buyRunBundleBtn');
    if (bundleBtn) {
      const walletReady = !!(state.lastWallet || (wallet && wallet.address));
      const disabled = state.purchaseBundlePending || !walletReady || !CONFIG.treasuryAddress || isFreeWeb3RunsMode();
      bundleBtn.disabled = disabled;
      bundleBtn.textContent = state.purchaseBundlePending
        ? 'Buying Bundle…'
        : `Buy ${CONFIG.bundleGames} Games · ${formatAvaxFromWei(CONFIG.runPriceWei)}`;
      bundleBtn.title = state.purchaseBundlePending
        ? 'Bundle purchase in progress.'
        : (isFreeWeb3RunsMode() ? 'Web3 tracked games are free right now.' : (bundleBtn.disabled ? 'Connect wallet first.' : (!isTrackingEnabled() ? 'Enable tracking first to credit purchased games.' : `Buy ${CONFIG.bundleGames} paid games`)));
      bundleBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
      bundleBtn.dataset.pending = state.purchaseBundlePending ? 'true' : 'false';
    }
    Object.values(CONFIG.powerUps).forEach((item) => {
      const btn = qs(item.buttonId);
      if (!btn) return;
      btn.disabled = !state.activeRunPayment || !state.lastWallet || !isTrackingEnabled() || !CONFIG.treasuryAddress;
      btn.textContent = `${item.label} · ${formatAvaxFromWei(item.wei)}`;
    });
  }

  async function sendWalletPayment({ amountWei }) {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !wallet.selectedProvider) throw new Error('Connect wallet first.');
    if (!CONFIG.treasuryAddress) throw new Error('Treasury address is not configured.');
    const txHash = await wallet.selectedProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: wallet.address,
        to: CONFIG.treasuryAddress,
        value: '0x' + BigInt(String(amountWei || '0')).toString(16),
      }],
    });
    return { txHash, walletAddress: wallet.address };
  }


  async function refreshTreasurySummary() {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) {
      state.treasurySummary = null;
      updateTreasuryUi();
      return null;
    }
    const summary = await callFunction(CONFIG.treasurySummaryFunction, { walletAddress: wallet.address });
    state.treasurySummary = summary || null;
    updateTreasuryUi();
    return state.treasurySummary;
  }

  async function purchaseCustom({ clientRunId, kind, amountWei, label, metadata = {} }) {
    const wallet = getWallet();
    if (!wallet || !wallet.address) throw new Error('Connect wallet first.');
    if (!CONFIG.treasuryAddress) throw new Error('Treasury address is not configured.');
    const resolvedRunId = clientRunId || ((window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const session = await callFunction(CONFIG.createSessionFunction, {
      walletAddress: wallet.address,
      clientRunId: resolvedRunId,
      kind,
      expectedAmountWei: String(amountWei || '0'),
      chainId: CONFIG.chainId,
      metadata,
    });
    setStatus(`AVAX Rails: Paying for ${label || kind}…`, 'warn');
    const payment = await sendWalletPayment({ amountWei: String(amountWei || '0') });
    setStatus(`AVAX Rails: Verifying ${label || kind}…`, 'warn');
    const verified = await verifyPaymentWithRetry({
      paymentSessionId: session.paymentSessionId,
      txHash: payment.txHash,
      walletAddress: payment.walletAddress,
      expectedAmountWei: String(amountWei || '0'),
      expectedTo: CONFIG.treasuryAddress,
      chainId: CONFIG.chainId,
      clientRunId: resolvedRunId,
      kind,
      metadata,
    });
    refreshTreasurySummary().catch(() => {});
    return {
      paymentSessionId: session.paymentSessionId,
      clientRunId: resolvedRunId,
      txHash: payment.txHash,
      verifiedAt: verified.verifiedAt || new Date().toISOString(),
      walletAddress: payment.walletAddress,
      kind,
      metadata,
    };
  }

  async function refreshRunBalance() {
    if (!state.lastWallet) {
      const wallet = getWallet();
      if (wallet && wallet.address) state.lastWallet = normalizeAddress(wallet.address);
    }
    if (!state.lastWallet || !isTrackingEnabled()) {
      state.balance = null;
      render();
      return null;
    }
    try {
      const balance = await callFunction(CONFIG.runBalanceFunction, {
        walletAddress: state.lastWallet,
      });
      setBalance({
        freeGamesRemaining: Number(balance.freeGamesRemaining || 0),
        paidGamesRemaining: Number(balance.paidGamesRemaining || 0),
        totalGamesRemaining: Number(balance.totalGamesRemaining || 0),
        nextFreeResetAt: balance.nextFreeResetAt || null,
        freeGamesLastReset: balance.freeGamesLastReset || null,
        schemaWarning: balance.schemaWarning || null,
        isEstimated: false,
      });
      state.balanceLoadError = '';
      if (balance.schemaWarning) {
        setStatus(`AVAX Rails: ${balance.schemaWarning}`, 'warn');
      }
      render();
      return state.balance;
    } catch (error) {
      state.balanceLoadError = error && error.message ? error.message : 'Could not load game balance';
      if (!state.balance) {
        setBalance(loadCachedBalance() || buildEstimatedBalance());
      }
      setStatus(`AVAX Rails: ${state.balanceLoadError}`, 'bad');
      render();
      throw error;
    }
  }

  async function consumeRunAccess(clientRunId) {
    const result = await callFunction(CONFIG.consumeRunFunction, {
      walletAddress: state.lastWallet,
      clientRunId,
    });
    setBalance({
      freeGamesRemaining: Number(result.freeGamesRemaining || 0),
      paidGamesRemaining: Number(result.paidGamesRemaining || 0),
      totalGamesRemaining: Number(result.totalGamesRemaining || 0),
      nextFreeResetAt: result.nextFreeResetAt || null,
      freeGamesLastReset: result.freeGamesLastReset || null,
      schemaWarning: null,
      isEstimated: false,
    });
    state.balanceLoadError = '';
    return result;
  }

  async function buyBundleForRuns({ clientRunId }) {
    const wallet = getWallet();
    if (!wallet || !wallet.address) {
      window.alert('Connect your wallet before buying run bundles.');
      return false;
    }
    const resolvedRunId = clientRunId || ((window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const session = await callFunction(CONFIG.createSessionFunction, {
      walletAddress: wallet.address,
      clientRunId: resolvedRunId,
      kind: 'entry_fee',
      expectedAmountWei: CONFIG.runPriceWei,
      chainId: CONFIG.chainId,
    });
    setStatus('AVAX Rails: Awaiting wallet confirmation…', 'warn');
    const payment = await sendWalletPayment({ amountWei: CONFIG.runPriceWei });
    setStatus('AVAX Rails: Verifying bundle purchase…', 'warn');
    const verified = await verifyPaymentWithRetry({
      paymentSessionId: session.paymentSessionId,
      txHash: payment.txHash,
      walletAddress: payment.walletAddress,
      expectedAmountWei: CONFIG.runPriceWei,
      expectedTo: CONFIG.treasuryAddress,
      chainId: CONFIG.chainId,
      clientRunId: resolvedRunId,
      kind: 'entry_fee',
    });
    await refreshRunBalance();
    return {
      clientRunId: resolvedRunId,
      paymentSessionId: session.paymentSessionId,
      txHash: payment.txHash,
      verifiedAt: verified.verifiedAt || new Date().toISOString(),
      bundleGamesGranted: Number(verified.bundleGamesGranted || CONFIG.bundleGames),
      walletAddress: payment.walletAddress,
    };
  }

  async function verifyPaymentWithRetry(payload, {
    attempts = 20,
    delayMs = 2000,
  } = {}) {
    let lastError = null;

    for (let i = 0; i < attempts; i += 1) {
      try {
        return await callFunction(CONFIG.verifyPaymentFunction, payload);
      } catch (error) {
        lastError = error;
        const msg = String(error && error.message ? error.message : error || '').toLowerCase();

        const retryable =
          msg.includes('not found') ||
          msg.includes('pending') ||
          msg.includes('not confirmed successfully yet') ||
          msg.includes('not confirmed') ||
          msg.includes('confirmation');

        if (!retryable || i === attempts - 1) {
          throw error;
        }

        setStatus(`AVAX Rails: Waiting for confirmation... (${i + 1}/${attempts})`, 'warn');
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError || new Error('Verification failed');
  }

  async function purchaseRunBundle() {
    if (state.purchaseBundlePending) {
      setStatus('AVAX Rails: Bundle purchase already in progress', 'warn');
      return false;
    }

    const wallet = getWallet();
    if (!wallet || !wallet.address) {
      setStatus('AVAX Rails: Connect wallet first', 'warn');
      window.alert('Connect your wallet before buying a run bundle.');
      return false;
    }
    if (!isTrackingEnabled()) {
      setStatus('AVAX Rails: Enable tracking first', 'warn');
      window.alert('Enable run tracking before buying a run bundle so your game balance can be credited safely.');
      return false;
    }

    state.lastWallet = normalizeAddress(wallet.address);

    if (!window.confirm(`Buy ${CONFIG.bundleGames} paid games for ${formatAvaxFromWei(CONFIG.runPriceWei)}?`)) {
      setStatus('AVAX Rails: Bundle purchase canceled', 'warn');
      return false;
    }

    state.purchaseBundlePending = true;
    render();
    setStatus('AVAX Rails: Opening wallet…', 'warn');
    try {
      await buyBundleForRuns({});
      await refreshRunBalance().catch(() => {});
      setStatus('AVAX Rails: Bundle purchased', 'good');
      return true;
    } catch (error) {
      const message = error && error.message ? error.message : 'Bundle purchase failed';
      setStatus(`AVAX Rails: ${message}`, 'bad');
      window.alert(message);
      throw error;
    } finally {
      state.purchaseBundlePending = false;
      render();
    }
  }

  function triggerPurchaseRunBundle(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    purchaseRunBundle().catch((error) => {
      const message = error && error.message ? error.message : 'Bundle purchase failed';
      setStatus(`AVAX Rails: ${message}`, 'bad');
    });
    return false;
  }

  async function ensurePaidRunAccess({ clientRunId }) {
    const wallet = getWallet();
    if (!wallet || !wallet.address) {
      return false;
    }
    if (!isTrackingEnabled()) {
      return false;
    }
    state.lastWallet = normalizeAddress(wallet.address);

    if (isFreeWeb3RunsMode()) {
      state.activeRunPayment = {
        paymentSessionId: null,
        clientRunId,
        chainId: CONFIG.chainId,
        network: 'avalanche-c-chain',
        walletAddress: state.lastWallet,
        entryFeeWei: '0',
        entryTxHash: null,
        powerUpSpendWei: '0',
        totalSpendWei: '0',
        powerUps: [],
        verifiedAt: new Date().toISOString(),
        consumedFrom: 'free-web3',
      };
      render();
      return state.activeRunPayment;
    }
    if (!CONFIG.treasuryAddress) {
      window.alert('AVAX treasury address is not configured yet.');
      return false;
    }

    try {
      await refreshRunBalance();
    } catch (error) {
      const message = error && error.message ? error.message : 'Could not load run balance.';
      setStatus(`AVAX Rails: ${message}`, 'bad');
    }
    const balance = state.balance || buildEstimatedBalance();
    const runUseType = balance.freeGamesRemaining > 0 ? 'FREE' : (balance.paidGamesRemaining > 0 ? 'PAID' : 'UNKNOWN');

    if (runUseType === 'BUY') {
      if (window.DFKGameboardPrompt && typeof window.DFKGameboardPrompt.show === 'function') {
        window.DFKGameboardPrompt.show({
          title: 'Out of free games for today',
          body: 'Out of free games for today, come back tomorrow or buy 100 games for .002 AVAX.',
          primaryText: 'Buy 100 Games',
          onPrimary: () => {
            purchaseRunBundle()
              .then((purchased) => {
                if (purchased && window.DFKGameboardPrompt && typeof window.DFKGameboardPrompt.hide === 'function') {
                  window.DFKGameboardPrompt.hide();
                }
              })
              .catch((error) => setStatus(`AVAX Rails: ${error && error.message ? error.message : 'Failed'}`, 'bad'));
          },
          secondaryText: 'Keep Playing Free',
          onSecondary: () => {
            if (window.DFKGameboardPrompt && typeof window.DFKGameboardPrompt.hide === 'function') {
              window.DFKGameboardPrompt.hide();
            }
          },
        });
      }
      return false;
    }

    let consumed;
    try {
      consumed = await consumeRunAccess(clientRunId);
    } catch (error) {
      const message = error && error.message ? error.message : 'Could not consume game.';
      if (/no games remaining/i.test(message)) {
        if (window.DFKGameboardPrompt && typeof window.DFKGameboardPrompt.show === 'function') {
          window.DFKGameboardPrompt.show({
            title: 'No games remaining',
            body: 'You are out of free and paid games. Buy 100 games for .002 AVAX or come back after the next UTC reset.',
            primaryText: 'Buy 100 Games',
            onPrimary: () => {
              purchaseRunBundle().catch((buyError) => setStatus(`AVAX Rails: ${buyError && buyError.message ? buyError.message : 'Failed'}`, 'bad'));
            },
            secondaryText: 'Cancel',
            onSecondary: () => {
              if (window.DFKGameboardPrompt && typeof window.DFKGameboardPrompt.hide === 'function') window.DFKGameboardPrompt.hide();
            },
          });
        } else {
          window.alert('No free or paid games remaining. Buy a bundle or come back after the next UTC reset.');
        }
        return false;
      }
      window.alert(`Could not spend a game credit. ${message}`);
      return false;
    }
    state.activeRunPayment = {
      paymentSessionId: null,
      clientRunId,
      chainId: CONFIG.chainId,
      network: 'avalanche-c-chain',
      walletAddress: state.lastWallet,
      entryFeeWei: '0',
      entryTxHash: null,
      powerUpSpendWei: '0',
      totalSpendWei: '0',
      powerUps: [],
      verifiedAt: new Date().toISOString(),
      consumedFrom: consumed.consumedFrom || (runUseType === 'FREE' ? 'free' : 'paid'),
    };
    render();
    return state.activeRunPayment;
  }

  async function buyPowerUp(powerUpId) {
    const item = CONFIG.powerUps[powerUpId];
    if (!item) return;
    if (!state.activeRunPayment || !state.activeRunPayment.entryTxHash) {
      window.alert('Start a paid run first.');
      return;
    }
    const wallet = getWallet();
    if (!wallet || !wallet.address) throw new Error('Connect wallet first.');
    const session = await callFunction(CONFIG.createSessionFunction, {
      walletAddress: wallet.address,
      clientRunId: state.activeRunPayment.clientRunId,
      kind: 'powerup',
      expectedAmountWei: item.wei,
      chainId: CONFIG.chainId,
      parentPaymentSessionId: state.activeRunPayment.paymentSessionId,
    });
    setStatus(`AVAX Rails: Buying ${item.label}…`, 'warn');
    const payment = await sendWalletPayment({ amountWei: item.wei });
    await verifyPaymentWithRetry({
      paymentSessionId: session.paymentSessionId,
      txHash: payment.txHash,
      walletAddress: payment.walletAddress,
      expectedAmountWei: item.wei,
      expectedTo: CONFIG.treasuryAddress,
      chainId: CONFIG.chainId,
      clientRunId: state.activeRunPayment.clientRunId,
      kind: 'powerup',
      parentPaymentSessionId: state.activeRunPayment.paymentSessionId,
    });
    const nextSpend = BigInt(state.activeRunPayment.powerUpSpendWei || '0') + BigInt(item.wei);
    state.activeRunPayment.powerUpSpendWei = nextSpend.toString();
    state.activeRunPayment.totalSpendWei = (BigInt(state.activeRunPayment.entryFeeWei || '0') + nextSpend).toString();
    state.activeRunPayment.powerUps.push({
      powerUpId,
      amountWei: item.wei,
      txHash: payment.txHash,
      paymentSessionId: session.paymentSessionId,
    });
    window.dispatchEvent(new CustomEvent('dfk-defense:crypto-powerup-granted', { detail: { powerUpId, txHash: payment.txHash } }));
    render();
  }

  function handleWalletState(detail) {
    state.lastWallet = detail && detail.address ? normalizeAddress(detail.address) : null;
    if (!state.lastWallet) {
      state.activeRunPayment = null;
      setBalance(null);
      state.balanceLoadError = '';
    } else if (state.activeRunPayment && state.activeRunPayment.walletAddress !== state.lastWallet) {
      state.activeRunPayment = null;
    }
    render();
  }

  function bindUi() {
    ui.panel = qs('bankPanel');
    ui.panelToggle = qs('bankPanelToggle');
    ui.status = qs('avaxRailStatus');
    ui.summary = qs('avaxRailSummary');
    ui.runPrice = qs('avaxRunPrice');
    ui.runBalance = qs('avaxRunBalance');
    const bundleBtn = qs('buyRunBundleBtn');
    const goldBtn = qs(CONFIG.powerUps.gold_crate.buttonId);
    const patchBtn = qs(CONFIG.powerUps.portal_patch.buttonId);
    if (bundleBtn) {
      bundleBtn.onclick = triggerPurchaseRunBundle;
    }
    if (goldBtn) goldBtn.addEventListener('click', () => buyPowerUp('gold_crate').catch((error) => { setStatus(`AVAX Rails: ${error.message || 'Failed'}`, 'bad'); }));
    if (patchBtn) patchBtn.addEventListener('click', () => buyPowerUp('portal_patch').catch((error) => { setStatus(`AVAX Rails: ${error.message || 'Failed'}`, 'bad'); }));
  }

  function getActiveRunPayment() {
    return state.activeRunPayment ? { ...state.activeRunPayment, powerUps: [...state.activeRunPayment.powerUps] } : null;
  }

  function clearActiveRunPayment(clientRunId) {
    if (!state.activeRunPayment) return;
    if (!clientRunId || state.activeRunPayment.clientRunId === clientRunId) state.activeRunPayment = null;
    render();
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindUi();
    setBalance(loadCachedBalance(), { persist: false });
    const wallet = getWallet();
    if (wallet && wallet.address) {
      handleWalletState(wallet);
      state.lastWallet = normalizeAddress(wallet.address);
    }
    window.addEventListener('dfk-defense:wallet-state', (event) => {
      handleWalletState(event.detail);
      if (!isFreeWeb3RunsMode()) refreshRunBalance().catch(() => { render(); }); else render();
      refreshTreasurySummary().catch(() => { updateTreasuryUi(); });
    });
    window.addEventListener('dfk-defense:tracking-state', () => {
      if (!isFreeWeb3RunsMode()) refreshRunBalance().catch(() => { render(); }); else render();
      refreshTreasurySummary().catch(() => { updateTreasuryUi(); });
    });
    render();
    if (!isFreeWeb3RunsMode()) refreshRunBalance().catch(() => { render(); }); else render();
    refreshTreasurySummary().catch(() => { updateTreasuryUi(); });
  }

  window.DFKCryptoRails = {
    init,
    ensurePaidRunAccess,
    purchaseRunBundle,
    triggerPurchaseRunBundle,
    getActiveRunPayment,
    clearActiveRunPayment,
    refreshRunBalance,
    purchaseCustom,
    refreshTreasurySummary,
    getTreasurySummary: () => (state.treasurySummary ? { ...state.treasurySummary } : null),
    formatAvaxFromWei,
    getRunBalance: () => (state.balance ? { ...state.balance } : null),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
