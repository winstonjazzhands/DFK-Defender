create extension if not exists pgcrypto;

create table if not exists public.dfk_token_payment_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  status text not null default 'pending',
  wallet_address text not null,
  client_run_id text not null,
  kind text not null,
  chain_id integer not null,
  token_address text,
  payment_asset text not null default 'native_jewel',
  treasury_address text not null,
  expected_amount_wei numeric(78,0) not null,
  tx_hash text,
  block_number bigint,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists dfk_token_payment_sessions_tx_hash_idx
  on public.dfk_token_payment_sessions (tx_hash)
  where tx_hash is not null;

create table if not exists public.dfk_token_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  verified_at timestamptz not null default now(),
  payment_session_id uuid references public.dfk_token_payment_sessions(id) on delete set null,
  wallet_address text not null,
  client_run_id text,
  kind text not null,
  chain_id integer not null,
  token_address text,
  payment_asset text not null default 'native_jewel',
  treasury_address text not null,
  expected_amount_wei numeric(78,0) not null,
  paid_amount_wei numeric(78,0) not null,
  tx_hash text not null unique,
  block_number bigint,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists dfk_token_payments_wallet_idx
  on public.dfk_token_payments (wallet_address);

create index if not exists dfk_token_payments_kind_idx
  on public.dfk_token_payments (kind);

create index if not exists dfk_token_payments_verified_idx
  on public.dfk_token_payments (verified_at desc);

create index if not exists dfk_token_payments_payment_asset_idx
  on public.dfk_token_payments (payment_asset);

alter table public.dfk_token_payment_sessions enable row level security;
alter table public.dfk_token_payments enable row level security;
