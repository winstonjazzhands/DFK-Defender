do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'wallet_sessions'
  ) then
    alter table public.wallet_sessions
      add column if not exists session_origin text,
      add column if not exists user_agent_hash text;
  end if;
end $$;