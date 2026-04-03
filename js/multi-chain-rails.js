(() => {
  'use strict';
  const DFK_CHAIN_ID = 53935;
  const AVAX_CHAIN_ID = Number(window.DFK_AVAX_CHAIN_ID || 43114);
  function qs(id) { return document.getElementById(id); }
  function getWalletState() {
    return window.DFKDefenseWallet && typeof window.DFKDefenseWallet.getState === 'function'
      ? window.DFKDefenseWallet.getState()
      : null;
  }
  function getChainId() {
    const state = getWalletState();
    return Number(state && state.activeChainId ? state.activeChainId : 0) || 0;
  }
  function isAvaxChain() { return getChainId() === AVAX_CHAIN_ID; }
  function isDfkChain() { return getChainId() === DFK_CHAIN_ID; }
  function renderBankMode() {
    const chainId = getChainId();
    const title = qs('bankPanelTitle');
    const jewelSection = qs('jewelBankSection');
    const avaxSection = qs('avaxRailsSection');
    if (title) title.textContent = chainId === AVAX_CHAIN_ID ? 'AVAX Rails' : 'Jewel Bank';
    if (jewelSection) jewelSection.classList.toggle('hidden', chainId === AVAX_CHAIN_ID);
    if (avaxSection) avaxSection.classList.toggle('hidden', chainId !== AVAX_CHAIN_ID);
  }
  function init() {
    renderBankMode();
    window.addEventListener('dfk-defense:wallet-state', renderBankMode);
    window.addEventListener('dfk-defense:tracking-state', renderBankMode);
  }
  window.DFKChainRails = { getChainId, isAvaxChain, isDfkChain, renderBankMode };
  document.addEventListener('DOMContentLoaded', init);
})();
