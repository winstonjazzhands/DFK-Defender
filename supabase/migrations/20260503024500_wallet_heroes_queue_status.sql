alter table public.wallet_heroes
  add column if not exists index_status text not null default 'pending',
  add column if not exists source text,
  add column if not exists discovered_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz,
  add column if not exists indexed_at timestamptz,
  add column if not exists index_error text;

create index if not exists idx_wallet_heroes_index_status
  on public.wallet_heroes (index_status, last_seen_at);

create index if not exists idx_wallet_heroes_pending_wallet
  on public.wallet_heroes (wallet_address, index_status)
  where index_status in ('pending', 'queued', 'failed');
