
alter table public.daily_raffle_results
  add column if not exists raffle_type text not null default 'dfk';

alter table public.daily_raffle_results
  add column if not exists raffle_chain_id bigint;

update public.daily_raffle_results
set raffle_chain_id = case
  when coalesce(raffle_type, 'dfk') = 'avax' then 43114
  else 53935
end
where raffle_chain_id is null;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'daily_raffle_results'
      and constraint_name = 'daily_raffle_results_pkey'
  ) then
    alter table public.daily_raffle_results drop constraint daily_raffle_results_pkey;
  end if;
exception when undefined_object then
  null;
end $$;

alter table public.daily_raffle_results
  add constraint daily_raffle_results_pkey primary key (raffle_day, raffle_type);

create index if not exists idx_daily_raffle_results_type_settled_at
  on public.daily_raffle_results (raffle_type, settled_at desc);

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
        'daily_raffle_avax'::text
      ]
    )
  );
