alter table public.daily_raffle_results
  add column if not exists draw_slot text not null default 'morning';

update public.daily_raffle_results
set draw_slot = 'morning'
where coalesce(draw_slot, '') not in ('morning', 'midday');

alter table public.daily_raffle_results
  drop constraint if exists daily_raffle_results_pkey;

alter table public.daily_raffle_results
  add constraint daily_raffle_results_draw_slot_check
  check (draw_slot in ('morning', 'midday'));

alter table public.daily_raffle_results
  add constraint daily_raffle_results_pkey primary key (raffle_day, raffle_type, draw_slot);

drop index if exists idx_daily_raffle_results_settled_at;
drop index if exists idx_daily_raffle_results_type_settled_at;
create index if not exists idx_daily_raffle_results_settled_at
  on public.daily_raffle_results (raffle_type, draw_slot, settled_at desc);
