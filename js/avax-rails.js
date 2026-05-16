(() => {
  'use strict';

  const BUILD_VERSION = 'v10.4.0';

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
    rewardClaimsAdminFunction: window.DFK_SUPABASE_REWARD_CLAIMS_ADMIN_FUNCTION || 'reward-claims-admin',
    moosiferBountyFunction: window.DFK_SUPABASE_MOOSIFER_BOUNTY_FUNCTION || 'moosifer-bounty',
    treasuryAddress: window.DFK_AVAX_TREASURY_ADDRESS || '0xab45288409900be5ef23c19726a30c28268495ad',
    privateAdminWallets: (Array.isArray(window.DFK_PRIVATE_ADMIN_WALLETS) && window.DFK_PRIVATE_ADMIN_WALLETS.length
      ? window.DFK_PRIVATE_ADMIN_WALLETS
      : ['0xab45288409900be5ef23c19726a30c28268495ad', '0x971bdacd04ef40141ddb6ba175d4f76665103c81']).map((address) => String(address || '').trim().toLowerCase()).filter(Boolean),
    runPriceWei: String(window.DFK_AVAX_RUN_PRICE_WEI || '2000000000000000'),
    bundleGames: Number(window.DFK_AVAX_BUNDLE_GAMES || 100),
    freeWeb3Runs: window.DFK_AVAX_FREE_WEB3_RUNS !== false,
    dailyFreeGames: Number(window.DFK_AVAX_DAILY_FREE_GAMES || 5),
    sessionDebugFunction: window.DFK_SUPABASE_SESSION_DEBUG_FUNCTION || 'wallet-session-debug',
    powerUps: Object.freeze({
      gold_crate: { label: '2,000 Gold', wei: String(window.DFK_AVAX_GOLD_CRATE_PRICE_WEI || '1000000000000000'), buttonId: 'buyGoldBoostBtn' },
      portal_patch: { label: 'Portal Patch', wei: String(window.DFK_AVAX_PORTAL_PATCH_PRICE_WEI || '400000000000000'), buttonId: 'buyPortalPatchBtn' },
    }),
  });

  const BALANCE_CACHE_KEY = 'dfk_avax_run_balance_cache';
  const TREASURY_SUMMARY_CACHE_KEY = 'dfk_avax_treasury_summary_cache_v1';
  const REWARD_CLAIMS_CACHE_KEY = 'dfk_reward_claims_admin_cache_v1';
  const TREASURY_SUMMARY_CACHE_TTL_MS = 90 * 1000;
  const REWARD_CLAIMS_CACHE_TTL_MS = 90 * 1000;

  const state = {
    activeRunPayment: null,
    lastWallet: null,
    balance: null,
    initialized: false,
    purchaseBundlePending: false,
    balanceLoadError: '',
    treasurySummary: null,
    rewardClaims: null,
    rewardClaimsLoading: false,
    rewardClaimsError: '',
    moosiferBounty: null,
    moosiferBountyLoading: false,
    moosiferBountyError: '',
    rewardWhitelistSaving: false,
    rewardWhitelistCollapsed: true,
    rewardSpendTimeframe: 'all',
    rewardClaimsTab: 'pending',
    rewardClaimsPageByTab: { pending: 1, completed: 1, rejected: 1 },
    rewardSpendCollapsed: false,
    rewardQuestPlayerOpen: {},
    treasuryFlyoutOpen: false,
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
  function readJsonCache(key) {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(key) : '';
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }
  function writeJsonCache(key, value) {
    try {
      if (!window.localStorage || value == null) return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {}
  }
  function getTreasuryCacheWalletKey(walletAddress, suffix = '') {
    return `${normalizeAddress(walletAddress)}:${String(suffix || '').trim().toLowerCase()}`;
  }

  function isFreshCacheEntry(entry, ttlMs) {
    if (!entry || typeof entry !== 'object') return false;
    const savedAt = String(entry.savedAt || '').trim();
    const savedMs = savedAt ? new Date(savedAt).getTime() : 0;
    return Number.isFinite(savedMs) && savedMs > 0 && (Date.now() - savedMs) <= Number(ttlMs || 0);
  }

  function clearTreasuryCaches() {
    try { if (window.localStorage) window.localStorage.removeItem(TREASURY_SUMMARY_CACHE_KEY); } catch (_error) {}
    try { if (window.localStorage) window.localStorage.removeItem(REWARD_CLAIMS_CACHE_KEY); } catch (_error) {}
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isTreasuryWallet(address) {
    const normalized = normalizeAddress(address);
    return normalized === '0x971bdacd04ef40141ddb6ba175d4f76665103c81';
  }

  function formatShortAvaxFromWei(wei) {
    const full = formatAvaxFromWei(wei);
    return full === '--' ? '--' : full.replace(/\s+AVAX$/, '');
  }

  function formatJewelFromWei(wei) {
    try {
      const value = BigInt(String(wei || '0'));
      const whole = value / 1000000000000000000n;
      const frac = (value % 1000000000000000000n).toString().padStart(18, '0').slice(0, 3).replace(/0+$/, '');
      return `${whole}${frac ? '.' + frac : ''} Jewel`;
    } catch (_error) {
      return '--';
    }
  }


  function formatJewelNumberFromWei(wei) {
    return formatJewelFromWei(wei).replace(/\s+Jewel$/, '');
  }

  function formatRewardAmount(value, symbol) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return `0 ${symbol}`;
    const normalized = text.replace(/,/g, '');
    if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) return `-- ${symbol}`;
    const [wholeRaw, fracRaw = ''] = normalized.replace(/^\+/, '').split('.');
    const whole = String(BigInt(wholeRaw || '0'));
    const frac = fracRaw.slice(0, 4).replace(/0+$/, '');
    return `${whole}${frac ? '.' + frac : ''} ${symbol}`;
  }

  function shortWallet(address) {
    const value = String(address || '').trim();
    return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '--';
  }

  function parseOptionalNumber(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  function setWhitelistFormFromItem(item) {
    const walletInput = qs('rewardWhitelistWalletInput');
    const activeInput = qs('rewardWhitelistActiveInput');
    const dailyInput = qs('rewardWhitelistDailyInput');
    const bountyInput = qs('rewardWhitelistBountyInput');
    const maxClaimInput = qs('rewardWhitelistMaxClaimInput');
    const dailyCapInput = qs('rewardWhitelistDailyCapInput');
    const notesInput = qs('rewardWhitelistNotesInput');
    if (walletInput) walletInput.value = String(item && item.walletAddress || '');
    if (activeInput) activeInput.checked = !!(item && item.isActive);
    if (dailyInput) dailyInput.checked = !!(item && item.autoDaily);
    if (bountyInput) bountyInput.checked = !!(item && item.autoBounty);
    if (maxClaimInput) maxClaimInput.value = item && item.maxClaimAmount != null ? String(item.maxClaimAmount) : '';
    if (dailyCapInput) dailyCapInput.value = item && item.dailyCap != null ? String(item.dailyCap) : '';
    if (notesInput) notesInput.value = String(item && item.notes || '');
  }


function ensureTreasuryLayout() {
  const section = qs('rewardClaimsAdminSection');
  const whitelistSection = qs('rewardClaimsWhitelistSection');
  const bodyEl = qs('rewardClaimsAdminBody');
  if (!section || !whitelistSection || !bodyEl) return;
  if (bodyEl.nextElementSibling !== whitelistSection) {
    section.appendChild(whitelistSection);
  }
  let toggleBtn = qs('rewardClaimsWhitelistToggleBtn');
  if (!toggleBtn) {
    const subtitle = whitelistSection.querySelector('.reward-claims-admin-subtitle');
    if (subtitle) {
      subtitle.innerHTML = `<button type="button" class="reward-claims-rollup-btn" id="rewardClaimsWhitelistToggleBtn" aria-expanded="${state.rewardWhitelistCollapsed ? 'false' : 'true'}">Withdrawal Whitelist <span class="reward-claims-rollup-chevron">${state.rewardWhitelistCollapsed ? '▸' : '▾'}</span></button>`;
      toggleBtn = qs('rewardClaimsWhitelistToggleBtn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          state.rewardWhitelistCollapsed = !state.rewardWhitelistCollapsed;
          renderRewardClaimsAdmin();
        });
      }
    }
  }
  whitelistSection.classList.toggle('is-collapsed', !!state.rewardWhitelistCollapsed);
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', state.rewardWhitelistCollapsed ? 'false' : 'true');
    const chev = toggleBtn.querySelector('.reward-claims-rollup-chevron');
    if (chev) chev.textContent = state.rewardWhitelistCollapsed ? '▸' : '▾';
  }
}

function getRewardSpendTimeframeLabel(value) {
  if (value === 'today') return 'Today';
  if (value === 'this_week') return 'This Week';
  if (value === 'last_week') return 'Last Week';
  return 'All Time';
}


function parseRewardDecimal(value) {
  const text = String(value == null ? '' : value).replace(/,/g, '').trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? (Number(match[0]) || 0) : 0;
}

function formatRewardDecimal(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function buildQuestPlayerRows(completedItems) {
  const rows = Array.isArray(completedItems) ? completedItems : [];
  const players = new Map();
  for (const item of rows) {
    const type = String(item && (item.claimType || item.claimTypeLabel) || '').toLowerCase();
    const currency = String(item && item.rewardCurrency || '').trim().toUpperCase();
    const sourceRef = String(item && item.sourceRef || '').toLowerCase();
    if (!(type.includes('daily_quest') || type.includes('daily reward') || type.includes('quest') || sourceRef.startsWith('quest:'))) continue;
    if (currency && currency !== 'JEWEL') continue;
    const wallet = normalizeAddress(item && item.walletAddress);
    if (!wallet) continue;
    const amount = parseRewardDecimal(item && (item.amountValue != null ? item.amountValue : item.amountText));
    const day = String(item && (item.claimDay || item.paidAt || item.resolvedAt || item.requestedAt) || '').slice(0, 10) || 'Unknown day';
    const key = wallet;
    if (!players.has(key)) {
      players.set(key, {
        walletAddress: wallet,
        playerName: String(item && item.playerName || '').trim(),
        questCount: 0,
        jewelTotal: 0,
        lastActivity: '',
        days: new Map(),
      });
    }
    const player = players.get(key);
    if (!player.playerName && item && item.playerName) player.playerName = String(item.playerName || '').trim();
    player.questCount += 1;
    player.jewelTotal += amount;
    const activity = String(item && (item.paidAt || item.resolvedAt || item.approvedAt || item.requestedAt) || '').trim();
    if (activity && (!player.lastActivity || activity > player.lastActivity)) player.lastActivity = activity;
    if (!player.days.has(day)) player.days.set(day, { day, questCount: 0, jewelTotal: 0, titles: [] });
    const dayEntry = player.days.get(day);
    dayEntry.questCount += 1;
    dayEntry.jewelTotal += amount;
    const title = String(item && (item.reason || item.title || item.sourceRef) || '').trim();
    if (title && dayEntry.titles.length < 6 && !dayEntry.titles.includes(title)) dayEntry.titles.push(title);
  }
  return Array.from(players.values()).map((player) => ({
    ...player,
    days: Array.from(player.days.values()).sort((a, b) => String(b.day).localeCompare(String(a.day))),
  })).sort((a, b) => (b.questCount - a.questCount) || (b.jewelTotal - a.jewelTotal) || String(a.playerName || a.walletAddress).localeCompare(String(b.playerName || b.walletAddress)));
}

function renderQuestPlayerSummary(completedItems) {
  const players = buildQuestPlayerRows(completedItems);
  if (!players.length) return '<div class="reward-claims-admin-empty">No completed JEWEL quest claims found yet.</div>';
  return `<div class="treasury-quest-player-list">${players.map((player) => {
    const wallet = String(player.walletAddress || '').trim();
    const open = !!(state.rewardQuestPlayerOpen && state.rewardQuestPlayerOpen[wallet]);
    const label = String(player.playerName || shortWallet(wallet) || 'Unknown player').trim();
    const daysMarkup = open ? `<div class="treasury-quest-player-days">${player.days.map((day) => `
      <div class="treasury-quest-day-row">
        <div>
          <div class="treasury-quest-day-title">${escapeHtml(day.day)}</div>
          <div class="treasury-quest-day-sub">${escapeHtml(day.titles.length ? day.titles.join(' · ') : 'Quest claims')}</div>
        </div>
        <div class="reward-claim-whitelist-pill">${escapeHtml(String(day.questCount))} quest${day.questCount === 1 ? '' : 's'}</div>
        <div class="reward-claim-whitelist-pill is-on">${escapeHtml(formatRewardDecimal(day.jewelTotal))} JEWEL</div>
      </div>`).join('')}</div>` : '';
    return `<div class="treasury-quest-player-card ${open ? 'is-open' : ''}">
      <button type="button" class="treasury-quest-player-row" data-quest-player-toggle="${escapeHtml(wallet)}" aria-expanded="${open ? 'true' : 'false'}">
        <span class="treasury-quest-chevron">${open ? '▾' : '▸'}</span>
        <span class="treasury-quest-player-main">
          <span class="treasury-quest-player-name">${escapeHtml(label)}</span>
          <span class="treasury-quest-player-wallet mono" title="${escapeHtml(wallet)}">${escapeHtml(shortWallet(wallet))}</span>
        </span>
        <span class="reward-claim-whitelist-pill">${escapeHtml(String(player.questCount))} quest${player.questCount === 1 ? '' : 's'}</span>
        <span class="reward-claim-whitelist-pill is-on">${escapeHtml(formatRewardDecimal(player.jewelTotal))} JEWEL</span>
      </button>
      ${daysMarkup}
    </div>`;
  }).join('')}</div>`;
}

function renderRewardClaimsAdmin() {
  const section = qs('rewardClaimsAdminSection');
  const statusEl = qs('rewardClaimsAdminStatus');
  const bodyEl = qs('rewardClaimsAdminBody');
  const refreshBtn = qs('refreshTreasuryViewBtn');
  const headerEl = qs('rewardClaimsAdminHeader');
  const wallet = getWallet();
  const visible = !!(wallet && wallet.address && isTreasuryWallet(wallet.address));
  syncTreasuryFlyoutUi();
  ensureTreasuryLayout();
  if (section) {
    section.classList.toggle('hidden', !visible);
    section.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
  if (!visible || !bodyEl) return;
  if (headerEl) {
    headerEl.classList.toggle('is-collapsed', !!state.rewardClaimsSectionCollapsed);
    headerEl.setAttribute('aria-expanded', state.rewardClaimsSectionCollapsed ? 'false' : 'true');
  }
  bodyEl.classList.toggle('hidden', !!state.rewardClaimsSectionCollapsed);
  if (refreshBtn) refreshBtn.disabled = !!state.rewardClaimsLoading;
  if (state.rewardClaimsLoading && !state.rewardClaims) {
    if (statusEl) statusEl.textContent = 'Pending claims: Loading…';
    bodyEl.innerHTML = '<div class="reward-claims-admin-empty">Loading reward claims…</div>';
    return;
  }
  if (state.rewardClaimsError) {
    if (statusEl) statusEl.textContent = 'Pending claims: Error';
    bodyEl.innerHTML = `<div class="bounty-status-banner is-error">${state.rewardClaimsError}</div>`;
    return;
  }
  const data = state.rewardClaims || { pendingCount: 0, completedCount: 0, pendingTotalsByCurrency: {}, items: [], pendingItems: [], completedItems: [], whitelistItems: [], spendItems: [] };
  const schemaWarning = String(data.schemaWarning || '').trim();
  const allItems = Array.isArray(data.items) ? data.items : [];
  const rawPendingItems = Array.isArray(data.pendingItems) ? data.pendingItems : [];
  const rawCompletedItems = Array.isArray(data.completedItems) ? data.completedItems : [];
  const pendingItems = rawPendingItems.length ? rawPendingItems : allItems.filter((item) => {
    const status = String(item && item.status || item && item.rawStatus || 'pending').trim().toLowerCase();
    return status !== 'paid' && status !== 'rejected' && !String(item && item.paidAt || '').trim() && !String(item && item.txHash || '').trim();
  });
  const completedItems = rawCompletedItems.length ? rawCompletedItems : allItems.filter((item) => {
    const status = String(item && item.status || item && item.rawStatus || '').trim().toLowerCase();
    return status === 'paid' || !!String(item && item.paidAt || '').trim() || !!String(item && item.txHash || '').trim();
  });
  const rejectedItems = allItems.filter((item) => {
    const status = String(item && item.status || item && item.rawStatus || '').trim().toLowerCase();
    return status === 'rejected';
  });
  const whitelistItems = Array.isArray(data.whitelistItems) ? data.whitelistItems : [];
  const spendItems = Array.isArray(data.spendItems) ? data.spendItems : [];
  const pendingCount = pendingItems.length;
  const completedCount = completedItems.length;
  const rejectedCount = rejectedItems.length;
  if (statusEl) statusEl.textContent = `Pending: ${pendingCount} · Completed: ${completedCount} · Rejected: ${rejectedCount} · Whitelisted wallets: ${whitelistItems.length}`;
  const whitelistListEl = qs('rewardClaimsWhitelistList');
  const saveWhitelistBtn = qs('saveRewardWhitelistBtn');
  if (saveWhitelistBtn) saveWhitelistBtn.disabled = !!state.rewardClaimsLoading || !!state.rewardWhitelistSaving;
  if (whitelistListEl) {
    whitelistListEl.innerHTML = whitelistItems.length ? whitelistItems.map((item) => `
      <div class="reward-claim-whitelist-row">
        <div>
          <div class="reward-claim-whitelist-wallet">${escapeHtml(shortWallet(item.walletAddress))}</div>
          <div class="reward-claim-whitelist-notes mono">${escapeHtml(item.walletAddress || '')}</div>
        </div>
        <div class="reward-claim-whitelist-pill ${item.isActive ? 'is-on' : 'is-off'}">${item.isActive ? 'Active' : 'Inactive'}</div>
        <div class="reward-claim-whitelist-pill ${item.autoDaily ? 'is-on' : 'is-off'}">Daily ${item.autoDaily ? 'On' : 'Off'}</div>
        <div class="reward-claim-whitelist-pill ${item.autoBounty ? 'is-on' : 'is-off'}">Bounty ${item.autoBounty ? 'On' : 'Off'}</div>
        <div class="reward-claim-whitelist-pill">Max ${item.maxClaimAmount != null ? escapeHtml(String(item.maxClaimAmount)) : '—'}</div>
        <div class="reward-claim-whitelist-pill">Cap ${item.dailyCap != null ? escapeHtml(String(item.dailyCap)) : '—'}</div>
        <div class="reward-claim-whitelist-notes">${escapeHtml(item.notes || '') || 'No notes'}</div>
        <div class="reward-claim-whitelist-actions">
          <button class="reward-claim-action-btn" data-whitelist-action="edit" data-whitelist-wallet="${escapeHtml(item.walletAddress || '')}">Edit</button>
          <button class="reward-claim-action-btn is-danger" data-whitelist-action="delete" data-whitelist-wallet="${escapeHtml(item.walletAddress || '')}">Delete</button>
        </div>
      </div>`).join('') : '<div class="reward-claims-admin-empty">No wallets whitelisted yet.</div>';
  }

  const totals = data && data.pendingTotalsByCurrency && typeof data.pendingTotalsByCurrency === 'object'
    ? Object.entries(data.pendingTotalsByCurrency)
        .map(([currency, value]) => ({ currency: String(currency || '').trim() || 'OTHER', value: Number(value || 0) || 0 }))
        .filter((entry) => entry.value > 0)
    : [];
  const totalsMarkup = totals.length
    ? `<div class="reward-claims-admin-summary">${totals.map((entry) => `<div class="reward-claims-pill"><span class="reward-claims-pill-label">Pending ${entry.currency}</span><span class="reward-claims-pill-value">${entry.value}</span></div>`).join('')}</div>`
    : '';
  const moosifer = state.moosiferBounty && typeof state.moosiferBounty === 'object' ? state.moosiferBounty : {};
  const moosiferRewardOn = !!moosifer.rewardEnabled;
  const moosiferClaimed = !!moosifer.claimed;
  const moosiferDefeats = Number(moosifer.defeatedCount || 0) || 0;
  const moosiferStatus = state.moosiferBountyError
    ? `<div class="bounty-status-banner is-error">${escapeHtml(state.moosiferBountyError)}</div>`
    : `<div class="wallet-tracking-summary">Defeated by players: ${escapeHtml(String(moosiferDefeats))}. First-kill 500 JEWEL reward: ${moosiferRewardOn ? 'Enabled' : 'Disabled'}${moosiferClaimed ? ' · already claimed' : ''}.</div>`;
  const moosiferBountyMarkup = `<div class="reward-claims-admin-group">
      <div class="reward-claims-admin-subtitle">Moosifer first-kill reward</div>
      ${moosiferStatus}
      <div class="reward-claim-actions">
        <button type="button" class="reward-claim-action-btn" data-moosifer-bounty-refresh="1" ${state.moosiferBountyLoading ? 'disabled' : ''}>Refresh</button>
        <button type="button" class="reward-claim-action-btn ${moosiferRewardOn ? 'is-danger' : 'is-good'}" data-moosifer-bounty-toggle="${moosiferRewardOn ? 'off' : 'on'}" ${state.moosiferBountyLoading ? 'disabled' : ''}>${moosiferRewardOn ? 'Disable reward' : 'Enable reward'}</button>
      </div>
    </div>`;

  const renderClaimCard = (item, completed = false) => {
    const status = String(item.status || 'pending').toLowerCase();
    const type = String(item.claimTypeLabel || item.claimType || 'Reward').trim();
    const amount = String(item.amountText || '--').trim();
    const walletText = String(item.walletAddress || '').trim();
    const player = escapeHtml(String(item.playerName || walletText || 'Unknown player').trim());
    const reason = escapeHtml(String(item.reason || item.title || '').trim() || '--');
    const requested = escapeHtml(String(item.requestedAtLabel || item.requestedAt || '').trim() || '--');
    const sourceRef = String(item.sourceRef || '').trim();
    const claimDay = String(item.claimDay || '').trim();
    const adminNote = String(item.adminNote || '').trim();
    const resolvedLabel = String(item.paidAtLabel || item.resolvedAtLabel || item.approvedAtLabel || '').trim();
    const whitelistLabel = item.whitelist && item.whitelist.isActive
      ? `<div class="reward-claim-whitelist-badge">Whitelist${item.whitelist.autoDaily || item.whitelist.autoBounty ? ' · Auto' : ''}</div>`
      : '';
    const actions = completed
      ? `<div class="reward-claim-actions">${status !== 'paid' ? `<button type="button" class="reward-claim-action-btn is-good" data-claim-action="approve_and_pay" data-claim-id="${escapeHtml(item.id || '')}">Send Now</button><button type="button" class="reward-claim-action-btn" data-claim-action="paid" data-claim-id="${escapeHtml(item.id || '')}">Mark Paid</button>` : ''}</div>`
      : `<div class="reward-claim-actions"><button type="button" class="reward-claim-action-btn is-good" data-claim-action="approve_and_pay" data-claim-id="${escapeHtml(item.id || '')}">Approve &amp; Send</button><button type="button" class="reward-claim-action-btn" data-claim-action="approve" data-claim-id="${escapeHtml(item.id || '')}">Approve Only</button><button type="button" class="reward-claim-action-btn is-danger" data-claim-action="reject" data-claim-id="${escapeHtml(item.id || '')}">Reject</button></div>`;
    return `
      <article class="reward-claim-card is-collapsible" data-claim-collapse-card="1" is-collapsible is-${status}">
        <div class="reward-claim-summary"><div class="reward-claim-summary-main">${escapeHtml(shortWallet(item.walletAddress || ""))}</div><div class="reward-claim-summary-sub">${escapeHtml(item.claimDay || item.requestedAtLabel || "")}</div></div><div class="reward-claim-card-top">
          <div>
            <div class="reward-claim-card-title">${escapeHtml(type)}</div>${whitelistLabel}
            <div class="reward-claim-card-status status-${status}">${escapeHtml(String(status).toUpperCase())}</div>
          </div>
          <div class="reward-claim-card-amount">${escapeHtml(amount)}</div>
        </div>
        <div class="reward-claim-card-grid">
          <div><span class="reward-claim-label">Player</span><div class="reward-claim-value">${player}</div></div>
          <div><span class="reward-claim-label">Wallet</span><div class="reward-claim-value mono">${escapeHtml(walletText)}</div></div>
          <div><span class="reward-claim-label">For</span><div class="reward-claim-value">${reason}</div></div>
          <div><span class="reward-claim-label">Requested</span><div class="reward-claim-value">${requested}</div></div>
          ${claimDay ? `<div><span class="reward-claim-label">Claim day</span><div class="reward-claim-value">${escapeHtml(claimDay)}</div></div>` : ''}
          ${sourceRef ? `<div><span class="reward-claim-label">Source</span><div class="reward-claim-value mono">${escapeHtml(sourceRef)}</div></div>` : ''}
          ${resolvedLabel ? `<div><span class="reward-claim-label">Completed</span><div class="reward-claim-value">${escapeHtml(resolvedLabel)}</div></div>` : ''}
          ${adminNote ? `<div class="reward-claim-admin-note"><span class="reward-claim-label">Admin note</span><div class="reward-claim-value">${escapeHtml(adminNote)}</div></div>` : ''}
          ${item.txHash ? `<div><span class="reward-claim-label">Tx Hash</span><div class="reward-claim-value mono">${escapeHtml(item.txHash)}</div></div>` : ''}
          ${item.failureReason ? `<div class="reward-claim-admin-note"><span class="reward-claim-label">Failure</span><div class="reward-claim-value">${escapeHtml(item.failureReason)}</div></div>` : ''}
        </div>
        ${actions}
      </article>
    `;
  };

  const claimsPerPage = 10;
  const claimsByTab = { pending: pendingItems, completed: completedItems, rejected: rejectedItems };
  const tabKey = ['pending', 'completed', 'rejected'].includes(String(state.rewardClaimsTab || '')) ? String(state.rewardClaimsTab) : 'pending';
  const activeItems = Array.isArray(claimsByTab[tabKey]) ? claimsByTab[tabKey] : [];
  const requestedPage = Math.max(1, Number((state.rewardClaimsPageByTab && state.rewardClaimsPageByTab[tabKey]) || 1));
  const pageCount = Math.max(1, Math.ceil(activeItems.length / claimsPerPage));
  const safePage = Math.min(requestedPage, pageCount);
  if (state.rewardClaimsPageByTab) state.rewardClaimsPageByTab[tabKey] = safePage;
  const pageStart = (safePage - 1) * claimsPerPage;
  const pagedItems = activeItems.slice(pageStart, pageStart + claimsPerPage);
  const claimsTabMarkup = `<div class="reward-claims-tabs">
      <button class="reward-claims-tab-btn ${tabKey === 'pending' ? 'active' : ''}" data-claims-tab="pending">Pending <span class="reward-claims-tab-count">${pendingCount}</span></button>
      <button class="reward-claims-tab-btn ${tabKey === 'completed' ? 'active' : ''}" data-claims-tab="completed">Completed <span class="reward-claims-tab-count">${completedCount}</span></button>
      <button class="reward-claims-tab-btn ${tabKey === 'rejected' ? 'active' : ''}" data-claims-tab="rejected">Rejected <span class="reward-claims-tab-count">${rejectedCount}</span></button>
    </div>`;
  const claimsListMarkup = pagedItems.length
    ? pagedItems.map((item) => renderClaimCard(item, tabKey !== 'pending')).join('')
    : `<div class="reward-claims-admin-empty">No ${escapeHtml(tabKey)} withdrawals.</div>`;
  const claimsPagerMarkup = `<div class="reward-claims-pagination">
      <button class="reward-claim-action-btn" data-claims-page-dir="prev" ${safePage <= 1 ? 'disabled' : ''}>Prev</button>
      <div class="reward-claims-page-label">Page ${safePage} / ${pageCount}</div>
      <button class="reward-claim-action-btn" data-claims-page-dir="next" ${safePage >= pageCount ? 'disabled' : ''}>Next</button>
    </div>`;
  const spendControlsMarkup = `<div class="reward-spend-controls">
      <button class="reward-spend-filter-btn ${state.rewardSpendTimeframe === 'today' ? 'active' : ''}" data-spend-timeframe="today">Today</button>
      <button class="reward-spend-filter-btn ${state.rewardSpendTimeframe === 'this_week' ? 'active' : ''}" data-spend-timeframe="this_week">This Week</button>
      <button class="reward-spend-filter-btn ${state.rewardSpendTimeframe === 'last_week' ? 'active' : ''}" data-spend-timeframe="last_week">Last Week</button>
      <button class="reward-spend-filter-btn ${state.rewardSpendTimeframe === 'all' ? 'active' : ''}" data-spend-timeframe="all">All Time</button>
    </div>`;
  const spendMarkup = spendItems.length
    ? `<div class="reward-claim-spend-list">${spendItems.map((item) => {
      const fullWallet = String(item.walletAddress || '').trim();
      const shownWallet = shortWallet(fullWallet);
      return `
      <div class="reward-claim-whitelist-row reward-spend-row">
        <div>
          <div class="reward-claim-whitelist-wallet">${escapeHtml(String(item.playerName || shownWallet || 'Unknown player'))}</div>
          <div class="reward-claim-whitelist-notes mono reward-spend-wallet" title="${escapeHtml(fullWallet)}">${escapeHtml(shownWallet)}</div>
        </div>
        <div class="reward-claim-whitelist-pill">AVAX ${escapeHtml(formatShortAvaxFromWei(item.avaxSpentWei || '0'))}</div>
        <div class="reward-claim-whitelist-pill">JEWEL ${escapeHtml(formatJewelNumberFromWei(item.jewelSpentWei || '0'))}</div>
        ${Number(item.honkSpendCount || 0) > 0 || String(item.honkSpentWei || '0') !== '0' ? `<div class="reward-claim-whitelist-pill">HONK ${escapeHtml(formatJewelNumberFromWei(item.honkSpentWei || '0'))}</div>` : ''}
        <div class="reward-claim-whitelist-pill">DFK Gold ${escapeHtml(String(Math.round(Number(item.dfkGoldBurned || 0)).toLocaleString()))}</div>
        <div class="reward-claim-whitelist-pill">Tx ${escapeHtml(String(Number(item.avaxSpendCount || 0) + Number(item.jewelSpendCount || 0) + Number(item.honkSpendCount || 0)))}</div>
        <div class="reward-claim-whitelist-pill">Gold burns ${escapeHtml(String(Number(item.dfkGoldBurnCount || 0)))}</div>
        <div class="reward-claim-whitelist-notes">${escapeHtml(item.lastActivityAtLabel || 'No activity time')}</div>
      </div>`;
    }).join('')}</div>`
    : '<div class="reward-claims-admin-empty">No AVAX/JEWEL or DFK Gold spend data for this timeframe yet.</div>';

  bodyEl.innerHTML = `${totalsMarkup}
    ${moosiferBountyMarkup}
    <div class="reward-claims-admin-group">
      <div class="reward-claims-admin-subtitle">Withdrawals</div>
      ${claimsTabMarkup}
      ${claimsListMarkup}
      ${claimsPagerMarkup}
    </div>
    <div class="reward-claims-admin-group ${state.rewardSpendCollapsed ? 'is-collapsed' : ''}">
      <div class="reward-claims-section-header">
        <button class="reward-claims-section-toggle" data-reward-section-toggle="spend" type="button"><span class="chev">${state.rewardSpendCollapsed ? '▸' : '▾'}</span> Player spend list</button>
      </div>
      <div class="reward-claims-section-body">
        <div class="wallet-tracking-summary">AVAX/JEWEL spent on hero hires / gold swaps and DFK Gold burned by wallet. Showing: ${escapeHtml(getRewardSpendTimeframeLabel(state.rewardSpendTimeframe || 'all'))}.</div>
        ${spendControlsMarkup}
        ${spendMarkup}
      </div>
    </div>
    <div class="reward-claims-admin-group">
      <div class="reward-claims-admin-subtitle">Quest JEWEL by player</div>
      <div class="wallet-tracking-summary">Each player row shows completed JEWEL quest count and total. Click a player to see JEWEL claimed by day and how many quests made up that day.</div>
      ${renderQuestPlayerSummary(completedItems)}
    </div>
`;
  attachDirectRewardClaimActionListeners(bodyEl);
}

function handleRewardClaimAction(button, event) {
  if (!button) return false;
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const claimId = String(button.getAttribute('data-claim-id') || '').trim();
  const action = String(button.getAttribute('data-claim-action') || '').trim().toLowerCase();
  if (!claimId || !action) return false;
  if (action === 'approve_and_pay') {
    updateRewardClaimStatus(claimId, 'approved', 'approve_and_pay').catch((error) => { setStatus(`AVAX Rails: ${error.message || 'Failed to approve and send reward claim.'}`, 'bad'); updateTreasuryUi(); });
    return true;
  }
  const map = { approve: 'approved', reject: 'rejected', paid: 'paid' };
  const nextStatus = map[action];
  if (!nextStatus) return false;
  updateRewardClaimStatus(claimId, nextStatus, 'status').catch((error) => { setStatus(`AVAX Rails: ${error.message || 'Failed to update reward claim.'}`, 'bad'); updateTreasuryUi(); });
  return true;
}

function attachDirectRewardClaimActionListeners(rootEl) {
  const host = rootEl || qs('rewardClaimsAdminBody');
  if (!host || typeof host.querySelectorAll !== 'function') return;
  host.querySelectorAll('[data-claim-action]').forEach((button) => {
    if (!button) return;
    button.setAttribute('type', 'button');
    if (button.__dfkDirectClaimActionBound) return;
    button.__dfkDirectClaimActionBound = true;
    button.addEventListener('click', (event) => {
      handleRewardClaimAction(button, event);
    });
  });
  host.querySelectorAll('[data-quest-player-toggle]').forEach((button) => {
    if (!button) return;
    button.setAttribute('type', 'button');
    if (button.__dfkQuestPlayerToggleBound) return;
    button.__dfkQuestPlayerToggleBound = true;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const wallet = normalizeAddress(button.getAttribute('data-quest-player-toggle') || '');
      if (!wallet) return;
      state.rewardQuestPlayerOpen = state.rewardQuestPlayerOpen || {};
      state.rewardQuestPlayerOpen[wallet] = !state.rewardQuestPlayerOpen[wallet];
      renderRewardClaimsAdmin();
    });
  });
}


function hoistTreasuryFlyoutToBody() {
  const panel = qs('avaxTreasuryPanel');
  const backdrop = qs('treasuryFlyoutBackdrop');
  const body = document.body;
  if (panel && body && panel.parentElement !== body) body.appendChild(panel);
  if (backdrop && body && backdrop.parentElement !== body) body.appendChild(backdrop);
}

function syncTreasuryFlyoutUi() {
  const panel = qs('avaxTreasuryPanel');
  const backdrop = qs('treasuryFlyoutBackdrop');
  const button = qs('treasuryFlyoutBtn');
  const wallet = getWallet();
  const allowed = !!(wallet && wallet.address && isTreasuryWallet(wallet.address));
  if (!allowed) state.treasuryFlyoutOpen = false;
  const open = !!(allowed && state.treasuryFlyoutOpen);
  if (button) {
    button.classList.toggle('hidden', !allowed);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (panel) {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  if (backdrop) {
    backdrop.classList.toggle('hidden', !open);
    backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
}

function openTreasuryFlyout() {
  const wallet = getWallet();
  if (!(wallet && wallet.address && isTreasuryWallet(wallet.address))) return;
  state.treasuryFlyoutOpen = true;
  syncTreasuryFlyoutUi();
  refreshTreasurySummary().catch(() => { updateTreasuryUi(); });
  refreshRewardClaimsAdmin().catch(() => { updateTreasuryUi(); });
  refreshMoosiferBountyAdmin().catch(() => { updateTreasuryUi(); });
}

function closeTreasuryFlyout() {
  state.treasuryFlyoutOpen = false;
  syncTreasuryFlyoutUi();
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
  syncTreasuryFlyoutUi();
  if (!visible) {
    renderRewardClaimsAdmin();
    return;
  }
  if (statusEl) {
    const pendingCount = Number((state.rewardClaims && state.rewardClaims.pendingCount) || 0);
    statusEl.textContent = pendingCount > 0 ? `Private · ${pendingCount} pending` : 'Private';
  }
  if (!state.treasurySummary) {
    if (totalEl) totalEl.innerHTML = `<span class="treasury-summary-title">Lifetime treasury in</span><span class="treasury-summary-values"><span class="treasury-summary-value">AVAX <strong>0 AVAX</strong></span><span class="treasury-summary-value">JEWEL <strong>0</strong></span><span class="treasury-summary-value">HONK <strong>0</strong></span></span>`;
    if (todayEl) todayEl.innerHTML = `<span class="treasury-summary-title">Lifetime treasury out</span><span class="treasury-summary-values"><span class="treasury-summary-value">AVAX <strong>0 AVAX</strong></span><span class="treasury-summary-value">JEWEL <strong>0</strong></span><span class="treasury-summary-value">HONK <strong>0</strong></span></span>`;
    if (breakdownEl) breakdownEl.innerHTML = '<span class="treasury-summary-breakdown"><strong>Bundles</strong> · AVAX 0 · JEWEL 0 · HONK 0 &nbsp; <strong>Gold swaps</strong> · AVAX 0 · JEWEL 0 · HONK 0 &nbsp; <strong>Hero hires</strong> · AVAX 0 · JEWEL 0 · HONK 0 &nbsp; <strong>Burned gold</strong> · 0</span>';
    if (countEl) countEl.innerHTML = state.rewardClaims ? `<span class="treasury-summary-breakdown"><strong>Confirmed payments</strong> · ${Number((state.rewardClaims && state.rewardClaims.completedCount) || 0)}+ reward updates loaded</span>` : '<span class="treasury-summary-breakdown"><strong>Confirmed payments</strong> · --</span>';
    renderRewardClaimsAdmin();
    return;
  }
  const s = state.treasurySummary;
  if (totalEl) totalEl.innerHTML = `<span class="treasury-summary-title">Lifetime treasury in</span><span class="treasury-summary-values"><span class="treasury-summary-value">AVAX <strong>${escapeHtml(formatAvaxFromWei(s.lifetimeAvaxInWei || '0'))}</strong></span><span class="treasury-summary-value">JEWEL <strong>${escapeHtml(formatJewelNumberFromWei(s.lifetimeJewelInWei || '0'))}</strong></span><span class="treasury-summary-value">HONK <strong>${escapeHtml(formatJewelNumberFromWei(s.lifetimeHonkInWei || '0'))}</strong></span></span>`;
  if (todayEl) todayEl.innerHTML = `<span class="treasury-summary-title">Lifetime treasury out</span><span class="treasury-summary-values"><span class="treasury-summary-value">AVAX <strong>${escapeHtml(formatRewardAmount(s.lifetimeAvaxOut || '0', 'AVAX'))}</strong></span><span class="treasury-summary-value">JEWEL <strong>${escapeHtml(formatRewardAmount(s.lifetimeJewelOut || '0', 'JEWEL'))}</strong></span><span class="treasury-summary-value">HONK <strong>${escapeHtml(formatRewardAmount(s.lifetimeHonkOut || '0', 'HONK'))}</strong></span></span>`;
  if (breakdownEl) breakdownEl.innerHTML = `<span class="treasury-summary-breakdown"><strong>Bundles</strong> · AVAX ${escapeHtml(formatShortAvaxFromWei(s.entryFeeAvaxWei || s.entryFeeWei || '0'))} · JEWEL ${escapeHtml(formatJewelNumberFromWei(s.entryFeeJewelWei || '0'))} · HONK ${escapeHtml(formatJewelNumberFromWei(s.entryFeeHonkWei || '0'))} &nbsp; <strong>Gold swaps</strong> · AVAX ${escapeHtml(formatShortAvaxFromWei(s.goldSwapAvaxWei || '0'))} · JEWEL ${escapeHtml(formatJewelNumberFromWei(s.goldSwapJewelWei || '0'))} · HONK ${escapeHtml(formatJewelNumberFromWei(s.goldSwapHonkWei || '0'))} &nbsp; <strong>Hero hires</strong> · AVAX ${escapeHtml(formatShortAvaxFromWei(s.heroHireAvaxWei || '0'))} · JEWEL ${escapeHtml(formatJewelNumberFromWei(s.heroHireJewelWei || '0'))} · HONK ${escapeHtml(formatJewelNumberFromWei(s.heroHireHonkWei || '0'))} &nbsp; <strong>Burned gold</strong> · ${escapeHtml(Math.max(0, Number(s.lifetimeBurnedGold || 0)).toLocaleString())}</span>`;
  if (countEl) countEl.innerHTML = `<span class="treasury-summary-breakdown"><strong>Confirmed payments</strong> · ${escapeHtml(String(Number(s.confirmedCount || 0)))} &nbsp; <strong>Gold swaps</strong> · ${escapeHtml(String(Number(s.goldSwapCount || 0)))} (${escapeHtml(String(Number(s.goldSwapAvaxCount || 0)))} AVAX / ${escapeHtml(String(Number(s.goldSwapJewelCount || 0)))} JEWEL / ${escapeHtml(String(Number(s.goldSwapHonkCount || 0)))} HONK) &nbsp; <strong>Hero hires</strong> · ${escapeHtml(String(Number(s.heroHireCount || 0)))} (${escapeHtml(String(Number(s.heroHireAvaxCount || 0)))} AVAX / ${escapeHtml(String(Number(s.heroHireJewelCount || 0)))} JEWEL / ${escapeHtml(String(Number(s.heroHireHonkCount || 0)))} HONK) &nbsp; <strong>Lifetime tracked runs</strong> · ${escapeHtml(Number(s.lifetimeTrackedRuns || 0).toLocaleString())}</span>`;
  renderRewardClaimsAdmin();
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
  function tokenFingerprint(token) { const v = String(token || ''); return v ? `${v.slice(0, 6)}…${v.slice(-4)}` : ''; }
  function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
  }
  function isBadTreasurySessionToken(token) {
    const text = String(token || '').trim();
    if (!text) return true;
    if (/^sb_(publishable|anon)_/i.test(text)) return true;
    const parts = text.split('.');
    if (parts.length === 3 && parts.every(Boolean)) return true;
    return !isUuidLike(text);
  }
  function getUsableTreasurySessionToken(token) {
    const text = String(token || '').trim();
    return isBadTreasurySessionToken(text) ? '' : text;
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

  async function ensureTreasurySession() {
    const tracker = window.DFKRunTracker;
    if (!tracker || typeof tracker.getState !== 'function') {
      throw new Error('Run tracking is not available.');
    }
    const trackerState = tracker.getState() || {};
    const existingToken = trackerState && trackerState.session && trackerState.session.sessionToken
      ? String(trackerState.session.sessionToken)
      : '';
    if (getUsableTreasurySessionToken(existingToken)) return getUsableTreasurySessionToken(existingToken);
    if (typeof tracker.authenticate !== 'function') {
      throw new Error('Run tracking session missing. Enable run tracking first.');
    }
    const session = await tracker.authenticate();
    const token = session && session.sessionToken ? String(session.sessionToken) : '';
    const usableToken = getUsableTreasurySessionToken(token);
    if (!usableToken) throw new Error('Run tracking session missing. Enable run tracking first.');
    return usableToken;
  }

  async function refreshTreasurySessionToken(forceRefresh = false) {
    const tracker = window.DFKRunTracker;
    if (!tracker) return '';
    if (forceRefresh && typeof tracker.reauthenticate === 'function') {
      const session = await tracker.reauthenticate();
      return getUsableTreasurySessionToken(session && session.sessionToken ? String(session.sessionToken) : '');
    }
    if (typeof tracker.authenticate === 'function') {
      const session = await tracker.authenticate(forceRefresh ? { forceRefresh: true } : undefined);
      return getUsableTreasurySessionToken(session && session.sessionToken ? String(session.sessionToken) : getTrackerSessionToken());
    }
    return getTrackerSessionToken();
  }

  function isTreasurySessionError(message) {
    return /session token required|session refresh required|invalid_session_token_format|session_lookup_failed|session not found|session expired|session revoked|wallet mismatch|missing authorization header|unauthorized|invalid or expired session|session device mismatch|session origin mismatch|missing user agent|missing_session_token|session_refresh_required|session_expired|session_revoked|session_device_mismatch|session_origin_mismatch/i.test(String(message || ''));
  }

  function getTrackerSessionToken() {
    const trackerState = window.DFKRunTracker && typeof window.DFKRunTracker.getState === 'function'
      ? window.DFKRunTracker.getState()
      : null;
    const token = (trackerState && trackerState.session && trackerState.session.sessionToken) || '';
    return getUsableTreasurySessionToken(token);
  }

  function buildTreasuryHeaders(sessionToken) {
    const headers = {
      'Content-Type': 'application/json',
      apikey: CONFIG.supabaseAnonKey,
    };
    const usableSessionToken = getUsableTreasurySessionToken(sessionToken);
    if (usableSessionToken) headers['x-session-token'] = usableSessionToken;
    return headers;
  }

  async function callFunction(name, payload) {
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) throw new Error('Supabase functions are not configured.');
    let sessionToken = getUsableTreasurySessionToken(getTrackerSessionToken());

    async function logSessionDiagnostic(reason, activeToken, error) {
      if (!window.DFKRunTracker || typeof window.DFKRunTracker.debugSession !== 'function') return;
      try {
        const diagnostic = await window.DFKRunTracker.debugSession({
          token: activeToken || '',
          reason,
          source: name,
        });
        console.warn('[avax-rails] auth diagnostic', {
          functionName: name,
          tokenFingerprint: tokenFingerprint(activeToken),
          diagnostic,
          originalError: String(error && error.message ? error.message : error || ''),
        });
      } catch (_error) {
        // ignore diagnostic failures
      }
    }

    async function sendRequest(activeToken) {
      let response;
      try {
        response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${name}`, {
          method: 'POST',
          headers: buildTreasuryHeaders(activeToken),
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

      if (!response.ok) {
        const message = json && (json.error || json.message || json.failureReason) ? String(json.error || json.message || json.failureReason) : `${name} failed.`;
        const requestId = response.headers.get('x-request-id') || response.headers.get('cf-ray') || '';
        const errorCode = json && (json.code || json.errorCode || json.reason) ? String(json.code || json.errorCode || json.reason) : '';
        const logPayload = {
          functionName: name,
          status: response.status,
          code: errorCode || null,
          tokenFingerprint: tokenFingerprint(activeToken),
          requestId,
          response: json || raw || null,
        };
        if (isTreasurySessionError(`${message} ${errorCode}`)) {
          console.info('[avax-rails] session refresh needed', logPayload);
        } else {
          console.warn('[avax-rails] function call failed', logPayload);
        }
        const err = enhanceFunctionError(name, new Error(`${message}${requestId ? ` [requestId=${requestId}]` : ''}`));
        err.status = response.status;
        err.code = errorCode || '';
        err.requestId = requestId || '';
        err.responseJson = json;
        throw err;
      }
      return json;
    }

    try {
      return await sendRequest(sessionToken);
    } catch (error) {
      const message = String(error && error.message ? error.message : error || '');
      if (!isTreasurySessionError(message) || !window.DFKRunTracker || typeof window.DFKRunTracker.authenticate !== 'function') {
        if (/session token required|session not found|session expired|session revoked/i.test(message)) {
          await logSessionDiagnostic('initial-auth-failure', sessionToken, error);
          throw enhanceFunctionError(name, new Error('Treasury session missing. Open tracked runs or connect run tracking first, then refresh claims.'));
        }
        throw error;
      }
      let refreshedToken = '';
      try {
        refreshedToken = await refreshTreasurySessionToken(false);
      } catch (_error) {}
      if (!refreshedToken || refreshedToken === sessionToken) {
        refreshedToken = await refreshTreasurySessionToken(true);
      }
      if (!refreshedToken || refreshedToken === sessionToken) {
        await logSessionDiagnostic('reauth-did-not-yield-new-token', sessionToken, error);
        if (/session token required|session not found|session expired|session revoked/i.test(message)) {
          throw enhanceFunctionError(name, new Error('Treasury session missing. Open tracked runs or connect run tracking first, then refresh claims.'));
        }
        throw error;
      }
      try {
        return await sendRequest(refreshedToken);
      } catch (retryError) {
        await logSessionDiagnostic('retry-auth-failure', refreshedToken, retryError);
        throw retryError;
      }
    }
  }


  function render() {
    const wallet = getWallet();
    if (!state.lastWallet && wallet && wallet.address) {
      state.lastWallet = normalizeAddress(wallet.address);
    }
    const walletConnected = !!(wallet && wallet.address);
    const freeWeb3Mode = walletConnected && isFreeWeb3RunsMode();
    if (ui.panel) {
      const panelDisabled = !walletConnected;
      ui.panel.classList.toggle('wallet-disabled', panelDisabled);
      ui.panel.setAttribute('aria-disabled', panelDisabled ? 'true' : 'false');
      ui.panel.style.opacity = panelDisabled ? '0.38' : '';
      ui.panel.style.filter = panelDisabled ? 'grayscale(1) saturate(0.12)' : '';
    }
    if (ui.panelToggle) {
      ui.panelToggle.disabled = !walletConnected;
      ui.panelToggle.setAttribute('aria-disabled', walletConnected ? 'false' : 'true');
      ui.panelToggle.title = !walletConnected ? 'Connect wallet first.' : 'AVAX Rails';
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
      setStatus('AVAX Rails: Web3 games are free right now', 'good');
      setText(ui.summary, 'Tracked web3 games are free right now. AVAX swaps and extra hero purchases are still available.');
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
      const bundleHidden = isFreeWeb3RunsMode();
      const disabled = state.purchaseBundlePending || !walletReady || !CONFIG.treasuryAddress || bundleHidden;
      bundleBtn.disabled = disabled;
      bundleBtn.textContent = state.purchaseBundlePending
        ? 'Buying Bundle…'
        : `Buy ${CONFIG.bundleGames} Games · ${formatAvaxFromWei(CONFIG.runPriceWei)}`;
      bundleBtn.title = state.purchaseBundlePending
        ? 'Bundle purchase in progress.'
        : (bundleHidden ? 'Tracked web3 games are free right now.' : (bundleBtn.disabled ? 'Connect wallet first.' : (!isTrackingEnabled() ? 'Enable tracking first to credit purchased games.' : `Buy ${CONFIG.bundleGames} paid games`)));
      bundleBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
      bundleBtn.dataset.pending = state.purchaseBundlePending ? 'true' : 'false';
      bundleBtn.classList.toggle('hidden', bundleHidden);
      bundleBtn.setAttribute('aria-hidden', bundleHidden ? 'true' : 'false');
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



  function getRewardClaimItemById(claimId) {
    const data = state.rewardClaims || {};
    const allItems = Array.isArray(data.items) ? data.items : [];
    const pendingItems = Array.isArray(data.pendingItems) ? data.pendingItems : [];
    const completedItems = Array.isArray(data.completedItems) ? data.completedItems : [];
    const targetId = String(claimId || '').trim();
    return pendingItems.concat(completedItems, allItems).find((item) => String(item && item.id || '').trim() === targetId) || null;
  }

  function parseRewardAmountToWei(claimItem) {
    const currency = String(claimItem && claimItem.rewardCurrency || '').trim().toUpperCase();
    const amountValue = Number(claimItem && claimItem.amountValue || 0);
    if (!Number.isFinite(amountValue) || amountValue <= 0) throw new Error('Claim amount is invalid.');
    if (currency !== 'JEWEL' && currency !== 'AVAX') throw new Error(`Unsupported reward currency: ${currency || 'unknown'}.`);
    return BigInt(Math.round(amountValue * 1e18)).toString();
  }

  async function sendNativeRewardClaimPayout(claimItem) {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !wallet.selectedProvider || typeof wallet.selectedProvider.request !== 'function') {
      throw new Error('Treasury wallet connection is required.');
    }
    const currency = String(claimItem && claimItem.rewardCurrency || '').trim().toUpperCase();
    const targetWallet = normalizeAddress(claimItem && claimItem.walletAddress || '');
    if (!targetWallet) throw new Error('Claim wallet is missing.');
    const amountWei = parseRewardAmountToWei(claimItem);
    const targetChainId = currency === 'JEWEL' ? 53935 : Number(CONFIG.chainId || 43114);
    const targetChainHex = currency === 'JEWEL'
      ? (window.DFK_DFKCHAIN_HEX || '0xd2af')
      : (CONFIG.chainHex || '0xa86a');
    const currentChainId = Number(wallet.activeChainId || 0);
    if (currentChainId !== targetChainId) {
      try {
        await wallet.selectedProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainHex }],
        });
      } catch (_error) {
        throw new Error(`Switch to ${currency === 'JEWEL' ? 'DFK Chain' : 'AVAX'} first, then try again.`);
      }
    }
    const txHash = await wallet.selectedProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: wallet.address,
        to: targetWallet,
        value: '0x' + BigInt(String(amountWei || '0')).toString(16),
      }],
    });
    return { txHash, rewardCurrency: currency, amountWei, walletAddress: targetWallet };
  }

  async function refreshTreasurySummary(options = {}) {
    const wallet = getWallet();
    const force = !!(options && options.force);
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) {
      state.treasurySummary = null;
      updateTreasuryUi();
      return null;
    }
    const cacheKey = getTreasuryCacheWalletKey(wallet.address, 'summary');
    const cache = readJsonCache(TREASURY_SUMMARY_CACHE_KEY) || {};
    if (!force && isFreshCacheEntry(cache[cacheKey], TREASURY_SUMMARY_CACHE_TTL_MS)) {
      state.treasurySummary = cache[cacheKey].summary || null;
      updateTreasuryUi();
      return state.treasurySummary;
    }
    const summary = await callFunction(CONFIG.treasurySummaryFunction, { walletAddress: wallet.address });
    state.treasurySummary = summary || null;
    cache[cacheKey] = { savedAt: new Date().toISOString(), summary: state.treasurySummary };
    writeJsonCache(TREASURY_SUMMARY_CACHE_KEY, cache);
    updateTreasuryUi();
    return state.treasurySummary;
  }


  async function updateRewardClaimStatus(claimId, nextStatus, mode = 'status') {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) throw new Error('Treasury wallet required.');
    const normalizedStatus = nextStatus === 'approve' ? 'approved' : (nextStatus === 'reject' ? 'rejected' : String(nextStatus || '').trim().toLowerCase());
    const claimItem = getRewardClaimItemById(claimId);
    const adminNote = window.prompt(`Optional admin note for ${mode === 'approve_and_pay' ? 'approve and send' : normalizedStatus}:`, '') || '';
    let txHash = '';
    state.rewardClaimsLoading = true;
    updateTreasuryUi();
    try {
      let response;
      const claimCurrency = String(claimItem && claimItem.rewardCurrency || '').trim().toUpperCase();
      const canManualNativePayout = mode === 'approve_and_pay'
        && !!claimItem
        && (claimCurrency === 'AVAX' || claimCurrency === 'JEWEL')
        && !!(wallet && wallet.selectedProvider && typeof wallet.selectedProvider.request === 'function');

      if (canManualNativePayout) {
        const manualPayout = await sendNativeRewardClaimPayout(claimItem);
        txHash = String(manualPayout && manualPayout.txHash || '').trim();
        response = await callFunction(CONFIG.rewardClaimsAdminFunction, {
          walletAddress: wallet.address,
          action: 'update_status',
          claimId,
          status: 'paid',
          adminNote: [String(adminNote || '').trim(), `Manual treasury payout sent by ${wallet.address}. Currency: ${claimCurrency}.`].filter(Boolean).join(' '),
          txHash,
        });
      } else {
        response = await callFunction(CONFIG.rewardClaimsAdminFunction, mode === 'approve_and_pay' ? {
          walletAddress: wallet.address,
          action: 'approve_and_pay',
          claimId,
          adminNote,
        } : {
          walletAddress: wallet.address,
          action: 'update_status',
          claimId,
          status: normalizedStatus,
          adminNote,
          txHash,
        });

        if (mode === 'approve_and_pay' && (!response || !response.txHash) && claimItem) {
          const manualPayout = await sendNativeRewardClaimPayout(claimItem);
          txHash = String(manualPayout && manualPayout.txHash || '').trim();
          response = await callFunction(CONFIG.rewardClaimsAdminFunction, {
            walletAddress: wallet.address,
            action: 'update_status',
            claimId,
            status: 'paid',
            adminNote: [String(adminNote || '').trim(), `Manual treasury payout sent by ${wallet.address}. Currency: ${claimCurrency || 'UNKNOWN'}.`].filter(Boolean).join(' '),
            txHash,
          });
        }
      }

      if (response && response.txHash) {
        const suffix = response && response.payoutAttemptId ? ` · ${String(response.payoutAttemptId)}` : '';
        setStatus(`Treasury payout sent: ${shortHash(response.txHash)}${suffix}`, 'good');
      } else if (response && (response.failureReason || response.message)) {
        const detail = String(response.failureReason || response.message || '').trim();
        const requestTag = response && response.requestId ? ` [${String(response.requestId)}]` : '';
        setStatus(`Treasury: ${detail}${requestTag}`, response.status === 'paid' ? 'good' : 'warn');
      }
      try {
        if (window.refreshTopMenuData) window.refreshTopMenuData();
        else if (window.DFKDefenseWallet && typeof window.DFKDefenseWallet.refreshWalletDetails === 'function') window.DFKDefenseWallet.refreshWalletDetails().catch(() => null);
      } catch (_error) {}
      await refreshRewardClaimsAdmin();
    } finally {
      state.rewardClaimsLoading = false;
      updateTreasuryUi();
    }
  }

  async function saveRewardWhitelist() {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) throw new Error('Treasury wallet required.');
    const targetWallet = normalizeAddress(qs('rewardWhitelistWalletInput') && qs('rewardWhitelistWalletInput').value);
    if (!targetWallet) throw new Error('Wallet address is required.');
    state.rewardWhitelistSaving = true;
    updateTreasuryUi();
    try {
      await callFunction(CONFIG.rewardClaimsAdminFunction, {
        walletAddress: wallet.address,
        action: 'whitelist_upsert',
        targetWallet,
        isActive: !!(qs('rewardWhitelistActiveInput') && qs('rewardWhitelistActiveInput').checked),
        autoDaily: !!(qs('rewardWhitelistDailyInput') && qs('rewardWhitelistDailyInput').checked),
        autoBounty: !!(qs('rewardWhitelistBountyInput') && qs('rewardWhitelistBountyInput').checked),
        maxClaimAmount: parseOptionalNumber(qs('rewardWhitelistMaxClaimInput') && qs('rewardWhitelistMaxClaimInput').value),
        dailyCap: parseOptionalNumber(qs('rewardWhitelistDailyCapInput') && qs('rewardWhitelistDailyCapInput').value),
        notes: String(qs('rewardWhitelistNotesInput') && qs('rewardWhitelistNotesInput').value || '').trim(),
      });
      await refreshRewardClaimsAdmin();
    } finally {
      state.rewardWhitelistSaving = false;
      updateTreasuryUi();
    }
  }

  async function deleteRewardWhitelist(targetWallet) {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) throw new Error('Treasury wallet required.');
    if (!targetWallet) throw new Error('Wallet address is required.');
    if (!window.confirm(`Delete whitelist entry for ${targetWallet}?`)) return;
    state.rewardWhitelistSaving = true;
    updateTreasuryUi();
    try {
      await callFunction(CONFIG.rewardClaimsAdminFunction, {
        walletAddress: wallet.address,
        action: 'whitelist_delete',
        targetWallet,
      });
      if (normalizeAddress(qs('rewardWhitelistWalletInput') && qs('rewardWhitelistWalletInput').value) === normalizeAddress(targetWallet)) {
        setWhitelistFormFromItem(null);
      }
      await refreshRewardClaimsAdmin();
    } finally {
      state.rewardWhitelistSaving = false;
      updateTreasuryUi();
    }
  }

  async function refreshRewardClaimsAdmin(options = {}) {
    const wallet = getWallet();
    const force = !!(options && options.force);
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) {
      state.rewardClaims = null;
      state.rewardClaimsError = '';
      state.rewardClaimsLoading = false;
      updateTreasuryUi();
      return null;
    }
    const timeframe = state.rewardSpendTimeframe || 'all';
    const cacheKey = getTreasuryCacheWalletKey(wallet.address, `claims:${timeframe}`);
    const cache = readJsonCache(REWARD_CLAIMS_CACHE_KEY) || {};
    if (!force && isFreshCacheEntry(cache[cacheKey], REWARD_CLAIMS_CACHE_TTL_MS)) {
      state.rewardClaims = cache[cacheKey].claims || null;
      state.rewardClaimsError = '';
      state.rewardClaimsLoading = false;
      updateTreasuryUi();
      return state.rewardClaims;
    }
    state.rewardClaimsLoading = true;
    state.rewardClaimsError = '';
    updateTreasuryUi();
    try {
      await ensureTreasurySession();
      const claimsResponse = await callFunction(CONFIG.rewardClaimsAdminFunction, { walletAddress: wallet.address, limit: 100, timeframe });
      const safeClaims = claimsResponse || { pendingCount: 0, items: [] };
      const whitelistItems = Array.isArray(safeClaims.whitelistItems) ? safeClaims.whitelistItems : [];
      if (!whitelistItems.length || String(safeClaims.schemaWarning || '').trim()) {
        try {
          const whitelistResponse = await callFunction(CONFIG.rewardClaimsAdminFunction, { walletAddress: wallet.address, action: 'whitelist_list' });
          if (Array.isArray(whitelistResponse && whitelistResponse.items) && whitelistResponse.items.length) {
            safeClaims.whitelistItems = whitelistResponse.items;
          }
        } catch (_error) {}
      }
      state.rewardClaims = safeClaims;
      cache[cacheKey] = { savedAt: new Date().toISOString(), claims: state.rewardClaims };
      writeJsonCache(REWARD_CLAIMS_CACHE_KEY, cache);
      state.rewardClaimsPageByTab = { pending: 1, completed: 1, rejected: 1 };
      return state.rewardClaims;
    } catch (error) {
      state.rewardClaimsError = error && error.message ? error.message : 'Failed to load reward claims.';
      throw error;
    } finally {
      state.rewardClaimsLoading = false;
      updateTreasuryUi();
    }
  }

  async function refreshMoosiferBountyAdmin() {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) {
      state.moosiferBounty = null;
      state.moosiferBountyError = '';
      state.moosiferBountyLoading = false;
      updateTreasuryUi();
      return null;
    }
    state.moosiferBountyLoading = true;
    state.moosiferBountyError = '';
    updateTreasuryUi();
    try {
      await ensureTreasurySession();
      const response = await callFunction(CONFIG.moosiferBountyFunction, { action: 'status', walletAddress: wallet.address });
      state.moosiferBounty = response && typeof response === 'object' ? response : {};
      return state.moosiferBounty;
    } catch (error) {
      state.moosiferBountyError = error && error.message ? error.message : 'Failed to load Moosifer bounty status.';
      throw error;
    } finally {
      state.moosiferBountyLoading = false;
      updateTreasuryUi();
    }
  }

  async function setMoosiferBountyEnabled(enabled) {
    const wallet = getWallet();
    if (!wallet || !wallet.address || !isTreasuryWallet(wallet.address)) throw new Error('Treasury wallet required.');
    state.moosiferBountyLoading = true;
    state.moosiferBountyError = '';
    updateTreasuryUi();
    try {
      await ensureTreasurySession();
      const response = await callFunction(CONFIG.moosiferBountyFunction, {
        action: 'admin_update',
        walletAddress: wallet.address,
        rewardEnabled: !!enabled,
      });
      state.moosiferBounty = response && typeof response === 'object' ? response : {};
      setStatus(`Moosifer reward ${enabled ? 'enabled' : 'disabled'}.`, enabled ? 'good' : 'warn');
      return state.moosiferBounty;
    } catch (error) {
      state.moosiferBountyError = error && error.message ? error.message : 'Failed to update Moosifer reward.';
      throw error;
    } finally {
      state.moosiferBountyLoading = false;
      updateTreasuryUi();
    }
  }

  async function purchaseCustom({ clientRunId, kind, amountWei, label, metadata = {} }) {
    const wallet = getWallet();
    if (!wallet || !wallet.address) throw new Error('Connect wallet first.');
    if (!CONFIG.treasuryAddress) throw new Error('Treasury address is not configured.');
    const resolvedRunId = clientRunId || ((window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

    const normalizedKind = String(kind || '').trim().toLowerCase();
    const allowSessionlessHeroHire = normalizedKind === 'hero_hire';
    let session = null;

    try {
      session = await callFunction(CONFIG.createSessionFunction, {
        walletAddress: wallet.address,
        clientRunId: resolvedRunId,
        kind,
        expectedAmountWei: String(amountWei || '0'),
        chainId: CONFIG.chainId,
        metadata,
      });
    } catch (error) {
      if (!allowSessionlessHeroHire) throw error;
      const message = error && error.message ? error.message : 'session creation failed';
      console.warn('[AVAX Rails] hero_hire session creation failed, falling back to direct wallet payment:', message);
      setStatus(`AVAX Rails: Paying for ${label || kind}…`, 'warn');
    }

    setStatus(`AVAX Rails: Paying for ${label || kind}…`, 'warn');
    const payment = await sendWalletPayment({ amountWei: String(amountWei || '0') });

    if (!session || !session.paymentSessionId) {
      clearTreasuryCaches();
      refreshTreasurySummary({ force: true }).catch(() => {});
      refreshRewardClaimsAdmin({ force: true }).catch(() => {});
      if (normalizedKind === 'gold_crate' && window.game) {
        try {
          window.game.jewel = (Number(window.game.jewel || 0) + 2000);
          if (typeof window.render === 'function') window.render();
        } catch(e){}
      }
      return {
        paymentSessionId: null,
        clientRunId: resolvedRunId,
        txHash: payment.txHash,
        verifiedAt: null,
        walletAddress: payment.walletAddress,
        kind,
        metadata,
      };
    }

    setStatus(`AVAX Rails: Verifying ${label || kind}…`, 'warn');
    try {
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
      clearTreasuryCaches();
      refreshTreasurySummary({ force: true }).catch(() => {});
      refreshRewardClaimsAdmin({ force: true }).catch(() => {});
      if (normalizedKind === 'gold_crate' && window.game) {
        try {
          window.game.jewel = (Number(window.game.jewel || 0) + 2000);
          if (typeof window.render === 'function') window.render();
        } catch(e){}
      }
      return {
        paymentSessionId: session.paymentSessionId,
        clientRunId: resolvedRunId,
        txHash: payment.txHash,
        verifiedAt: verified.verifiedAt || new Date().toISOString(),
        walletAddress: payment.walletAddress,
        kind,
        metadata,
      };
    } catch (error) {
      if (!allowSessionlessHeroHire) throw error;
      const message = error && error.message ? error.message : 'verification failed';
      console.warn('[AVAX Rails] hero_hire verification failed after payment, returning success to avoid blocking placement:', message);
      clearTreasuryCaches();
      refreshTreasurySummary({ force: true }).catch(() => {});
      refreshRewardClaimsAdmin({ force: true }).catch(() => {});
      return {
        paymentSessionId: session.paymentSessionId || null,
        clientRunId: resolvedRunId,
        txHash: payment.txHash,
        verifiedAt: null,
        walletAddress: payment.walletAddress,
        kind,
        metadata,
      };
    }
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
    hoistTreasuryFlyoutToBody();
    const refreshClaimsBtn = qs('refreshTreasuryViewBtn');
    if (refreshClaimsBtn) refreshClaimsBtn.addEventListener('click', async () => {
      refreshClaimsBtn.disabled = true;
      try {
        await refreshTreasurySummary({ force: true }).catch(() => { updateTreasuryUi(); return null; });
        await refreshRewardClaimsAdmin({ force: true }).catch(() => { updateTreasuryUi(); return null; });
        await refreshRunBalance().catch(() => null);
        updateTreasuryUi();
      } finally {
        window.setTimeout(() => { refreshClaimsBtn.disabled = false; }, 500);
      }
    });
    const treasuryFlyoutBtn = qs('treasuryFlyoutBtn');
    if (treasuryFlyoutBtn) treasuryFlyoutBtn.addEventListener('click', () => { if (state.treasuryFlyoutOpen) closeTreasuryFlyout(); else openTreasuryFlyout(); });
    const treasuryFlyoutCloseBtn = qs('avaxTreasuryPanelCloseBtn');
    if (treasuryFlyoutCloseBtn) treasuryFlyoutCloseBtn.addEventListener('click', closeTreasuryFlyout);
    const treasuryFlyoutBackdrop = qs('treasuryFlyoutBackdrop');
    if (treasuryFlyoutBackdrop) treasuryFlyoutBackdrop.addEventListener('click', closeTreasuryFlyout);
    const saveWhitelistBtn = qs('saveRewardWhitelistBtn');
    if (saveWhitelistBtn) saveWhitelistBtn.addEventListener('click', () => saveRewardWhitelist().catch((error) => { setStatus(`AVAX Rails: ${error.message || 'Failed to save whitelist.'}`, 'bad'); updateTreasuryUi(); }));
    const whitelistList = qs('rewardClaimsWhitelistList');
    if (whitelistList) whitelistList.addEventListener('click', (event) => {
      const button = event.target && event.target.closest ? event.target.closest('[data-whitelist-action]') : null;
      if (!button) return;
      const targetWallet = String(button.getAttribute('data-whitelist-wallet') || '').trim();
      const action = String(button.getAttribute('data-whitelist-action') || '').trim().toLowerCase();
      if (!targetWallet || !action) return;
      const whitelistItems = Array.isArray(state.rewardClaims && state.rewardClaims.whitelistItems) ? state.rewardClaims.whitelistItems : [];
      const item = whitelistItems.find((entry) => normalizeAddress(entry.walletAddress) === normalizeAddress(targetWallet)) || null;
      if (action === 'edit') {
        setWhitelistFormFromItem(item);
        return;
      }
      if (action === 'delete') {
        deleteRewardWhitelist(targetWallet).catch((error) => { setStatus(`AVAX Rails: ${error.message || 'Failed to delete whitelist.'}`, 'bad'); updateTreasuryUi(); });
      }
    });
    const rewardClaimsBody = qs('rewardClaimsAdminBody');
    if (rewardClaimsBody) rewardClaimsBody.addEventListener('click', (event) => {
      const target = event.target && event.target.closest ? event.target : null;

      const button = target && target.closest ? target.closest('[data-claim-action]') : null;
      if (button) {
        if (handleRewardClaimAction(button, event)) return;
      }

      const tabButton = target && target.closest ? target.closest('[data-claims-tab]') : null;
      if (tabButton) {
        event.preventDefault();
        const nextTab = String(tabButton.getAttribute('data-claims-tab') || 'pending').trim().toLowerCase();
        if (['pending', 'completed', 'rejected'].includes(nextTab)) {
          state.rewardClaimsTab = nextTab;
          if (state.rewardClaimsPageByTab) state.rewardClaimsPageByTab[nextTab] = 1;
          renderRewardClaimsAdmin();
        }
        return;
      }

      const pageButton = target && target.closest ? target.closest('[data-claims-page-dir]') : null;
      if (pageButton) {
        event.preventDefault();
        const dir = String(pageButton.getAttribute('data-claims-page-dir') || '').trim().toLowerCase();
        const tabKey = ['pending', 'completed', 'rejected'].includes(String(state.rewardClaimsTab || '')) ? String(state.rewardClaimsTab) : 'pending';
        const delta = dir === 'next' ? 1 : -1;
        if (state.rewardClaimsPageByTab) state.rewardClaimsPageByTab[tabKey] = Math.max(1, Number((state.rewardClaimsPageByTab[tabKey]) || 1) + delta);
        renderRewardClaimsAdmin();
        return;
      }

      const moosiferRefresh = target && target.closest ? target.closest('[data-moosifer-bounty-refresh]') : null;
      if (moosiferRefresh) {
        event.preventDefault();
        refreshMoosiferBountyAdmin().catch((error) => {
          setStatus(`Moosifer reward: ${error && error.message ? error.message : 'Failed to refresh status.'}`, 'bad');
          updateTreasuryUi();
        });
        return;
      }

      const moosiferToggle = target && target.closest ? target.closest('[data-moosifer-bounty-toggle]') : null;
      if (moosiferToggle) {
        event.preventDefault();
        const nextEnabled = String(moosiferToggle.getAttribute('data-moosifer-bounty-toggle') || '').trim().toLowerCase() === 'on';
        setMoosiferBountyEnabled(nextEnabled).catch((error) => {
          setStatus(`Moosifer reward: ${error && error.message ? error.message : 'Failed to update.'}`, 'bad');
          updateTreasuryUi();
        });
        return;
      }

      const spendTimeframeButton = target && target.closest ? target.closest('[data-spend-timeframe]') : null;
      if (spendTimeframeButton) {
        event.preventDefault();
        const nextTimeframe = String(spendTimeframeButton.getAttribute('data-spend-timeframe') || 'all').trim().toLowerCase();
        if (!['today', 'this_week', 'last_week', 'all'].includes(nextTimeframe)) return;
        if (nextTimeframe === String(state.rewardSpendTimeframe || 'all').trim().toLowerCase()) {
          renderRewardClaimsAdmin();
          return;
        }
        state.rewardSpendTimeframe = nextTimeframe;
        state.rewardClaimsPageByTab = { pending: 1, completed: 1, rejected: 1 };
        state.rewardClaimsLoading = true;
        updateTreasuryUi();
        refreshRewardClaimsAdmin().catch((error) => {
          setStatus(`Treasury: ${error && error.message ? error.message : 'Failed to load spend data.'}`, 'bad');
          updateTreasuryUi();
        });
        return;
      }

      const sectionToggle = target && target.closest ? target.closest('[data-reward-section-toggle]') : null;
      if (sectionToggle) {
        event.preventDefault();
        const section = String(sectionToggle.getAttribute('data-reward-section-toggle') || '').trim().toLowerCase();
        if (section === 'spend') {
          state.rewardSpendCollapsed = !state.rewardSpendCollapsed;
          renderRewardClaimsAdmin();
        }
        return;
      }

      const collapseCard = target && target.closest ? target.closest('[data-claim-collapse-card]') : null;
      if (collapseCard) {
        collapseCard.classList.toggle('open');
        return;
      }
    });
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
      render();
      updateTreasuryUi();
    });
    window.addEventListener('dfk-defense:tracking-state', () => {
      render();
      updateTreasuryUi();
    });
    render();
    updateTreasuryUi();
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
    refreshRewardClaimsAdmin,
    clearTreasuryCaches,
    getTreasurySummary: () => (state.treasurySummary ? { ...state.treasurySummary } : null),
    formatAvaxFromWei,
    getRunBalance: () => (state.balance ? { ...state.balance } : null),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
