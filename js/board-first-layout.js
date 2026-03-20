(() => {
  'use strict';

  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

  function measureBlocks(){
    const footer = document.querySelector('.center-panel .bottom-panel');
    const status = document.getElementById('statusOverlay');
    const banner = document.getElementById('banner');
    const mobileBottom = document.getElementById('mobileBottomBar');
    const mobileInstall = document.getElementById('mobileInstallPrompt');

    return {
      footer: footer ? footer.offsetHeight : 220,
      status: status && !status.classList.contains('hidden') ? status.offsetHeight : 48,
      banner: banner && !banner.classList.contains('hidden') ? banner.offsetHeight : 0,
      mobileBottom: mobileBottom && !mobileBottom.classList.contains('hidden') ? mobileBottom.offsetHeight : 72,
      mobileInstall: mobileInstall && !mobileInstall.classList.contains('hidden') ? mobileInstall.offsetHeight : 0,
    };
  }

  function getDesktopSideWidths(vw){
    const collapsed = document.body.classList.contains('runlog-collapsed');
    return {
      left: collapsed ? 44 : clamp(vw * 0.165, 180, 300),
      right: clamp(vw * 0.16, 220, 280),
    };
  }

  function setDesktopColumns(){
    const vw = window.innerWidth;
    const side = getDesktopSideWidths(vw);
    const root = document.documentElement;
    root.style.setProperty('--desktop-left-panel', `${Math.round(side.left)}px`);
    root.style.setProperty('--desktop-right-panel', `${Math.round(side.right)}px`);
  }

  function setDesktopBoardSize(){
    const root = document.documentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const side = getDesktopSideWidths(vw);
    const blocks = measureBlocks();

    const appPad = 42;
    const colGaps = 24;
    const tileGap = vw < 1400 ? 5 : 6;

    const centerWidth = Math.max(420, vw - side.left - side.right - appPad - colGaps);
    const availableHeight = Math.max(120, vh - blocks.footer - blocks.status - blocks.banner - 42);

    const widthBased = (centerWidth - tileGap * 13) / 14;
    const heightBased = (availableHeight - tileGap * 5) / 6;
    const tile = clamp(Math.floor(Math.min(widthBased, heightBased)), 20, 84);

    root.style.setProperty('--tile-gap', `${tileGap}px`);
    root.style.setProperty('--tile-size', `${tile}px`);
  }

  function setMobileBoardSize(){
    const root = document.documentElement;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const blocks = measureBlocks();
    const tileGap = vw < 430 ? 3 : 4;

    const availableWidth = Math.max(300, vw - 84);
    const availableHeight = Math.max(120, vh - blocks.mobileBottom - blocks.mobileInstall - blocks.status - blocks.banner - 24);

    const widthBased = (availableWidth - tileGap * 13) / 14;
    const heightBased = (availableHeight - tileGap * 5) / 6;
    const tile = clamp(Math.floor(Math.min(widthBased, heightBased)), 22, 72);

    root.style.setProperty('--tile-gap', `${tileGap}px`);
    root.style.setProperty('--tile-size', `${tile}px`);
  }

  function syncBoardLayout(){
    if (window.innerWidth <= 1024){
      setMobileBoardSize();
    } else {
      setDesktopColumns();
      setDesktopBoardSize();
    }

    const grid = document.getElementById('grid');
    if (grid){
      grid.style.marginTop = '0';
      grid.style.marginBottom = '0';
      grid.style.transform = 'none';
      grid.style.zoom = '1';
    }
  }

  function applyRunLogState(collapsed){
    document.body.classList.toggle('runlog-collapsed', !!collapsed);
    const btn = document.getElementById('runLogToggleBtn');
    if (btn){
      btn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
      btn.setAttribute('aria-label', collapsed ? 'Open run log' : 'Collapse run log');
      btn.setAttribute('title', collapsed ? 'Open run log' : 'Collapse run log');
      btn.textContent = collapsed ? '◂' : '▸';
      btn.onclick = window.DFKToggleRunLog;
    }
    try { localStorage.setItem('dfkRunLogCollapsed', collapsed ? '1' : '0'); } catch(e){}
    syncBoardLayout();
  }

  window.DFKToggleRunLog = function(event){
    if (event){
      event.preventDefault();
      event.stopPropagation();
    }
    applyRunLogState(!document.body.classList.contains('runlog-collapsed'));
    return false;
  };

  function init(){
    let saved = false;
    try { saved = localStorage.getItem('dfkRunLogCollapsed') === '1'; } catch(e){}
    applyRunLogState(saved);

    const ro = new ResizeObserver(() => syncBoardLayout());
    const footer = document.querySelector('.center-panel .bottom-panel');
    const center = document.querySelector('.center-panel');
    const status = document.getElementById('statusOverlay');
    if (footer) ro.observe(footer);
    if (center) ro.observe(center);
    if (status) ro.observe(status);

    window.addEventListener('resize', syncBoardLayout, { passive: true });
    window.addEventListener('orientationchange', syncBoardLayout, { passive: true });
    window.addEventListener('load', syncBoardLayout, { passive: true });

    setTimeout(syncBoardLayout, 40);
    setTimeout(syncBoardLayout, 120);
    setTimeout(syncBoardLayout, 260);
    setTimeout(syncBoardLayout, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
