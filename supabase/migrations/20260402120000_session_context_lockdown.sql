alter table public.wallet_sessions
  add column if not exists session_origin text,
  add column if not exists user_agent_hash text;
