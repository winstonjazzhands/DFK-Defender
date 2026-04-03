create table if not exists public.crypto_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.players(wallet_address) on delete cascade,
  client_run_id text,
  parent_payment_session_id uuid references public.crypto_payment_sessions(id) on delete set null,
  kind text not null default 'entry_fee',
  chain_id integer not null default 43114,
  expected_amount_wei numeric(78,0) not null default 0,
  status text not null default 'pending',
  payment_tx_hash text,
  confirmed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crypto_payment_sessions_wallet_lowercase check (wallet_address = lower(wallet_address))
);

alter table public.crypto_payment_sessions
  add column if not exists client_run_id text,
  add column if not exists parent_payment_session_id uuid references public.crypto_payment_sessions(id) on delete set null,
  add column if not exists kind text not null default 'entry_fee',
  add column if not exists chain_id integer not null default 43114,
  add column if not exists expected_amount_wei numeric(78,0) not null default 0,
  add column if not exists status text not null default 'pending',
  add column if not exists payment_tx_hash text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists expires_at timestamptz not null default (now() + interval '15 minutes'),
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.players
  add column if not exists paid_games_remaining integer not null default 0,
  add column if not exists free_games_remaining integer not null default 5,
  add column if not exists free_games_last_reset date not null default current_date,
  add column if not exists total_paid_games_purchased integer not null default 0;

create index if not exists idx_crypto_payment_sessions_status_confirmed on public.crypto_payment_sessions (status, confirmed_at desc);
create index if not exists idx_crypto_payment_sessions_kind on public.crypto_payment_sessions (kind, confirmed_at desc);
create index if not exists idx_crypto_payment_sessions_wallet on public.crypto_payment_sessions (wallet_address, created_at desc);

alter table public.crypto_payment_sessions enable row level security;

drop policy if exists "crypto_payment_sessions_read_none" on public.crypto_payment_sessions;
create policy "crypto_payment_sessions_read_none"
  on public.crypto_payment_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);
