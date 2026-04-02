-- Idempotent burn-table compatibility patch for DFK Defender.

create table if not exists public.dfk_gold_burns (
  tx_hash text primary key,
  wallet_address text not null,
  burn_amount numeric(20,3) not null default 0 check (burn_amount >= 0),
  defender_gold_awarded integer not null default 0 check (defender_gold_awarded >= 0),
  chain_id integer not null default 53935,
  block_number bigint,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.dfk_gold_burns
  add column if not exists wallet_address text,
  add column if not exists burn_amount numeric(20,3) not null default 0,
  add column if not exists defender_gold_awarded integer not null default 0,
  add column if not exists chain_id integer not null default 53935,
  add column if not exists block_number bigint,
  add column if not exists confirmed_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_dfk_gold_burns_wallet on public.dfk_gold_burns (wallet_address, confirmed_at desc);

alter table public.dfk_gold_burns enable row level security;

drop policy if exists "dfk_gold_burns_read_none" on public.dfk_gold_burns;
create policy "dfk_gold_burns_read_none"
  on public.dfk_gold_burns
  for all
  to anon, authenticated
  using (false)
  with check (false);
