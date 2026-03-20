(() => {
  'use strict';

  function applyRunLogState(collapsed) {
    const active = !!collapsed;
    document.body.classList.toggle('runlog-collapsed', active);
    const btn = document.getElementById('runLogToggleBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', active ? 'Open run log' : 'Collapse run log');
      btn.setAttribute('title', active ? 'Open run log' : 'Collapse run log');
      btn.textContent = active ? '◂' : '▸';
    }
    try { localStorage.setItem('dfkRunLogCollapsed', active ? '1' : '0'); } catch (e) {}
  }

  window.DFKToggleRunLog = function(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    applyRunLogState(!document.body.classList.contains('runlog-collapsed'));
    return false;
  };

  function initRunLogFixes() {
    const btn = document.getElementById('runLogToggleBtn');
    if (btn) {
      btn.onclick = window.DFKToggleRunLog;
      let saved = false;
      try { saved = localStorage.getItem('dfkRunLogCollapsed') === '1'; } catch (e) {}
      applyRunLogState(saved);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRunLogFixes);
  } else {
    initRunLogFixes();
  }
})();
