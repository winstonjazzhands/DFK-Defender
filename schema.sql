-- DFK Defender wallet-based run tracking schema for Supabase

create extension if not exists pgcrypto;

create table if not exists public.players (
  wallet_address text primary key,
  display_name text,
  vanity_name text,
  best_wave integer not null default 0 check (best_wave >= 0),
  total_runs integer not null default 0 check (total_runs >= 0),
  total_waves_cleared integer not null default 0 check (total_waves_cleared >= 0),
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_wallet_lowercase check (wallet_address = lower(wallet_address))
);

create table if not exists public.wallet_auth_nonces (
  wallet_address text primary key,
  nonce text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wallet_auth_nonces_wallet_lowercase check (wallet_address = lower(wallet_address))
);

create table if not exists public.wallet_sessions (
  session_token uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.players(wallet_address) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  session_origin text,
  user_agent_hash text,
  constraint wallet_sessions_wallet_lowercase check (wallet_address = lower(wallet_address))
);

alter table public.wallet_sessions add column if not exists session_origin text;
alter table public.wallet_sessions add column if not exists user_agent_hash text;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references public.players(wallet_address) on delete cascade,
  client_run_id text not null unique,
  display_name_snapshot text,
  game_version text not null,
  mode text not null,
  result text not null,
  wave_reached integer not null default 0 check (wave_reached >= 0),
  waves_cleared integer not null default 0 check (waves_cleared >= 0),
  portal_hp_left integer not null default 0 check (portal_hp_left >= 0),
  gold_on_hand integer not null default 0 check (gold_on_hand >= 0),
  premium_jewels integer not null default 0 check (premium_jewels >= 0),
  heroes_json jsonb not null default '[]'::jsonb,
  stats_json jsonb not null default '{}'::jsonb,
  replay_json jsonb,
  replay_share_id text unique,
  run_started_at timestamptz,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  chain_id integer not null default 53935,
  constraint runs_wallet_lowercase check (wallet_address = lower(wallet_address))
);

alter table public.players add column if not exists used_wallet_heroes boolean not null default false;

create index if not exists idx_runs_wallet_completed_at on public.runs (wallet_address, completed_at desc);
create index if not exists idx_runs_wallet_chain_completed_at on public.runs (wallet_address, chain_id, completed_at desc);
create index if not exists idx_runs_chain_completed_at on public.runs (chain_id, completed_at desc);
create index if not exists idx_runs_best_wave on public.runs (wave_reached desc, completed_at desc);
create index if not exists idx_runs_replay_share_id on public.runs (replay_share_id) where replay_share_id is not null;
create index if not exists idx_wallet_sessions_wallet on public.wallet_sessions (wallet_address, expires_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

alter table public.players enable row level security;
alter table public.wallet_auth_nonces enable row level security;
alter table public.wallet_sessions enable row level security;
alter table public.runs enable row level security;

-- Public read access for lightweight profile summaries shown in the game UI.
drop policy if exists "players_public_read" on public.players;
create policy "players_public_read"
  on public.players
  for select
  to anon, authenticated
  using (true);

-- Direct browser writes are disabled. Edge functions should use the service role.
drop policy if exists "players_no_direct_write" on public.players;
create policy "players_no_direct_write"
  on public.players
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "runs_read_none" on public.runs;
create policy "runs_read_none"
  on public.runs
  for select
  to anon, authenticated
  using (false);

drop policy if exists "runs_write_none" on public.runs;
create policy "runs_write_none"
  on public.runs
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "nonces_write_none" on public.wallet_auth_nonces;
create policy "nonces_write_none"
  on public.wallet_auth_nonces
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "sessions_write_none" on public.wallet_sessions;
create policy "sessions_write_none"
  on public.wallet_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace view public.public_run_leaderboard as
select
  wallet_address,
  vanity_name,
  coalesce(vanity_name, display_name, wallet_address) as display_name,
  used_wallet_heroes,
  best_wave,
  total_runs,
  total_waves_cleared,
  last_run_at,
  updated_at
from public.players
order by best_wave desc, total_waves_cleared desc, updated_at desc, wallet_address asc;

create unique index if not exists players_vanity_name_unique on public.players (lower(vanity_name)) where vanity_name is not null;


create table if not exists public.dfk_gold_burns (
  tx_hash text primary key,
  wallet_address text not null,
  burn_amount numeric(20,3) not null default 0 check (burn_amount >= 0),
  defender_gold_awarded integer not null default 0 check (defender_gold_awarded >= 0),
  chain_id integer not null default 53935,
  block_number bigint,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint dfk_gold_burns_tx_hash_lowercase check (tx_hash = lower(tx_hash)),
  constraint dfk_gold_burns_wallet_lowercase check (wallet_address = lower(wallet_address))
);

create index if not exists idx_dfk_gold_burns_wallet on public.dfk_gold_burns (wallet_address, confirmed_at desc);

alter table public.dfk_gold_burns enable row level security;

drop policy if exists "dfk_gold_burns_read_none" on public.dfk_gold_burns;
create policy "dfk_gold_burns_read_none"
  on public.dfk_gold_burns
  for all
  to anon, authenticated
  using (false)
  with check (false);


create table if not exists public.bounties (
  id bigserial primary key,
  sort_order integer not null unique,
  title text not null,
  reward_text text not null,
  required_wave integer not null check (required_wave > 0),
  detail text not null default '',
  unlock_delay_hours integer not null default 24 check (unlock_delay_hours >= 0),
  reveal_at timestamptz not null default now(),
  claimed_by_wallet text references public.players(wallet_address) on delete set null,
  claimed_by_name text,
  claimed_run_id uuid references public.runs(id) on delete set null,
  claimed_at timestamptz
);

create index if not exists idx_bounties_sort_order on public.bounties (sort_order asc);


create unique index if not exists idx_bounties_claimed_run_unique
  on public.bounties (claimed_run_id)
  where claimed_run_id is not null;

alter table public.bounties enable row level security;

drop policy if exists "bounties_read_none" on public.bounties;
create policy "bounties_read_none"
  on public.bounties
  for all
  to anon, authenticated
  using (false)
  with check (false);

insert into public.bounties (sort_order, title, reward_text, required_wave, detail, unlock_delay_hours, reveal_at)
values
  (1, 'First player to beat wave 20', '50J', 20, 'First verified tracked run to reach wave 20 claims this bounty.', 24, now()),
  (2, 'First player to beat wave 25', '75J', 25, 'First verified tracked run to reach wave 25 claims this bounty.', 24, now() + interval '100 years'),
  (3, 'First player to beat wave 30', '100J', 30, 'First verified tracked run to reach wave 30 claims this bounty.', 24, now() + interval '100 years'),
  (4, 'First player to beat wave 35', '100J', 35, 'First verified tracked run to reach wave 35 claims this bounty.', 24, now() + interval '100 years'),
  (5, 'First player to beat wave 40', '100J', 40, 'First verified tracked run to reach wave 40 claims this bounty.', 24, now() + interval '100 years'),
  (6, 'First player to beat wave 45', '100J', 45, 'First verified tracked run to reach wave 45 claims this bounty.', 24, now() + interval '100 years'),
  (7, 'First player to beat wave 50', '100J', 50, 'First verified tracked run to reach wave 50 claims this bounty.', 24, now() + interval '100 years')
on conflict (sort_order) do update
set
  title = excluded.title,
  reward_text = excluded.reward_text,
  required_wave = excluded.required_wave,
  detail = excluded.detail,
  unlock_delay_hours = excluded.unlock_delay_hours;


create table if not exists public.reward_claim_whitelist (
  wallet_address text primary key references public.players(wallet_address) on delete cascade,
  is_active boolean not null default true,
  auto_daily boolean not null default false,
  auto_bounty boolean not null default false,
  max_claim_amount numeric(20,8),
  daily_cap numeric(20,8),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_claim_whitelist_wallet_lowercase check (wallet_address = lower(wallet_address))
);

create table if not exists public.reward_claim_requests (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  wallet_address text not null references public.players(wallet_address) on delete cascade,
  claim_type text not null,
  status text not null default 'pending',
  player_name_snapshot text,
  amount_text text,
  amount_value numeric(20,8),
  reward_currency text,
  reason_text text,
  source_ref text,
  run_id uuid references public.runs(id) on delete set null,
  claim_day date,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  resolved_at timestamptz,
  resolved_by_wallet text,
  admin_note text,
  tx_hash text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_claim_requests_wallet_lowercase check (wallet_address = lower(wallet_address)),
  constraint reward_claim_requests_status_valid check (status in ('pending','approved','rejected','paid'))
);

create index if not exists idx_reward_claim_requests_wallet_day on public.reward_claim_requests (wallet_address, claim_day desc);
create index if not exists idx_reward_claim_requests_status on public.reward_claim_requests (status, requested_at desc);
create index if not exists idx_reward_claim_requests_run on public.reward_claim_requests (run_id);

alter table public.reward_claim_whitelist enable row level security;
alter table public.reward_claim_requests enable row level security;

drop trigger if exists trg_reward_claim_whitelist_updated_at on public.reward_claim_whitelist;
create trigger trg_reward_claim_whitelist_updated_at
before update on public.reward_claim_whitelist
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_claim_requests_updated_at on public.reward_claim_requests;
create trigger trg_reward_claim_requests_updated_at
before update on public.reward_claim_requests
for each row execute function public.set_updated_at();

drop policy if exists "reward_claim_whitelist_read_none" on public.reward_claim_whitelist;
create policy "reward_claim_whitelist_read_none"
  on public.reward_claim_whitelist
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "reward_claim_requests_read_none" on public.reward_claim_requests;
create policy "reward_claim_requests_read_none"
  on public.reward_claim_requests
  for all
  to anon, authenticated
  using (false)
  with check (false);


create table if not exists public.daily_raffle_results (
  raffle_day date not null,
  raffle_type text not null default 'dfk',
  raffle_chain_id bigint,
  window_start timestamptz not null,
  window_end timestamptz not null,
  qualifier_count integer not null default 0 check (qualifier_count >= 0),
  winner_wallet text references public.players(wallet_address) on delete set null,
  winner_name text,
  winning_run_id uuid references public.runs(id) on delete set null,
  reward_amount numeric(20,8) not null default 20 check (reward_amount >= 0),
  reward_currency text not null default 'JEWEL',
  claim_id uuid references public.reward_claim_requests(id) on delete set null,
  payout_status text not null default 'pending',
  payout_tx_hash text,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_raffle_results_pkey primary key (raffle_day, raffle_type)
);

create index if not exists idx_daily_raffle_results_settled_at on public.daily_raffle_results (raffle_type, settled_at desc);

alter table public.daily_raffle_results enable row level security;

drop policy if exists "daily_raffle_results_read_none" on public.daily_raffle_results;
create policy "daily_raffle_results_read_none"
  on public.daily_raffle_results
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop trigger if exists trg_daily_raffle_results_updated_at on public.daily_raffle_results;
create trigger trg_daily_raffle_results_updated_at
before update on public.daily_raffle_results
for each row execute function public.set_updated_at();


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
