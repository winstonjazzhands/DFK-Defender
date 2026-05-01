alter table public.daily_raffle_results
  add column if not exists winner_index integer not null default 1;

-- The old key was one row per day/type/slot. Drop it before collapsing 00/12 into one slot.
alter table public.daily_raffle_results
  drop constraint if exists daily_raffle_results_pkey;

-- Collapse the old 00/12 two-slot model into one 00:00 UTC draw with up to two winners.
-- If a day already has two rows, keep both as winner #1 and winner #2.
with ranked as (
  select
    ctid,
    row_number() over (
      partition by raffle_day, raffle_type
      order by
        case when draw_slot = '00' then 1 when draw_slot = '12' then 2 else 3 end,
        settled_at nulls last,
        created_at nulls last
    ) as rn
  from public.daily_raffle_results
)
update public.daily_raffle_results d
set
  draw_slot = '00',
  winner_index = least(r.rn, 2)
from ranked r
where d.ctid = r.ctid;

-- Keep at most two historical rows per day/type before adding the new primary key.
delete from public.daily_raffle_results d
using (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by raffle_day, raffle_type
        order by winner_index asc, settled_at nulls last, created_at nulls last
      ) as rn
    from public.daily_raffle_results
  ) ranked
  where rn > 2
) extra
where d.ctid = extra.ctid;

alter table public.daily_raffle_results
  drop constraint if exists daily_raffle_results_winner_index_check;

alter table public.daily_raffle_results
  add constraint daily_raffle_results_winner_index_check
  check (winner_index between 1 and 2);

alter table public.daily_raffle_results
  drop constraint if exists daily_raffle_results_draw_slot_check;

alter table public.daily_raffle_results
  add constraint daily_raffle_results_draw_slot_check
  check (draw_slot in ('00'));

alter table public.daily_raffle_results
  add constraint daily_raffle_results_pkey
  primary key (raffle_day, raffle_type, draw_slot, winner_index);

create index if not exists idx_daily_raffle_results_settled_at
  on public.daily_raffle_results (raffle_type, draw_slot, settled_at desc);
