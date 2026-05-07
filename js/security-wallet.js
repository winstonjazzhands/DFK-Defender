(() => {
  'use strict';

  const DFK_CONFIG = Object.freeze({
    key: 'dfk',
    chainId: 53935,
    chainHex: '0xd2af',
    chainName: 'DFK Chain',
    rpcUrls: [
      'https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc',
      'https://dfk-chain.rpc.thirdweb.com/'
    ],
    blockExplorerUrls: ['https://subnets.avax.network/defi-kingdoms/'],
    nativeCurrency: { name: 'JEWEL', symbol: 'JEWEL', decimals: 18 },
  });

  const AVAX_CONFIG = Object.freeze({
    key: 'avax',
    chainId: Number(window.DFK_AVAX_CHAIN_ID || 43114),
    chainHex: window.DFK_AVAX_CHAIN_HEX || '0xa86a',
    chainName: window.DFK_AVAX_CHAIN_NAME || 'Avalanche C-Chain',
    rpcUrls: [window.DFK_AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: [window.DFK_AVAX_EXPLORER_URL || 'https://snowtrace.io'],
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
  });

  const CONFIG = Object.freeze({
    ...DFK_CONFIG,
    supabaseUrl: window.DFK_SUPABASE_URL || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || '',
    supabaseAnonKey: window.DFK_SUPABASE_PUBLISHABLE_KEY || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || '',
    resolveProfileFunction: window.DFK_SUPABASE_RESOLVE_PROFILE_FUNCTION || 'resolve-profile-name',
  });

  const SUPPORTED_CHAINS = Object.freeze([DFK_CONFIG, AVAX_CONFIG]);

  const CONTRACTS = Object.freeze({
    dfkProfiles: '0xC4cD8C09D1A90b21Be417be91A81603B03993E81',
    dfkGold: '0x576C260513204392F0eC0bc865450872025CB1cA',
    honk: '0x11C3b7bADC5359242c34C68C1F0f071bFf49a3D8',
    heroCore: '0xEb9B61B145D6489Be575D3603F4a704810e143dF',
  });


  const PROFILES_ABI = Object.freeze([
    'function getNames(address[] _addresses) view returns (string[])',
    'function addressToProfile(address) view returns (address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri)',
    'function getProfile(address _profileAddress) view returns ((address owner, string name, uint64 created, uint256 nftId, uint256 collectionId, string picUri))',
    'function getProfileByAddress(address _profileAddress) view returns (uint256 _id, address _owner, string _name, uint64 _created, uint8 _picId, uint256 _heroId, uint256 _points)',
  ]);

  const ERC20_ABI = Object.freeze([
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ]);

  const HERO_CORE_TRANSFER_ABI = Object.freeze([
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function ownerOf(uint256 tokenId) view returns (address)',
  ]);

  const state = {
    providers: [],
    selectedProvider: null,
    providerInfo: null,
    address: null,
    balance: null,
    dfkGoldBalance: null,
    honkBalance: null,
    profileName: null,
    vanityName: null,
    user: null,
    mode: 'local',
    depositAddress: null,
    activeChainId: CONFIG.chainId,
    activeChainHex: CONFIG.chainHex,
    activeChainName: CONFIG.chainName,
    nativeSymbol: CONFIG.nativeCurrency.symbol,
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
        dfkGoldBalance: state.dfkGoldBalance,
        honkBalance: state.honkBalance,
        providerName: providerLabel(state.providerInfo),
        activeChainId: state.activeChainId,
        activeChainHex: state.activeChainHex,
        activeChainName: state.activeChainName,
        nativeSymbol: state.nativeSymbol,
      },
    }));
  }
  function setHtml(el, text) { if (el) el.innerHTML = text; }
  function normalizeAddress(address) { return String(address || '').trim().toLowerCase(); }

  function formatNativeBalance(rawBalance, symbol = state.nativeSymbol || CONFIG.nativeCurrency.symbol) {
    const value = Number(rawBalance || 0);
    if (!Number.isFinite(value)) return '--';
    if (value >= 1000) return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${symbol}`;
    if (value >= 10) return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })} ${symbol}`;
  }

  function getSupportedChainConfigByHex(chainHex) {
    const normalized = String(chainHex || '').toLowerCase();
    return SUPPORTED_CHAINS.find((entry) => String(entry.chainHex || '').toLowerCase() === normalized) || null;
  }

  async function getProviderChainConfig(provider = state.selectedProvider) {
    if (!provider) return DFK_CONFIG;
    try {
      const chainIdHex = await request(provider, 'eth_chainId');
      return getSupportedChainConfigByHex(chainIdHex) || {
        key: 'unknown',
        chainId: Number(chainIdHex || 0),
        chainHex: String(chainIdHex || ''),
        chainName: `Chain ${chainIdHex}`,
        rpcUrls: CONFIG.rpcUrls,
        blockExplorerUrls: CONFIG.blockExplorerUrls,
        nativeCurrency: { name: 'Native', symbol: 'Native', decimals: 18 },
      };
    } catch (_error) {
      return DFK_CONFIG;
    }
  }

  function applyActiveChainConfig(chainConfig) {
    const next = chainConfig || DFK_CONFIG;
    state.activeChainId = Number(next.chainId || 0);
    state.activeChainHex = String(next.chainHex || '');
    state.activeChainName = String(next.chainName || 'Unknown Chain');
    state.nativeSymbol = String((next.nativeCurrency && next.nativeCurrency.symbol) || 'Native');
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

  function formatTokenBalance(rawBalance, decimals = 3) {
    const value = Number(rawBalance || 0);
    if (!Number.isFinite(value)) return '--';
    if (value >= 100000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (value >= 10) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return value.toLocaleString(undefined, { maximumFractionDigits: Math.min(3, Math.max(0, Number(decimals) || 0)) });
  }

  async function withRpcFallback(config, work) {
    const urls = Array.isArray(config && config.rpcUrls) ? config.rpcUrls.map((value) => String(value || '').trim()).filter(Boolean) : [];
    let lastError = null;
    for (const url of urls) {
      try {
        const provider = new window.ethers.JsonRpcProvider(url, config.chainId, { staticNetwork: true });
        const result = await work(provider, url);
        if (result != null) return result;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
    return null;
  }

  async function fetchNativeBalance(address) {
    if (!state.selectedProvider || !address) return null;
    const hexBalance = await request(state.selectedProvider, 'eth_getBalance', [address, 'latest']);
    const parsed = formatEtherFromHex(hexBalance);
    return parsed == null ? null : { balance: parsed };
  }

  async function fetchErc20Balance(address, tokenAddress, fallbackDecimals = 18) {
    if (!address || !tokenAddress || !window.ethers) return null;
    if (Number(state.activeChainId || 0) !== Number(DFK_CONFIG.chainId || 0)) return null;
    try {
      const walletProvider = state.selectedProvider;
      const provider = walletProvider
        ? new window.ethers.BrowserProvider(walletProvider)
        : new window.ethers.JsonRpcProvider(DFK_CONFIG.rpcUrls[0], DFK_CONFIG.chainId, { staticNetwork: true });
      const contract = new window.ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const [rawBalance, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals().catch(() => fallbackDecimals),
      ]);
      const normalizedDecimals = Number.isFinite(Number(decimals)) ? Number(decimals) : fallbackDecimals;
      const formatted = Number(window.ethers.formatUnits(rawBalance, normalizedDecimals));
      return {
        balance: formatted,
        decimals: normalizedDecimals,
        raw: String(rawBalance),
      };
    } catch (error) {
      return null;
    }
  }

  async function fetchDfkgoldBalance(address) {
    return fetchErc20Balance(address, CONTRACTS.dfkGold, 3);
  }

  async function fetchHonkBalance(address) {
    return fetchErc20Balance(address, CONTRACTS.honk, 18);
  }

  async function resolveProfileNameViaFunction(address) {
    if (!address || !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) return null;
    try {
      const response = await fetch(`${CONFIG.supabaseUrl}/functions/v1/${CONFIG.resolveProfileFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
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

  function cleanName(value) {
    const name = typeof value === 'string' ? value.trim() : '';
    return name || null;
  }

  function getErrorMessage(error) {
    if (!error) return '';
    const message = [
      error.message,
      error.shortMessage,
      error.reason,
      error?.data?.message,
      error?.error?.message,
      error?.info?.error?.message,
    ].find((value) => typeof value === 'string' && value.trim());
    return String(message || '').trim();
  }

  function isNoProfileLookupMiss(error) {
    const message = getErrorMessage(error).toLowerCase();
    return message.includes('no profile found') || message.includes('profile not found');
  }

  async function resolveProfileNameViaRpc(address) {
    if (!address || !window.ethers) return null;
    const normalized = normalizeAddress(address);
    try {
      const tryProvider = async (provider) => {
        const contract = new window.ethers.Contract(CONTRACTS.dfkProfiles, PROFILES_ABI, provider);
        const attempts = [
          async () => {
            const result = await contract.getNames([normalized]);
            const first = Array.isArray(result) ? result[0] : null;
            const name = cleanName(first);
            return name ? name : null;
          },
          async () => {
            const result = await contract.addressToProfile(normalized);
            const owner = normalizeAddress(result && result.owner);
            const name = cleanName(result && result.name);
            return owner === normalized ? name : null;
          },
          async () => {
            const result = await contract.getProfile(normalized);
            const owner = normalizeAddress(result && result.owner);
            const name = cleanName(result && result.name);
            return owner === normalized ? name : null;
          },
          async () => {
            const result = await contract.getProfileByAddress(normalized);
            const owner = normalizeAddress(result && result._owner);
            const name = cleanName(result && result._name);
            return owner === normalized ? name : null;
          },
        ];
        for (const attempt of attempts) {
          try {
            const name = await attempt();
            if (name) return name;
          } catch (error) {
            if (isNoProfileLookupMiss(error)) return null;
            // try next call shape
          }
        }
        return null;
      };

      const rpcResult = await withRpcFallback(DFK_CONFIG, tryProvider).catch((error) => {
        if (isNoProfileLookupMiss(error)) return null;
        throw error;
      });
      if (rpcResult) return rpcResult;

      if (Number(state.activeChainId || 0) === Number(DFK_CONFIG.chainId || 0) && state.selectedProvider) {
        try {
          return await tryProvider(new window.ethers.BrowserProvider(state.selectedProvider));
        } catch (error) {
          if (isNoProfileLookupMiss(error)) return null;
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  async function fetchProfileNameFromChain(address) {
    const rpcName = await resolveProfileNameViaRpc(address);
    if (rpcName) return rpcName;
    return null;
  }

  async function fetchProfileName(address) {
    if (!address) return null;
    // Avoid noisy MetaMask/DFK Chain RPC profile calls during normal wallet connect.
    // Profile lookup should be backend/function-only and optional.
    const functionName = await resolveProfileNameViaFunction(address);
    return functionName || null;
  }

  async function transferHeroes(tokenIds, recipient, options = {}) {
    const ids = Array.isArray(tokenIds) ? tokenIds.map((value) => String(value || '').trim()).filter(Boolean) : [];
    if (!ids.length) throw new Error('Select at least one hero to transfer.');
    if (!state.address) throw new Error('Connect your wallet first.');
    if (!state.selectedProvider || !window.ethers) throw new Error('Wallet provider unavailable.');
    const target = String(recipient || '').trim();
    if (!window.ethers.isAddress(target)) throw new Error('Enter a valid recipient wallet address.');
    const from = normalizeAddress(state.address);
    const to = normalizeAddress(target);
    if (from === to) throw new Error('Recipient wallet must be different from your connected wallet.');
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    await ensureChain(state.selectedProvider);
    const provider = new window.ethers.BrowserProvider(state.selectedProvider);
    const signer = await provider.getSigner();
    const signerAddress = normalizeAddress(await signer.getAddress());
    if (signerAddress !== from) throw new Error('Connected signer does not match the active wallet.');
    const contract = new window.ethers.Contract(CONTRACTS.heroCore, HERO_CORE_TRANSFER_ABI, signer);
    const results = [];
    for (let index = 0; index < ids.length; index += 1) {
      const tokenId = ids[index];
      if (onProgress) onProgress({ stage: 'confirm', index, total: ids.length, tokenId });
      const owner = normalizeAddress(await contract.ownerOf(tokenId));
      if (owner !== from) throw new Error(`Hero ${tokenId} is no longer owned by the connected wallet.`);
      const tx = await contract.transferFrom(state.address, target, tokenId);
      if (onProgress) onProgress({ stage: 'pending', index, total: ids.length, tokenId, hash: tx && tx.hash ? tx.hash : '' });
      const receipt = await tx.wait();
      results.push({ tokenId, hash: tx && tx.hash ? tx.hash : '', receipt });
      if (onProgress) onProgress({ stage: 'confirmed', index, total: ids.length, tokenId, hash: tx && tx.hash ? tx.hash : '' });
    }
    await refreshWalletDetails().catch(() => null);
    return results;
  }

  async function refreshWalletDetails() {
    if (!state.address) {
      state.balance = null;
      state.dfkGoldBalance = null;
      state.honkBalance = null;
      state.profileName = null;
      applyActiveChainConfig(DFK_CONFIG);
      render();
      emitWalletState();
      return null;
    }
    try {
      const activeChain = await getProviderChainConfig();
      applyActiveChainConfig(activeChain);
      const [balance, dfkGoldBalance, honkBalance, profileName] = await Promise.all([
        fetchNativeBalance(state.address),
        fetchDfkgoldBalance(state.address),
        fetchHonkBalance(state.address),
        fetchProfileName(state.address),
      ]);
      state.balance = balance;
      state.dfkGoldBalance = dfkGoldBalance;
      state.honkBalance = honkBalance;
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
    const supported = getSupportedChainConfigByHex(chainIdHex);
    if (supported) {
      applyActiveChainConfig(supported);
      return true;
    }
    throw new Error('Switch your wallet to DFK Chain or Avalanche C-Chain and try again.');
  }


  async function retryPendingRunUploadsForConnectedWallet() {
    const walletAddress = state.address ? normalizeAddress(state.address) : '';
    if (!walletAddress || !window.DFKRunTracker || typeof window.DFKRunTracker.flushPendingRuns !== 'function') {
      return null;
    }
    renderInfo('Retrying pending tracked runs…');
    try {
      const result = await window.DFKRunTracker.flushPendingRuns({
        address: walletAddress,
        interactive: true,
        force: true,
      });
      const pending = result && Number.isFinite(Number(result.pending)) ? Number(result.pending) : null;
      const uploaded = result && Number.isFinite(Number(result.uploaded)) ? Number(result.uploaded) : 0;
      if (pending === 0) {
        renderInfo(uploaded > 0 ? 'Pending tracked runs uploaded.' : 'No pending tracked runs.');
      } else {
        renderInfo(`Retried pending tracked runs. ${pending} still pending.`);
      }
      if (typeof window.DFKRunTracker.refreshSummary === 'function') {
        window.DFKRunTracker.refreshSummary().catch(() => null);
      }
      return result;
    } catch (error) {
      const message = error && error.message ? error.message : 'Pending run retry failed.';
      renderInfo(message);
      throw error;
    }
  }

  async function connectWallet() {
    if (state.address) {
      await retryPendingRunUploadsForConnectedWallet();
      return state.address;
    }
    if (typeof window.DFKDefenseBeforeConnect === 'function') {
      const allowed = await window.DFKDefenseBeforeConnect();
      if (allowed === false) return null;
    }
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
    if (state.address && typeof window.DFKDefenseAfterConnect === 'function') {
      await window.DFKDefenseAfterConnect(state.address);
    }
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
          state.dfkGoldBalance = null;
          state.honkBalance = null;
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
        state.dfkGoldBalance = null;
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
    setText(ui.walletJewelBalance, `Wallet ${state.nativeSymbol || 'Native'}: ${state.balance && state.balance.balance != null ? formatNativeBalance(state.balance.balance, state.nativeSymbol) : '--'}`);
    setText(ui.walletDfkgoldBalance, Number(state.activeChainId || 0) === Number(DFK_CONFIG.chainId || 0) ? `Wallet DFK Gold: ${state.dfkGoldBalance && state.dfkGoldBalance.balance != null ? formatTokenBalance(state.dfkGoldBalance.balance, state.dfkGoldBalance.decimals) : '--'}` : 'Wallet DFK Gold: DFK Chain only');
    setText(ui.walletHonkBalance, Number(state.activeChainId || 0) === Number(DFK_CONFIG.chainId || 0) ? `Wallet HONK: ${state.honkBalance && state.honkBalance.balance != null ? formatTokenBalance(state.honkBalance.balance, state.honkBalance.decimals) : '--'}` : 'Wallet HONK: DFK Chain only');
    setText(ui.walletPanelTitle, 'Player Profile');
    if (state.address) {
      setText(ui.walletStatus, `${providerName} Connected • ${state.activeChainName}`);
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
      walletDfkgoldBalance: qs('walletDfkgoldBalance'),
      walletHonkBalance: qs('walletHonkBalance'),
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
    refreshWalletDetails,
    depositJewel,
    disconnectWallet,
    transferHeroes,
    getProvider: () => state.selectedProvider,
    getState: () => ({ ...state }),
  };

  document.addEventListener('DOMContentLoaded', init);
})();
