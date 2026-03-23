(() => {
  'use strict';

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function disableFileProtocolApiNoise() {
    if (window.location.protocol !== 'file:') return;
    try {
      if (window.DFKDefenseWallet && typeof window.DFKDefenseWallet.refreshBank === 'function') {
        window.DFKDefenseWallet.refreshBank = async () => null;
      }
      if (window.DFKDefenseWallet && typeof window.DFKDefenseWallet.depositJewel === 'function') {
        window.DFKDefenseWallet.depositJewel = async () => null;
      }
    } catch (e) {}
  }

  function forceDesktopLayout() {
    if (window.innerWidth <= 1024) return;

    const app = byId('app');
    const main = document.querySelector('.main-layout');
    const left = byId('runLogPanel');
    const center = document.querySelector('.center-panel');
    const right = document.querySelector('.right-panel');
    const banner = byId('banner');
    const footer = center ? center.querySelector('.bottom-panel') : null;
    const grid = byId('grid');
    const status = byId('statusOverlay');

    if (!app || !main || !center || !grid || !footer || !right) return;

    const collapsed = document.body.classList.contains('runlog-collapsed');
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const leftW = collapsed ? 44 : clamp(vw * 0.165, 180, 300);
    const rightW = clamp(vw * 0.16, 220, 280);

    document.documentElement.style.setProperty('--desktop-left-panel', `${Math.round(leftW)}px`);
    document.documentElement.style.setProperty('--desktop-right-panel', `${Math.round(rightW)}px`);

    app.style.width = '100%';
    app.style.maxWidth = 'none';
    app.style.height = '100dvh';
    app.style.overflow = 'hidden';
    app.style.padding = '10px 14px 10px';

    main.style.display = 'grid';
    main.style.gridTemplateColumns = `${Math.round(leftW)}px minmax(0,1fr) ${Math.round(rightW)}px`;
    main.style.gap = '12px';
    main.style.alignItems = 'start';
    main.style.height = 'calc(100dvh - 20px)';
    main.style.overflow = 'hidden';

    if (left) {
      left.style.gridColumn = '1';
      left.style.height = '100%';
      left.style.overflow = 'hidden';
    }

    right.style.gridColumn = '3';
    right.style.height = 'calc(100dvh - 20px)';
    right.style.maxHeight = 'calc(100dvh - 20px)';
    right.style.overflowY = 'auto';
    right.style.overflowX = 'hidden';
    right.style.position = 'sticky';
    right.style.top = '0';
    right.style.margin = '0';
    right.style.transform = 'none';

    center.style.gridColumn = '2';
    center.style.display = 'flex';
    center.style.flexDirection = 'column';
    center.style.alignItems = 'center';
    center.style.justifyContent = 'flexStart';
    center.style.gap = '6px';
    center.style.height = 'calc(100dvh - 20px)';
    center.style.minHeight = '0';
    center.style.overflow = 'hidden';
    center.style.padding = '0';
    center.style.background = 'transparent';
    center.style.borderColor = 'transparent';
    center.style.boxShadow = 'none';

    // Ensure exact DOM order
    if (banner) center.appendChild(banner);
    center.appendChild(footer);
    center.appendChild(grid);
    if (status) center.appendChild(status);

    if (banner) {
      banner.style.order = '1';
      banner.style.display = banner.classList.contains('hidden') ? 'none' : '';
      banner.style.margin = '0 auto';
      banner.style.flex = '0 0 auto';
    }

    footer.style.order = '2';
    footer.style.display = 'block';
    footer.style.margin = '0 auto 4px';
    footer.style.flex = '0 0 auto';

    grid.style.order = '3';
    grid.style.display = 'grid';
    grid.style.margin = '0 auto';
    grid.style.flex = '0 0 auto';
    grid.style.transform = 'none';
    grid.style.zoom = '1';
    grid.style.width = 'max-content';
    grid.style.maxWidth = '100%';
    grid.style.overflow = 'hidden';
    grid.style.visibility = 'visible';
    grid.style.opacity = '1';

    if (status) {
      status.style.order = '4';
      status.style.margin = '4px auto 0';
      status.style.flex = '0 0 auto';
      status.style.position = 'relative';
      status.style.left = 'auto';
      status.style.top = 'auto';
      status.style.bottom = 'auto';
      status.style.transform = 'none';
      status.style.width = 'max-content';
      status.style.maxWidth = 'calc(100% - 12px)';
    }

    const footerH = footer.offsetHeight || 220;
    const statusH = status && !status.classList.contains('hidden') ? status.offsetHeight : 46;
    const bannerH = banner && !banner.classList.contains('hidden') ? banner.offsetHeight : 0;
    const gap = vw < 1400 ? 5 : 6;

    const centerW = Math.max(360, vw - leftW - rightW - 42 - 24);
    const availableH = Math.max(120, vh - footerH - statusH - bannerH - 36);

    const widthBased = (centerW - gap * 13) / 14;
    const heightBased = (availableH - gap * 5) / 6;
    const tile = clamp(Math.floor(Math.min(widthBased, heightBased)), 18, 84);

    document.documentElement.style.setProperty('--tile-gap', `${gap}px`);
    document.documentElement.style.setProperty('--tile-size', `${tile}px`);

    footer.style.width = `min(calc(14 * var(--tile-size) + 13 * var(--tile-gap)), calc(100% - 8px))`;
    footer.style.maxWidth = 'calc(100% - 8px)';

    // make sure the grid is actually in view
    requestAnimationFrame(() => {
      const top = grid.getBoundingClientRect().top;
      if (top > vh - 120) {
        // fallback shrink more aggressively if still off-screen
        const tighter = clamp(tile - Math.ceil((top - (vh - 200)) / 8), 14, 84);
        document.documentElement.style.setProperty('--tile-size', `${tighter}px`);
      }
    });
  }

  function restoreMobile() {
    if (window.innerWidth > 1024) return;
    const app = byId('app');
    const main = document.querySelector('.main-layout');
    const center = document.querySelector('.center-panel');
    const grid = byId('grid');
    const footer = center ? center.querySelector('.bottom-panel') : null;

    if (app) {
      app.style.height = '';
      app.style.overflow = '';
      app.style.padding = '';
    }
    if (main) {
      main.style.display = '';
      main.style.gridTemplateColumns = '';
      main.style.height = '';
      main.style.overflow = '';
      main.style.gap = '';
    }
    if (center) {
      center.style.display = '';
      center.style.flexDirection = '';
      center.style.height = '';
      center.style.overflow = '';
      center.style.padding = '';
      center.style.background = '';
      center.style.borderColor = '';
      center.style.boxShadow = '';
      center.style.gap = '';
    }
    if (grid) {
      grid.style.display = '';
      grid.style.zoom = '';
      grid.style.transform = '';
      grid.style.width = '';
      grid.style.maxWidth = '';
      grid.style.visibility = '';
      grid.style.opacity = '';
    }
    if (footer) {
      footer.style.display = '';
      footer.style.width = '';
      footer.style.maxWidth = '';
    }
  }

  function syncAll() {
    disableFileProtocolApiNoise();
    if (window.innerWidth > 1024) forceDesktopLayout();
    else restoreMobile();
  }

  function init() {
    syncAll();
    window.addEventListener('resize', syncAll, { passive: true });
    window.addEventListener('orientationchange', syncAll, { passive: true });
    window.addEventListener('load', syncAll, { passive: true });

    const ro = new ResizeObserver(() => syncAll());
    const center = document.querySelector('.center-panel');
    const footer = center ? center.querySelector('.bottom-panel') : null;
    const status = byId('statusOverlay');
    if (center) ro.observe(center);
    if (footer) ro.observe(footer);
    if (status) ro.observe(status);

    setTimeout(syncAll, 60);
    setTimeout(syncAll, 180);
    setTimeout(syncAll, 400);
    setTimeout(syncAll, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
