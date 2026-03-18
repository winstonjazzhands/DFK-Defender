(() => {
  'use strict';

  const CONFIG = Object.freeze({
    apiBase: window.DFK_DEFENSE_API_BASE || '/api',
    chainId: 53935,
    chainHex: '0xd2af',
    chainName: 'DFK Chain',
    rpcUrls: ['https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc'],
    blockExplorerUrls: ['https://subnets.avax.network/defi-kingdoms/'],
    nativeCurrency: { name: 'JEWEL', symbol: 'JEWEL', decimals: 18 },
  });

  const state = {
    providers: [],
    selectedProvider: null,
    providerInfo: null,
    address: null,
    balance: null,
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
  function setHtml(el, text) { if (el) el.innerHTML = text; }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }

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
        }
        render();
      });
      provider.on('chainChanged', render);
      provider.on('disconnect', () => {
        state.address = null;
        state.user = null;
        state.mode = 'local';
        state.balance = null;
        render();
      });
    }
  }

  function cleanApiErrorMessage(text, fallback) {
    const stripped = String(text || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!stripped) return fallback;
    return stripped.length > 180 ? `${stripped.slice(0, 177)}...` : stripped;
  }

  async function fetchJson(path, options) {
    const response = await fetch(`${CONFIG.apiBase}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options && options.headers ? options.headers : {}) },
      ...options,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(cleanApiErrorMessage(text, `Request failed: ${response.status}`));
    }
    return response.status === 204 ? null : response.json();
  }

  function buildLoginMessage(nonce, address) {
    const domain = window.location.host;
    const origin = window.location.origin;
    return [
      `${domain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      'Sign in to DFK Defense.',
      '',
      `URI: ${origin}`,
      'Version: 1',
      `Chain ID: ${CONFIG.chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
  }

  async function signIn() {
    if (!state.address) await connectWallet();
    if (!state.address || !state.selectedProvider) throw new Error('Wallet connection required before signing in.');
    const noncePayload = await fetchJson('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: state.address }),
    });
    const message = buildLoginMessage(noncePayload.nonce, state.address);
    const signature = await request(state.selectedProvider, 'personal_sign', [message, state.address]);
    const verifyPayload = await fetchJson('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ address: state.address, message, signature, walletProvider: providerLabel(state.providerInfo) }),
    });
    state.user = verifyPayload && verifyPayload.user ? verifyPayload.user : { primaryWallet: state.address };
    state.mode = 'settled';
    await refreshBank();
    render();
    return verifyPayload;
  }

  async function refreshBank() {
    try {
      const [balancePayload, depositConfig] = await Promise.all([
        fetchJson('/me/balance', { method: 'GET' }),
        fetchJson('/deposits/config', { method: 'GET' }),
      ]);
      state.balance = balancePayload;
      state.depositAddress = depositConfig && depositConfig.depositAddress ? depositConfig.depositAddress : null;
      if (state.user || (balancePayload && balancePayload.authenticated)) state.mode = 'settled';
      render();
      window.dispatchEvent(new CustomEvent('dfk-defense:bank-balance', { detail: balancePayload }));
      return balancePayload;
    } catch (error) {
      state.mode = 'local';
      state.balance = null;
      state.depositAddress = null;
      render();
      const message = /failed to fetch|request failed|not found|cannot get|unexpected token|networkerror|load failed/i.test(String(error && error.message || ''))
        ? 'Refresh Bank needs the server API. This build is staying in local bank mode.'
        : (error && error.message ? error.message : 'Refresh Bank failed.');
      renderError(new Error(message));
      return null;
    }
  }

  async function depositJewel() {
    if (!state.address) await connectWallet();
    if (!state.user) await signIn();
    const depositConfig = await fetchJson('/deposits/config', { method: 'GET' });
    state.depositAddress = depositConfig.depositAddress;
    const provider = state.selectedProvider;
    if (!provider) throw new Error('No wallet provider selected.');
    await ensureChain(provider);
    const prompt = window.prompt('Deposit amount in JEWEL (native token). Example: 3', '3');
    if (prompt == null) return null;
    const amountText = String(prompt).trim();
    if (!/^\d+(\.\d+)?$/.test(amountText)) throw new Error('Enter a valid deposit amount.');
    const wei = toWei(amountText, 18);
    const txHash = await request(provider, 'eth_sendTransaction', [{
      from: state.address,
      to: depositConfig.depositAddress,
      value: `0x${wei.toString(16)}`,
    }]);
    renderInfo(`Deposit submitted. Tx: ${txHash.slice(0, 10)}…`);
    return txHash;
  }

  function toWei(amountText, decimals) {
    const [wholeRaw, fracRaw = ''] = amountText.split('.');
    const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
    const frac = (fracRaw + '0'.repeat(decimals)).slice(0, decimals);
    return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(frac || '0');
  }

  async function disconnectWallet() {
    state.address = null;
    state.balance = null;
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
    const walletCount = state.providers.length;
    const settled = state.mode === 'settled';
    setText(ui.walletMode, settled ? 'Settled server balance' : 'Local only');
    setText(ui.walletAddress, state.address ? `${providerName}: ${shortAddress(state.address)}` : 'No wallet connected.');
    setText(ui.walletBalance, state.balance && state.balance.balance != null ? `${state.balance.balance} JEWEL` : '--');
    setText(ui.walletDepositAddress, state.depositAddress || '--');
    if (state.address) {
      setText(ui.walletStatus, settled ? `Signed in with ${providerName}` : `${providerName} connected${walletCount > 1 ? ` • ${walletCount} wallets detected` : ''}`);
      ui.walletStatus.className = `wallet-status ${settled ? 'wallet-good' : 'wallet-warn'}`;
    } else {
      setText(ui.walletStatus, walletCount ? 'Wallet available. Connect to use secure bank mode.' : 'Offline Bank Mode');
      ui.walletStatus.className = 'wallet-status wallet-warn';
    }
    if (ui.depositWalletBtn) ui.depositWalletBtn.disabled = !state.address;
    if (ui.signInWalletBtn) ui.signInWalletBtn.disabled = !state.address && !state.providers.length;
    if (ui.disconnectWalletBtn) ui.disconnectWalletBtn.disabled = !state.address;
  }

  function bindUi() {
    Object.assign(ui, {
      walletStatus: qs('walletStatus'),
      walletAddress: qs('walletAddress'),
      walletMode: qs('walletMode'),
      walletBalance: qs('walletBalance'),
      walletDepositAddress: qs('walletDepositAddress'),
      connectWalletBtn: qs('connectWalletBtn'),
      signInWalletBtn: qs('signInWalletBtn'),
      refreshBankBtn: qs('refreshBankBtn'),
      depositWalletBtn: qs('depositWalletBtn'),
      disconnectWalletBtn: qs('disconnectWalletBtn'),
    });
    if (ui.connectWalletBtn) ui.connectWalletBtn.addEventListener('click', () => connectWallet().catch(renderError));
    if (ui.signInWalletBtn) ui.signInWalletBtn.addEventListener('click', () => signIn().catch(renderError));
    if (ui.refreshBankBtn) ui.refreshBankBtn.addEventListener('click', () => refreshBank().catch(renderError));
    if (ui.depositWalletBtn) ui.depositWalletBtn.addEventListener('click', () => depositJewel().catch(renderError));
    if (ui.disconnectWalletBtn) ui.disconnectWalletBtn.addEventListener('click', () => disconnectWallet().catch(renderError));
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
