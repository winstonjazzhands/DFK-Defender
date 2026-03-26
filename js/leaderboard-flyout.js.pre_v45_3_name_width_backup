(function () {
  'use strict';

  var SORTS = {
    best_wave: function (a, b) {
      return (Number(b.best_wave) || 0) - (Number(a.best_wave) || 0)
        || (Number(b.runs) || 0) - (Number(a.runs) || 0)
        || String(a.player_name || '').localeCompare(String(b.player_name || ''));
    },
    runs: function (a, b) {
      return (Number(b.runs) || 0) - (Number(a.runs) || 0)
        || (Number(b.best_wave) || 0) - (Number(a.best_wave) || 0)
        || String(a.player_name || '').localeCompare(String(b.player_name || ''));
    }
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

  async function fetchFromEndpoint(baseUrl, anonKey, endpoint, select) {
    var url = baseUrl.replace(/\/$/, '') + '/rest/v1/' + endpoint + '?select=' + encodeURIComponent(select);
    var response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: 'Bearer ' + anonKey,
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      var errorText = '';
      try { errorText = await response.text(); } catch (e) {}
      throw new Error(endpoint + ': ' + response.status + ' ' + (errorText || response.statusText || 'Request failed'));
    }
    return response.json();
  }

  function normalizeRow(row) {
    var playerName = row.vanity_name || row.player_name || row.display_name || row.name || row.username || 'Unknown Player';
    var wallet = row.wallet || row.wallet_address || row.address || row.player_wallet || '';
    var score = row.score;
    if (score == null && row.total_waves_cleared != null) score = row.total_waves_cleared;
    if (score == null && row.points != null) score = row.points;
    return {
      player_name: playerName,
      vanity_name: row.vanity_name || null,
      wallet: wallet,
      score: score == null ? '—' : score,
      best_wave: row.best_wave != null ? row.best_wave : (row.wave_reached != null ? row.wave_reached : 0),
      runs: row.runs != null ? row.runs : (row.total_runs != null ? row.total_runs : 0)
    };
  }

  async function loadLeaderboardRows() {
    var cfg = getSupabaseConfig();
    if (!cfg.url || !cfg.anonKey) {
      throw new Error('Missing Supabase URL or publishable key.');
    }

    var attempts = [
      { endpoint: 'players', select: 'wallet_address,vanity_name,display_name,best_wave,total_runs,total_waves_cleared' },
      { endpoint: 'public_run_leaderboard', select: '*' },
      { endpoint: 'leaderboard', select: 'player_name,wallet,score,best_wave,runs' }
    ];

    var errors = [];
    for (var i = 0; i < attempts.length; i += 1) {
      try {
        var rows = await fetchFromEndpoint(cfg.url, cfg.anonKey, attempts[i].endpoint, attempts[i].select);
        if (Array.isArray(rows) && rows.length) {
          return rows.map(normalizeRow);
        }
        if (Array.isArray(rows)) {
          return [];
        }
      } catch (error) {
        errors.push(error.message || String(error));
      }
    }

    throw new Error(errors[0] || 'Unable to load leaderboard data.');
  }

  function syncFlyoutSizing(rows) {
    var flyout = el('leaderboardFlyout');
    if (!flyout) return;
    var needsWide = Array.isArray(rows) && rows.some(function (row) {
      return String(row && row.player_name || '').length > 18;
    });
    flyout.classList.toggle('leaderboard-flyout-wide', !!needsWide);
  }

  function truncateName(value) {
    var name = String(value || '');
    if (name.length <= 18) return name;
    return name.slice(0, 15) + '…';
  }

  function renderRows(rows, sortKey) {
    var tbody = el('leaderboardTableBody');
    if (!tbody) return;
    var items = rows.slice().sort(SORTS[sortKey] || SORTS.best_wave);
    syncFlyoutSizing(items);
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="leaderboard-empty">No leaderboard data found yet.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (row, index) {
      var fullName = escapeHtml(row.player_name);
      var shownName = escapeHtml(truncateName(row.player_name));
      return '<tr>' +
        '<td class="leaderboard-rank">' + (index + 1) + '</td>' +
        '<td class="leaderboard-name-cell" title="' + fullName + '">' + shownName + '</td>' +
        '<td class="leaderboard-wallet-cell" title="' + escapeHtml(row.wallet) + '">' + escapeHtml(shortWallet(row.wallet)) + '</td>' +
        '<td class="leaderboard-wave-cell">' + escapeHtml(String(row.best_wave)) + '</td>' +
        '<td class="leaderboard-runs-cell">' + escapeHtml(String(row.runs)) + '</td>' +
      '</tr>';
    }).join('');
  }

  function updateSortButtons(sortKey) {
    var byWave = el('leaderboardSortWave');
    var byRuns = el('leaderboardSortRuns');
    if (byWave) byWave.classList.toggle('active', sortKey === 'best_wave');
    if (byRuns) byRuns.classList.toggle('active', sortKey === 'runs');
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
      var rows = await loadLeaderboardRows();
      window.DFKLeaderboardRows = rows;
      var currentSort = window.DFKLeaderboardSort || 'best_wave';
      renderRows(rows, currentSort);
      updateSortButtons(currentSort);
      if (status) status.textContent = rows.length ? '' : 'No players on the board yet';
    } catch (error) {
      if (status) {
        status.textContent = 'Leaderboard load failed. ' + (error && error.message ? error.message : '');
        status.classList.add('error');
      }
      renderRows([], window.DFKLeaderboardSort || 'best_wave');
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
    if (open) {
      refreshLeaderboard({ silent: true });
    }
  }

  function bindEvents() {
    var openBtn = el('leaderboardFlyoutBtn');
    var closeBtn = el('leaderboardCloseBtn');
    var backdrop = el('leaderboardBackdrop');
    var sortWave = el('leaderboardSortWave');
    var sortRuns = el('leaderboardSortRuns');
    var refreshBtn = el('leaderboardRefreshBtn');

    if (openBtn) openBtn.addEventListener('click', function () { setOpenState(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setOpenState(false); });
    if (backdrop) backdrop.addEventListener('click', function () { setOpenState(false); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpenState(false);
    });

    if (sortWave) sortWave.addEventListener('click', function () {
      window.DFKLeaderboardSort = 'best_wave';
      updateSortButtons('best_wave');
      renderRows(window.DFKLeaderboardRows || [], 'best_wave');
    });

    if (sortRuns) sortRuns.addEventListener('click', function () {
      window.DFKLeaderboardSort = 'runs';
      updateSortButtons('runs');
      renderRows(window.DFKLeaderboardRows || [], 'runs');
    });

    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      refreshLeaderboard();
    });

    window.addEventListener('dfk:leaderboard-refresh-requested', function () {
      refreshLeaderboard({ silent: true });
    });
  }

  function init() {
    window.DFKLeaderboardRows = [];
    window.DFKLeaderboardSort = 'best_wave';
    bindEvents();
    refreshLeaderboard({ silent: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
