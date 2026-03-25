(() => {
  'use strict';

  const CONFIG = Object.freeze({
    chainId: 53935,
    chainHex: '0xd2af',
    chainName: 'DFK Chain',
    rpcUrls: ['https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc'],
    blockExplorerUrls: ['https://subnets.avax.network/defi-kingdoms/'],
    nativeCurrency: { name: 'JEWEL', symbol: 'JEWEL', decimals: 18 },
    supabaseUrl: window.DFK_SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '',
    supabaseAnonKey: window.DFK_SUPABASE_PUBLISHABLE_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '',
    resolveProfileFunction: window.DFK_SUPABASE_RESOLVE_PROFILE_FUNCTION || 'resolve-profile-name',
  });

  const CONTRACTS = Object.freeze({
    dfkProfiles: '0xC4cD8C09D1A90b21Be417be91A81603B03993E81',
  });

  const state = {
    providers: [],
    selectedProvider: null,
    providerInfo: null,
    address: null,
    balance: null,
    profileName: null,
    vanityName: null,
    user: null,
    mode: 'local',
    depositAddress: null,
    initialized: false,
  };

  const ui = {};
  let providerListenerInstalled = false;
  let discoveryPromise = null;

  function qs(id) { return document.getElementById(id); }
  function shortAddress(address) {
    if (!address) return 'No wallet connected.';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }
  function setText(el, text) { if (el) el.textContent = text; }
  function emitWalletState() {
    window.dispatchEvent(new CustomEvent('dfk-defense:wallet-state', {
      detail: {
        address: state.address,
        profileName: state.vanityName || state.profileName,
        vanityName: state.vanityName,
        balance: state.balance,
        providerName: providerLabel(state.providerInfo),
      },
    }));
  }
  function setHtml(el, text) { if (el) el.innerHTML = text; }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }

  function formatJewelBalance(rawBalance) {
    const value = Number(rawBalance || 0);
    if (!Number.isFinite(value)) return '--';
    if (value >= 1000) return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} JEWEL`;
    if (value >= 10) return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} JEWEL`;
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })} JEWEL`;
  }

  function formatEtherFromHex(hexValue) {
    try {
      const wei = BigInt(hexValue || '0x0');
      const whole = wei / (10n ** 18n);
      const fraction = wei % (10n ** 18n);
      const fractionText = fraction.toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
      return Number(fractionText ? `${whole}.${fractionText}` : `${whole}`);
    } catch (error) {
      return null;
    }
  }

  async function fetchNativeBalance(address) {
    if (!state.selectedProvider || !address) return null;
    const hexBalance = await request(state.selectedProvider, 'eth_getBalance', [address, 'latest']);
    const parsed = formatEtherFromHex(hexBalance);
    return parsed == null ? null : { balance: parsed };
  }

  async function resolveProfileNameViaFunction(address) {
    if (!address || !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) return null;
    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.resolveProfileFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabaseAnonKey,
        },
        body: JSON.stringify({ address }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return null;
      const name = payload && payload.name ? String(payload.name).trim() : '';
      return name || null;
    } catch (error) {
      return null;
    }
  }

  async function fetchProfileNameFromChain(address) {
    return resolveProfileNameViaFunction(address);
  }

  async function fetchProfileName(address) {
    if (!address) return null;
    return await fetchProfileNameFromChain(address);
  }

  async function refreshWalletDetails() {
    if (!state.address) {
      state.balance = null;
      state.profileName = null;
      render();
      emitWalletState();
      return null;
    }
    try {
      const [balance, profileName] = await Promise.all([
        fetchNativeBalance(state.address),
        fetchProfileName(state.address),
      ]);
      state.balance = balance;
      state.profileName = profileName;
      render();
      emitWalletState();
      return { balance, profileName };
    } catch (error) {
      render();
      return null;
    }
  }

  function providerLabel(info) {
    if (!info) return 'wallet';
    if ((info.name || '').trim()) return info.name;
    const rdns = String(info.rdns || '').toLowerCase();
    if (rdns.includes('rabby')) return 'Rabby';
    if (rdns.includes('metamask')) return 'MetaMask';
    return 'wallet';
  }

  function matchesProvider(entry, kind) {
    if (!entry) return false;
    const info = entry.info || {};
    const provider = entry.provider || {};
    const rdns = String(info.rdns || '').toLowerCase();
    const name = String(info.name || '').toLowerCase();
    if (kind === 'rabby') return rdns.includes('rabby') || name.includes('rabby') || provider.isRabby === true;
    if (kind === 'metamask') return rdns.includes('metamask') || name.includes('metamask') || provider.isMetaMask === true;
    return false;
  }

  function announceHandler(event) {
    const detail = event && event.detail;
    if (!detail || !detail.provider || !detail.info) return;
    const exists = state.providers.some((entry) => entry.info && detail.info && entry.info.uuid === detail.info.uuid);
    if (!exists) state.providers.push(detail);
    if (!state.selectedProvider) {
      state.selectedProvider = detail.provider;
      state.providerInfo = detail.info;
    }
    render();
    emitWalletState();
  }

  function addLegacyProvider(provider, uuidHint) {
    if (!provider) return;
    const info = {
      uuid: uuidHint || `legacy-${provider.isRabby ? 'rabby' : provider.isMetaMask ? 'metamask' : 'injected'}`,
      name: provider.isRabby ? 'Rabby' : (provider.isMetaMask ? 'MetaMask' : 'Injected Wallet'),
      rdns: provider.isRabby ? 'io.rabby' : (provider.isMetaMask ? 'io.metamask' : 'legacy.injected'),
      icon: '',
    };
    const exists = state.providers.some((entry) => entry.info && entry.info.uuid === info.uuid);
    if (!exists) state.providers.push({ info, provider });
    if (!state.selectedProvider) {
      state.selectedProvider = provider;
      state.providerInfo = info;
    }
  }

  function collectProviders() {
    if (!providerListenerInstalled) {
      window.addEventListener('eip6963:announceProvider', announceHandler);
      providerListenerInstalled = true;
    }

    if (window.ethereum && Array.isArray(window.ethereum.providers) && window.ethereum.providers.length) {
      window.ethereum.providers.forEach((provider, index) => addLegacyProvider(provider, `legacy-provider-${index}`));
    } else if (window.ethereum) {
      addLegacyProvider(window.ethereum, 'legacy-window-ethereum');
    }

    window.dispatchEvent(new Event('eip6963:requestProvider'));
    setTimeout(render, 250);
  }

  async function discoverProviders(waitMs = 900) {
    if (state.providers.length) return state.providers;
    if (discoveryPromise) return discoveryPromise;
    discoveryPromise = new Promise((resolve) => {
      collectProviders();
      window.setTimeout(() => {
        discoveryPromise = null;
        resolve(state.providers);
      }, waitMs);
    });
    return discoveryPromise;
  }

  async function request(provider, method, params) {
    return provider.request({ method, params });
  }

  async function ensureChain(provider) {
    const chainIdHex = await request(provider, 'eth_chainId');
    if (chainIdHex === CONFIG.chainHex) return true;
    try {
      await request(provider, 'wallet_switchEthereumChain', [{ chainId: CONFIG.chainHex }]);
      return true;
    } catch (switchError) {
      if (switchError && switchError.code === 4902) {
        await request(provider, 'wallet_addEthereumChain', [{
          chainId: CONFIG.chainHex,
          chainName: CONFIG.chainName,
          rpcUrls: CONFIG.rpcUrls,
          blockExplorerUrls: CONFIG.blockExplorerUrls,
          nativeCurrency: CONFIG.nativeCurrency,
        }]);
        return true;
      }
      throw switchError;
    }
  }

  async function connectWallet() {
    if (!state.providers.length) await discoverProviders();
    const chosen = chooseProvider();
    if (!chosen) throw new Error('No supported wallet found. Refresh the page and make sure MetaMask or Rabby is enabled for this site.');
    state.selectedProvider = chosen.provider;
    state.providerInfo = chosen.info;
    await ensureChain(chosen.provider);
    const accounts = await request(chosen.provider, 'eth_requestAccounts');
    state.address = accounts && accounts[0] ? accounts[0] : null;
    bindProviderEvents(chosen.provider);
    render();
    emitWalletState();
    await refreshWalletDetails();
    return state.address;
  }

  function chooseProvider() {
    if (!state.providers.length) return null;
    const rabby = state.providers.find((entry) => matchesProvider(entry, 'rabby'));
    const metamask = state.providers.find((entry) => matchesProvider(entry, 'metamask'));
    return rabby || metamask || state.providers[0];
  }

  let boundProvider = null;
  function bindProviderEvents(provider) {
    if (!provider || boundProvider === provider) return;
    boundProvider = provider;
    if (typeof provider.on === 'function') {
      provider.on('accountsChanged', (accounts) => {
        state.address = accounts && accounts[0] ? accounts[0] : null;
        if (!state.address) {
          state.user = null;
          state.mode = 'local';
          state.balance = null;
          state.profileName = null;
          render();
          emitWalletState();
          return;
        }
        render();
        emitWalletState();
        refreshWalletDetails();
      });
      provider.on('chainChanged', () => { render(); emitWalletState(); refreshWalletDetails(); });
      provider.on('disconnect', () => {
        state.address = null;
        state.user = null;
        state.mode = 'local';
        state.balance = null;
        state.profileName = null;
        render();
        emitWalletState();
      });
    }
  }

  async function signIn() {
    const message = 'Sign in was removed in this wallet-only build.';
    renderInfo(message);
    return { ok: false, mode: 'wallet-only', message };
  }

  async function refreshBank() {
    if (!state.address) {
      state.balance = null;
      render();
      emitWalletState();
      return null;
    }
    const balance = await fetchNativeBalance(state.address);
    state.balance = balance;
    render();
    emitWalletState();
    return balance;
  }

  async function depositJewel() {
    const message = 'Deposit JEWEL is disabled in this wallet-only build.';
    renderInfo(message);
    return null;
  }

  async function disconnectWallet() {
    state.address = null;
    state.balance = null;
    state.profileName = null;
    state.user = null;
    state.mode = 'local';
    render();
  }

  function renderInfo(message) {
    setText(ui.walletStatus, message);
    if (ui.walletStatus) ui.walletStatus.className = 'wallet-status wallet-good';
  }

  function renderError(error) {
    setText(ui.walletStatus, error && error.message ? error.message : 'Wallet action failed.');
    if (ui.walletStatus) ui.walletStatus.className = 'wallet-status wallet-bad';
  }

  function render() {
    if (!ui.walletStatus) return;
    const providerName = providerLabel(state.providerInfo);
    setText(ui.walletAddress, state.address ? `${providerName}: ${shortAddress(state.address)}` : 'No wallet connected.');
    setText(ui.walletProfileName, `${state.vanityName ? 'Vanity Name' : 'In-game Name'}: ${(state.vanityName || state.profileName || '--')}`);
    setText(ui.walletJewelBalance, `Wallet JEWEL: ${state.balance && state.balance.balance != null ? formatJewelBalance(state.balance.balance) : '--'}`);
    setText(ui.walletPanelTitle, 'Player Profile');
    if (state.address) {
      setText(ui.walletStatus, `${providerName} Connected`);
      ui.walletStatus.className = 'wallet-status wallet-good';
    } else {
      setText(ui.walletStatus, state.providers.length ? 'Wallet available.' : 'Offline');
      ui.walletStatus.className = 'wallet-status wallet-warn';
    }
    if (ui.disconnectWalletBtn) ui.disconnectWalletBtn.disabled = !state.address;
    if (ui.walletVanitySection) {
      const showVanity = !!state.address;
      ui.walletVanitySection.classList.toggle('hidden', !showVanity);
      ui.walletVanitySection.setAttribute('aria-hidden', showVanity ? 'false' : 'true');
    }
  }

  function bindUi() {
    Object.assign(ui, {
      walletStatus: qs('walletStatus'),
      walletPanelTitle: qs('walletPanelTitle'),
      walletProfileName: qs('walletProfileName'),
      walletJewelBalance: qs('walletJewelBalance'),
      walletAddress: qs('walletAddress'),
      connectWalletBtn: qs('connectWalletBtn'),
      disconnectWalletBtn: qs('disconnectWalletBtn'),
      enableTrackingBtn: qs('enableTrackingBtn'),
      walletVanitySection: qs('walletVanitySection'),
    });
    if (ui.connectWalletBtn) ui.connectWalletBtn.addEventListener('click', () => connectWallet().catch(renderError));
    if (ui.disconnectWalletBtn) ui.disconnectWalletBtn.addEventListener('click', () => disconnectWallet().catch(renderError));
    // Run-tracker owns the enable/disable tracking button to avoid duplicate auth requests.
  }

  async function init() {
    if (state.initialized) return;
    state.initialized = true;
    bindUi();
    collectProviders();
    render();
  }

  window.DFKDefenseWallet = {
    init,
    connectWallet,
    signIn,
    refreshBank,
    depositJewel,
    disconnectWallet,
    getState: () => ({ ...state }),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
