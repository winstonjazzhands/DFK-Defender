-- Harden run submission idempotency so the same client run cannot be inserted twice.
-- If older data somehow contains duplicates, keep the earliest created row and remove later copies
-- before enforcing the unique index.

with ranked as (
  select id,
         row_number() over (
           partition by lower(trim(client_run_id))
           order by created_at asc nulls last, completed_at asc nulls last, id asc
         ) as rn
  from public.runs
  where client_run_id is not null
    and length(trim(client_run_id)) > 0
)
delete from public.runs r
using ranked d
where r.id = d.id
  and d.rn > 1;

create unique index if not exists uq_runs_client_run_id_lower
  on public.runs ((lower(trim(client_run_id))));
