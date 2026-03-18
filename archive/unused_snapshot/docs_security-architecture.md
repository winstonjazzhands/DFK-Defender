# DFK Defense secure bank package

This package adds a security-first wallet/profile stack around the existing static game.

What is solid in this build:
- MetaMask + Rabby wallet discovery through EIP-6963-first logic.
- DFK Chain enforcement before sign-in or deposit.
- Signature-based login with one-time nonces.
- Server-side sessions in HTTP-only cookies.
- Deposit watcher that credits only after on-chain confirmation.
- Separate admin session boundary.
- Ledger-based accounting.
- Manual withdrawals only.

What is intentionally not trusted yet:
- The current browser game still runs client-side.
- Because the run and reward logic is client-side, **wave reward credits are not automatically pushed to the secure ledger**.
- In this build, the secure bank is wired for identity, balance reads, deposits, entry-fee style debits, and admin operations. Reward credits should stay manual or move server-side before you automate them.

Why that matters:
If the server trusted client-reported wave clears or reward claims, a modified browser client could mint fake JEWEL balances. That is not acceptable for a real-money system.
