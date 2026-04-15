(function () {
  'use strict';

  var DEFAULT_SORT = { key: 'best_wave', direction: 'desc' };
  var RANGE_MODES = {
    current_week: 'current_week',
    last_week: 'last_week',
    current_day: 'current_day',
    current_day_avax: 'current_day_avax',
    custom: 'custom'
  };

  function el(id) {
    return document.getElementById(id);
  }

  function shortWallet(value) {
    var wallet = String(value || '');
    if (!wallet) return '—';
    if (wallet.length <= 14) return wallet;
    return wallet.slice(0, 5) + '…' + wallet.slice(-4);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getSupabaseConfig() {
    var cfg = window.SUPABASE_CONFIG || {};
    return {
      url: cfg.url || window.DFK_SUPABASE_URL || '',
      anonKey: cfg.anonKey || window.DFK_SUPABASE_PUBLISHABLE_KEY || ''
    };
  }

  function getCurrentSort() {
    var current = window.DFKLeaderboardSort || DEFAULT_SORT;
    return {
      key: current.key || DEFAULT_SORT.key,
      direction: current.direction === 'asc' ? 'asc' : 'desc'
    };
  }

  function getCurrentRangeRequest() {
    var current = window.DFKLeaderboardRangeRequest || { mode: RANGE_MODES.current_week };
    return {
      mode: current.mode || RANGE_MODES.current_week,
      start: current.start || '',
      end: current.end || ''
    };
  }

  function normalizeDateInputValue(value) {
    var text = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  }

  function parseDateOnlyToUtc(value) {
    var text = normalizeDateInputValue(value);
    if (!text) return null;
    return new Date(text + 'T00:00:00.000Z');
  }

  function formatDateOnlyUtc(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  function getCurrentUtcDateOnly() {
    return formatDateOnlyUtc(new Date());
  }

  function isDailyRaffleMode() {
    var mode = getCurrentRangeRequest().mode;
    return mode === RANGE_MODES.current_day || mode === RANGE_MODES.current_day_avax;
  }

  function getCurrentRaffleType() {
    return getCurrentRangeRequest().mode === RANGE_MODES.current_day_avax ? 'avax' : 'dfk';
  }

  function getCurrentRaffleLabel() {
    return getCurrentRaffleType() === 'avax' ? 'AVAX Daily Raffle' : 'DFK Daily Raffle';
  }

  function getDailyRaffleQualifiedWaveCount() {
    return 30;
  }

  function getCurrentUtcDayBounds() {
    var now = new Date();
    return {
      startMs: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
      endMs: Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
    };
  }

  function parseIsoMs(value) {
    if (!value) return 0;
    var ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : 0;
  }

  function isWithinCurrentUtcDay(value) {
    var ms = parseIsoMs(value);
    if (!ms) return false;
    var bounds = getCurrentUtcDayBounds();
    return ms >= bounds.startMs && ms < bounds.endMs;
  }


  function formatRangeLabel(startIso, endIso) {
    if (!startIso || !endIso) return 'Week of —';
    var startDate = new Date(startIso);
    var endDate = new Date(endIso);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'Week of —';
    var formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
    return formatter.format(startDate) + ' → ' + formatter.format(endDate) + ' UTC';
  }

  function buildFunctionUrl(baseUrl, functionName, params) {
    var url = new URL(baseUrl.replace(/\/$/, '') + '/functions/v1/' + functionName);
    Object.keys(params || {}).forEach(function (key) {
      var value = params[key];
      if (value == null || value === '') return;
      url.searchParams.set(key, String(value));
    });
    return url.toString();
  }

  async function fetchFunctionJson(baseUrl, anonKey, functionName, params) {
    var url = buildFunctionUrl(baseUrl, functionName, params || {});
    var response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: 'Bearer ' + anonKey,
        Accept: 'application/json'
      }
    });
    var responseText = '';
    try { responseText = await response.text(); } catch (e) {}
    var json = null;
    if (responseText) {
      try { json = JSON.parse(responseText); } catch (e) { json = null; }
    }
    if (!response.ok) {
      var message = json && (json.error || json.message)
        ? (json.error || json.message)
        : (responseText || response.statusText || 'Request failed');
      throw new Error(functionName + ': ' + response.status + ' ' + message);
    }
    return json;
  }

  function normalizeRow(row) {
    var playerName = row.vanity_name || row.player_name || row.display_name || row.name || row.username || 'Unknown Player';
    var wallet = row.wallet || row.wallet_address || row.wallet_addr || row.address || row.player_wallet || '';
    return {
      player_name: playerName,
      vanity_name: row.vanity_name || null,
      wallet: wallet,
      best_wave: row.best_wave != null ? row.best_wave : (row.wave_reached != null ? row.wave_reached : 0),
      runs: row.runs != null ? row.runs : (row.total_runs != null ? row.total_runs : 0),
      total_waves_cleared: row.total_waves_cleared != null ? row.total_waves_cleared : (row.waves_cleared != null ? row.waves_cleared : 0),
      used_wallet_heroes: !!(row.used_wallet_heroes || row.usedOwnNfts || row.used_own_nfts || row.used_nfts),
      dfk_gold_burned: Number(row.dfk_gold_burned != null ? row.dfk_gold_burned : (row.gold_burned != null ? row.gold_burned : 0)) || 0,
      last_run_at: row.last_run_at || row.updated_at || null,
      raffle_qualified: !!(row.raffle_qualified || row.daily_raffle_qualified || Number(row.best_wave != null ? row.best_wave : (row.wave_reached != null ? row.wave_reached : 0)) >= getDailyRaffleQualifiedWaveCount()),
      raffle_chain: String(row.raffle_chain || row.raffle_type || row.chain_label || '').toLowerCase() || null
    };
  }

  function compareValues(aValue, bValue, direction) {
    var factor = direction === 'asc' ? 1 : -1;
    if (typeof aValue === 'number' || typeof bValue === 'number') {
      return ((Number(aValue) || 0) - (Number(bValue) || 0)) * factor;
    }
    if (typeof aValue === 'boolean' || typeof bValue === 'boolean') {
      return ((aValue ? 1 : 0) - (bValue ? 1 : 0)) * factor;
    }
    return String(aValue || '').localeCompare(String(bValue || ''), undefined, { sensitivity: 'base' }) * factor;
  }

  function compareRows(a, b, sort) {
    var key = sort.key || DEFAULT_SORT.key;
    var direction = sort.direction || DEFAULT_SORT.direction;
    var primary = compareValues(a[key], b[key], direction);
    if (primary) return primary;
    var tieBreakers = [
      { key: 'best_wave', direction: 'desc' },
      { key: 'runs', direction: 'desc' },
      { key: 'dfk_gold_burned', direction: 'desc' },
      { key: 'player_name', direction: 'asc' },
      { key: 'wallet', direction: 'asc' }
    ];
    for (var i = 0; i < tieBreakers.length; i += 1) {
      var tie = tieBreakers[i];
      if (tie.key === key) continue;
      var tieResult = compareValues(a[tie.key], b[tie.key], tie.direction);
      if (tieResult) return tieResult;
    }
    return 0;
  }

  function syncFlyoutSizing(rows) {
    var flyout = el('leaderboardFlyout');
    if (!flyout) return;
    var needsWide = Array.isArray(rows) && rows.some(function (row) {
      return String(row && row.player_name || '').length > 22;
    });
    flyout.classList.toggle('leaderboard-flyout-wide', !!needsWide);
  }

  function renderRows(rows) {
    var tbody = el('leaderboardTableBody');
    var raffleHeader = el('leaderboardRaffleHeader');
    if (raffleHeader) raffleHeader.classList.toggle('hidden', !isDailyRaffleMode());
    if (!tbody) return;
    var sort = getCurrentSort();
    var items = rows.slice().sort(function (a, b) {
      return compareRows(a, b, sort);
    });
    syncFlyoutSizing(items);
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="leaderboard-empty">No leaderboard data found for this range.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (row, index) {
      var fullName = escapeHtml(row.player_name);
      var nftUsed = !!row.used_wallet_heroes;
      var showRaffle = isDailyRaffleMode();
      var raffleQualified = !!row.raffle_qualified;
      return '<tr>' +
        '<td class="leaderboard-rank">' + (index + 1) + '</td>' +
        '<td class="leaderboard-name-cell" title="' + fullName + '">' + fullName + '</td>' +
        '<td class="leaderboard-wallet-cell" title="' + escapeHtml(row.wallet) + '">' + escapeHtml(shortWallet(row.wallet)) + '</td>' +
        '<td class="leaderboard-wave-cell">' + escapeHtml(String(row.best_wave)) + '</td>' +
        '<td class="leaderboard-runs-cell">' + escapeHtml(String(row.runs)) + '</td>' +
        '<td class="leaderboard-burn-cell">' + escapeHtml(String(Math.round(Number(row.dfk_gold_burned) || 0).toLocaleString())) + '</td>' +
        '<td class="leaderboard-nft-cell ' + (nftUsed ? 'is-yes' : 'is-no') + '">' + (nftUsed ? 'Yes' : 'No') + '</td>' +
        (showRaffle ? ('<td class="leaderboard-nft-cell is-yes">Qualified</td>') : '') +
      '</tr>';
    }).join('');
  }

  function updateHeaderSortIndicators() {
    var sort = getCurrentSort();
    var headers = document.querySelectorAll('.leaderboard-sortable');
    headers.forEach(function (header) {
      var key = header.getAttribute('data-sort') || '';
      var active = key === sort.key;
      header.classList.toggle('is-active', active);
      header.setAttribute('aria-sort', active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
      var chevron = header.querySelector('.leaderboard-sort-chevron');
      if (chevron) chevron.textContent = active ? (sort.direction === 'asc' ? '▴' : '▾') : '';
    });
  }

  function updatePeriodButtons() {
    var range = getCurrentRangeRequest();
    var currentBtn = el('leaderboardCurrentWeekBtn');
    var lastBtn = el('leaderboardLastWeekBtn');
    var dayBtn = el('leaderboardCurrentDayBtn');
    var avaxDayBtn = el('leaderboardAvaxRaffleBtn');
    if (currentBtn) currentBtn.classList.toggle('active', range.mode === RANGE_MODES.current_week);
    if (lastBtn) lastBtn.classList.toggle('active', range.mode === RANGE_MODES.last_week);
    if (dayBtn) dayBtn.classList.toggle('active', range.mode === RANGE_MODES.current_day);
    if (avaxDayBtn) avaxDayBtn.classList.toggle('active', range.mode === RANGE_MODES.current_day_avax);
  }

  function updateDailyRaffleUi(meta) {
    var header = el('leaderboardRaffleHeader');
    var title = document.querySelector('.leaderboard-title');
    var resetCopy = document.querySelector('.leaderboard-reset-copy');
    var rangeCopy = el('leaderboardRangeCopy');
    var showRaffle = isDailyRaffleMode();
    var flyout = el('leaderboardFlyout');
    if (flyout) flyout.classList.toggle('leaderboard-flyout-daily', !!showRaffle);
    if (header) header.classList.toggle('hidden', !showRaffle);
    if (title) title.textContent = showRaffle ? 'Daily Raffle Leaderboard' : 'Leaderboard';
    if (resetCopy) {
      resetCopy.textContent = showRaffle
        ? 'Tracks the last 24 hours on a rolling basis. Players qualify for the daily raffle with a tracked run that reaches wave 30+ during the last 24 hours.'
        : 'Resets every Monday at 00:00 UTC. Weekly scores run through Sunday at 23:59 UTC.';
    }
    if (rangeCopy) {
      rangeCopy.textContent = showRaffle
        ? 'Shows only players with qualifying tracked activity in the last 24 hours. Qualification is a tracked wave 30+ run completed during the last 24 hours.'
        : 'Search a date range for the highest scores in that window. Daily raffle qualification is a tracked wave 30+ run completed during the last 24 hours.';
    }
  }

  function updateRangeInputs() {
    var range = getCurrentRangeRequest();
    var startInput = el('leaderboardStartDate');
    var endInput = el('leaderboardEndDate');
    if (startInput && range.start) startInput.value = range.start;
    if (endInput && range.end) endInput.value = range.end;
  }

  function updateRangeDisplay(meta) {
    var display = el('leaderboardRangeDisplay');
    if (!display) return;
    var selected = meta && meta.selected_range ? meta.selected_range : null;
    if (isDailyRaffleMode()) {
      var today = getCurrentUtcDateOnly();
      display.textContent = getCurrentRaffleLabel() + ' window: last 24 hours';
      return;
    }
    if (!selected) {
      display.textContent = 'Week of —';
      return;
    }
    var label = formatRangeLabel(selected.start, selected.end);
    if (selected.label) label = selected.label + ': ' + label;
    display.textContent = label;
  }

  function buildLeaderboardParams() {
    var range = getCurrentRangeRequest();
    if (range.mode === RANGE_MODES.current_day || range.mode === RANGE_MODES.current_day_avax) {
      return { preset: 'current_day', raffleType: getCurrentRaffleType() };
    }
    if (range.mode === RANGE_MODES.custom) {
      return { start: range.start, end: range.end, mode: range.mode };
    }
    return { preset: range.mode };
  }

  async function loadLeaderboardRows() {
    var cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey) {
      throw new Error('Missing Supabase URL or publishable key.');
    }
    var response = await fetchFunctionJson(cfg.url, cfg.anonKey, 'public-leaderboard', buildLeaderboardParams());
    var rows = [];
    if (Array.isArray(response)) rows = response;
    else if (response && Array.isArray(response.rows)) rows = response.rows;
    return {
      rows: rows.map(normalizeRow),
      meta: response && response.meta ? response.meta : null
    };
  }

  async function refreshLeaderboard(options) {
    var status = el('leaderboardStatus');
    var refreshBtn = el('leaderboardRefreshBtn');
    if (status) {
      status.textContent = (options && options.silent) ? 'Refreshing…' : 'Loading leaderboard…';
      status.classList.remove('error');
    }
    if (refreshBtn) refreshBtn.disabled = true;
    try {
      var payload = await loadLeaderboardRows();
      if (isDailyRaffleMode()) {
        var raffleType = getCurrentRaffleType();
        payload.rows = (payload.rows || []).filter(function (row) {
          return !!(row && row.raffle_qualified && (!row.raffle_chain || row.raffle_chain === raffleType));
        });
      }
      window.DFKLeaderboardRows = payload.rows;
      window.DFKLeaderboardMeta = payload.meta || null;
      if (payload.meta && payload.meta.selected_range) {
        var selectedRange = payload.meta.selected_range;
        var rangeRequest = getCurrentRangeRequest();
        rangeRequest.start = normalizeDateInputValue(selectedRange.start);
        rangeRequest.end = normalizeDateInputValue(selectedRange.end);
        window.DFKLeaderboardRangeRequest = rangeRequest;
      }
      renderRows(payload.rows);
      updateHeaderSortIndicators();
      updatePeriodButtons();
      updateRangeInputs();
      updateDailyRaffleUi(payload.meta);
      updateRangeDisplay(payload.meta);
      if (status) status.textContent = payload.rows.length ? '' : 'No players on the board yet for this range.';
    } catch (error) {
      if (status) {
        status.textContent = 'Leaderboard load failed. ' + (error && error.message ? error.message : '');
        status.classList.add('error');
      }
      renderRows([]);
      updateHeaderSortIndicators();
      updateDailyRaffleUi(null);
      console.error('[leaderboard-flyout] load failed', error);
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function setOpenState(open) {
    var flyout = el('leaderboardFlyout');
    var backdrop = el('leaderboardBackdrop');
    var btn = el('leaderboardFlyoutBtn');
    if (!flyout || !backdrop || !btn) return;
    flyout.classList.toggle('open', !!open);
    backdrop.classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('leaderboard-open', !!open);
    if (open) refreshLeaderboard({ silent: true });
  }

  function setSort(key) {
    var current = getCurrentSort();
    if (current.key === key) {
      current.direction = current.direction === 'asc' ? 'desc' : 'asc';
    } else {
      current.key = key;
      current.direction = (key === 'player_name' || key === 'wallet') ? 'asc' : 'desc';
    }
    window.DFKLeaderboardSort = current;
    updateHeaderSortIndicators();
    renderRows(window.DFKLeaderboardRows || []);
  }

  function setRange(mode, start, end) {
    window.DFKLeaderboardRangeRequest = {
      mode: mode,
      start: normalizeDateInputValue(start),
      end: normalizeDateInputValue(end)
    };
    updatePeriodButtons();
    updateRangeInputs();
  }

  function applyCustomRange() {
    var startInput = el('leaderboardStartDate');
    var endInput = el('leaderboardEndDate');
    var startValue = normalizeDateInputValue(startInput && startInput.value);
    var endValue = normalizeDateInputValue(endInput && endInput.value);
    var status = el('leaderboardStatus');
    if (!startValue || !endValue) {
      if (status) {
        status.textContent = 'Choose both a start and end date.';
        status.classList.add('error');
      }
      return;
    }
    var startDate = parseDateOnlyToUtc(startValue);
    var endDate = parseDateOnlyToUtc(endValue);
    if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
      if (status) {
        status.textContent = 'Start date must be on or before end date.';
        status.classList.add('error');
      }
      return;
    }
    if (status) status.classList.remove('error');
    setRange(RANGE_MODES.custom, startValue, endValue);
    refreshLeaderboard();
  }

  function bindEvents() {
    var openBtn = el('leaderboardFlyoutBtn');
    var closeBtn = el('leaderboardCloseBtn');
    var backdrop = el('leaderboardBackdrop');
    var refreshBtn = el('leaderboardRefreshBtn');
    var currentWeekBtn = el('leaderboardCurrentWeekBtn');
    var lastWeekBtn = el('leaderboardLastWeekBtn');
    var currentDayBtn = el('leaderboardCurrentDayBtn');
    var avaxRaffleBtn = el('leaderboardAvaxRaffleBtn');
    var applyRangeBtn = el('leaderboardApplyRangeBtn');

    if (openBtn) openBtn.addEventListener('click', function () { setOpenState(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpenState(false); });
    if (backdrop) backdrop.addEventListener('click', function () { setOpenState(false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpenState(false);
    });

    if (refreshBtn) refreshBtn.addEventListener('click', function () { refreshLeaderboard(); });
    if (currentWeekBtn) currentWeekBtn.addEventListener('click', function () {
      setRange(RANGE_MODES.current_week, '', '');
      refreshLeaderboard();
    });
    if (lastWeekBtn) lastWeekBtn.addEventListener('click', function () {
      setRange(RANGE_MODES.last_week, '', '');
      refreshLeaderboard();
    });
    if (currentDayBtn) currentDayBtn.addEventListener('click', function () {
      var today = getCurrentUtcDateOnly();
      setRange(RANGE_MODES.current_day, today, today);
      refreshLeaderboard();
    });
    if (avaxRaffleBtn) avaxRaffleBtn.addEventListener('click', function () {
      var today = getCurrentUtcDateOnly();
      setRange(RANGE_MODES.current_day_avax, today, today);
      refreshLeaderboard();
    });
    if (applyRangeBtn) applyRangeBtn.addEventListener('click', applyCustomRange);

    document.querySelectorAll('.leaderboard-sortable').forEach(function (header) {
      var key = header.getAttribute('data-sort');
      if (!key) return;
      header.addEventListener('click', function () { setSort(key); });
      header.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setSort(key);
        }
      });
    });

    window.addEventListener('dfk:leaderboard-refresh-requested', function () {
      refreshLeaderboard({ silent: true });
    });
  }

  function initDefaultRange() {
    var meta = window.DFKLeaderboardMeta && window.DFKLeaderboardMeta.current_week ? window.DFKLeaderboardMeta.current_week : null;
    if (meta && meta.start && meta.end) {
      setRange(RANGE_MODES.current_week, formatDateOnlyUtc(new Date(meta.start)), formatDateOnlyUtc(new Date(meta.end)));
      return;
    }
    setRange(RANGE_MODES.current_week, '', '');
  }

  function init() {
    window.DFKLeaderboardRows = [];
    window.DFKLeaderboardMeta = null;
    window.DFKLeaderboardSort = { key: DEFAULT_SORT.key, direction: DEFAULT_SORT.direction };
    initDefaultRange();
    bindEvents();
    updateHeaderSortIndicators();
    updateDailyRaffleUi(null);
    refreshLeaderboard({ silent: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
