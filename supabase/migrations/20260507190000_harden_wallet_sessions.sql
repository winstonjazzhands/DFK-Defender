-- Harden wallet session table defaults for run tracking auth.
create table if not exists public.wallet_sessions (
  session_token uuid primary key,
  wallet_address text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz null default now(),
  session_origin text null,
  user_agent_hash text null
);

alter table public.wallet_sessions
  alter column created_at set default now();

alter table public.wallet_sessions
  alter column last_seen_at set default now();

create index if not exists wallet_sessions_wallet_address_idx
  on public.wallet_sessions (lower(wallet_address));

create index if not exists wallet_sessions_expires_at_idx
  on public.wallet_sessions (expires_at);
