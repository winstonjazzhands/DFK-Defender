
alter table public.runs
  add column if not exists replay_json jsonb,
  add column if not exists replay_share_id text;

create unique index if not exists runs_replay_share_id_unique on public.runs (replay_share_id)
where replay_share_id is not null;
