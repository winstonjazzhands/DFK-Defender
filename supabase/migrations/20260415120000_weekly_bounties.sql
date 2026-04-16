

create table if not exists public.weekly_bounty_claims (
  id uuid primary key default gen_random_uuid(),
  week_key text not null,
  bounty_id text not null,
  wallet_address text not null references public.players(wallet_address) on delete cascade,
  claimant_name text,
  claim_slot integer not null check (claim_slot between 1 and 3),
  reward_claim_request_id uuid references public.reward_claim_requests(id) on delete set null,
  claimed_at timestamptz not null default now(),
  constraint weekly_bounty_claims_wallet_lowercase check (wallet_address = lower(wallet_address)),
  constraint weekly_bounty_claims_week_format check (week_key ~ '^\d{4}-\d{2}-\d{2}$')
);

create unique index if not exists idx_weekly_bounty_claims_wallet_unique
  on public.weekly_bounty_claims (week_key, bounty_id, wallet_address);

create unique index if not exists idx_weekly_bounty_claims_slot_unique
  on public.weekly_bounty_claims (week_key, bounty_id, claim_slot);

create index if not exists idx_weekly_bounty_claims_lookup
  on public.weekly_bounty_claims (week_key, bounty_id, claimed_at asc);

alter table public.weekly_bounty_claims enable row level security;

drop policy if exists "weekly_bounty_claims_read_none" on public.weekly_bounty_claims;
create policy "weekly_bounty_claims_read_none"
  on public.weekly_bounty_claims
  for all
  to anon, authenticated
  using (false)
  with check (false);
