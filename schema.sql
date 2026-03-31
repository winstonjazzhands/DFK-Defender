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
  constraint wallet_sessions_wallet_lowercase check (wallet_address = lower(wallet_address))
);

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
  run_started_at timestamptz,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint runs_wallet_lowercase check (wallet_address = lower(wallet_address))
);

alter table public.players add column if not exists used_wallet_heroes boolean not null default false;

create index if not exists idx_runs_wallet_completed_at on public.runs (wallet_address, completed_at desc);
create index if not exists idx_runs_best_wave on public.runs (wave_reached desc, completed_at desc);
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
