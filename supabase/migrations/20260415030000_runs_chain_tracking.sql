alter table public.runs
  add column if not exists chain_id integer not null default 53935;

create index if not exists idx_runs_wallet_chain_completed_at
  on public.runs (wallet_address, chain_id, completed_at desc);

create index if not exists idx_runs_chain_completed_at
  on public.runs (chain_id, completed_at desc);
