create table if not exists public.moosifer_bounty_state (
  id boolean primary key default true,
  reward_enabled boolean not null default false,
  reward_amount numeric(20,8) not null default 500,
  reward_currency text not null default 'JEWEL',
  claimed_by_wallet text references public.players(wallet_address) on delete set null,
  claimed_run_id text,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint moosifer_bounty_state_singleton check (id = true)
);

create table if not exists public.moosifer_defeats (
  id uuid primary key default gen_random_uuid(),
  run_id text unique,
  wallet_address text references public.players(wallet_address) on delete set null,
  defeated_at timestamptz not null default now(),
  wave_reached integer,
  source text not null default 'client',
  constraint moosifer_defeats_wallet_lowercase check (wallet_address is null or wallet_address = lower(wallet_address))
);

create index if not exists idx_moosifer_defeats_wallet on public.moosifer_defeats (wallet_address, defeated_at desc);

alter table public.moosifer_bounty_state enable row level security;
alter table public.moosifer_defeats enable row level security;

drop trigger if exists trg_moosifer_bounty_state_updated_at on public.moosifer_bounty_state;
create trigger trg_moosifer_bounty_state_updated_at
before update on public.moosifer_bounty_state
for each row execute function public.set_updated_at();

drop policy if exists "moosifer_bounty_state_read_none" on public.moosifer_bounty_state;
create policy "moosifer_bounty_state_read_none"
  on public.moosifer_bounty_state
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "moosifer_defeats_read_none" on public.moosifer_defeats;
create policy "moosifer_defeats_read_none"
  on public.moosifer_defeats
  for all
  to anon, authenticated
  using (false)
  with check (false);

insert into public.moosifer_bounty_state (id, reward_enabled, reward_amount, reward_currency)
values (true, false, 500, 'JEWEL')
on conflict (id) do nothing;

alter table public.reward_claim_requests
  drop constraint if exists reward_claim_requests_claim_type_check;

alter table public.reward_claim_requests
  add constraint reward_claim_requests_claim_type_check
  check (
    claim_type = any (
      array[
        'daily_quest'::text,
        'bounty'::text,
        'daily_reward'::text,
        'daily_raffle'::text,
        'daily_raffle_dfk'::text,
        'daily_raffle_avax'::text,
        'moosifer_first_defeat'::text
      ]
    )
  );
