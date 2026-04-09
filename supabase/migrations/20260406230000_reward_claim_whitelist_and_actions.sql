create table if not exists public.reward_claim_whitelist (
  wallet_address text primary key,
  is_active boolean not null default true,
  auto_daily boolean not null default false,
  auto_bounty boolean not null default false,
  max_claim_amount numeric(20,3),
  daily_cap numeric(20,3),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_claim_whitelist_wallet_lowercase check (wallet_address = lower(wallet_address))
);

create index if not exists idx_reward_claim_whitelist_active on public.reward_claim_whitelist (is_active, wallet_address);

alter table public.reward_claim_whitelist enable row level security;

drop policy if exists "reward_claim_whitelist_read_none" on public.reward_claim_whitelist;
create policy "reward_claim_whitelist_read_none"
  on public.reward_claim_whitelist
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop trigger if exists trg_reward_claim_whitelist_updated_at on public.reward_claim_whitelist;
create trigger trg_reward_claim_whitelist_updated_at
before update on public.reward_claim_whitelist
for each row execute function public.set_updated_at();

alter table public.reward_claim_requests
  add column if not exists approved_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists tx_hash text,
  add column if not exists failure_reason text;

create index if not exists idx_reward_claim_requests_claim_day_status on public.reward_claim_requests (claim_day, status);
