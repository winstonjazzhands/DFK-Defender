alter table public.runs
  add column if not exists replay_json jsonb;

alter table public.runs
  add column if not exists replay_share_id text;

create index if not exists idx_runs_replay_share_id
  on public.runs (replay_share_id);
