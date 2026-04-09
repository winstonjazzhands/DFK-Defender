
create table if not exists public.reward_claim_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  wallet_address text not null references public.players(wallet_address) on delete cascade,
  claim_type text not null,
  status text not null default 'pending',
  player_name_snapshot text,
  amount_text text not null,
  amount_value numeric(20,3),
  reward_currency text,
  reason_text text,
  source_ref text,
  run_id uuid references public.runs(id) on delete set null,
  claim_day date not null default (now() at time zone 'utc')::date,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_wallet text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_claim_requests_wallet_lowercase check (wallet_address = lower(wallet_address)),
  constraint reward_claim_requests_claim_type_check check (claim_type in ('daily_quest', 'bounty', 'daily_reward')),
  constraint reward_claim_requests_status_check check (status in ('pending', 'approved', 'paid', 'rejected'))
);

create index if not exists idx_reward_claim_requests_wallet_requested_at on public.reward_claim_requests (wallet_address, requested_at desc);
create index if not exists idx_reward_claim_requests_status_requested_at on public.reward_claim_requests (status, requested_at desc);
create index if not exists idx_reward_claim_requests_source_ref on public.reward_claim_requests (source_ref);

alter table public.reward_claim_requests enable row level security;

drop policy if exists "reward_claim_requests_read_none" on public.reward_claim_requests;
create policy "reward_claim_requests_read_none"
  on public.reward_claim_requests
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop trigger if exists trg_reward_claim_requests_updated_at on public.reward_claim_requests;
create trigger trg_reward_claim_requests_updated_at
before update on public.reward_claim_requests
for each row execute function public.set_updated_at();
