drop extension if exists "pg_net";

create sequence "public"."bounties_id_seq";

create sequence "public"."crypto_payment_sessions_id_seq";


  create table "public"."bounties" (
    "id" bigint not null default nextval('public.bounties_id_seq'::regclass),
    "sort_order" integer not null,
    "title" text not null,
    "reward_text" text not null,
    "required_wave" integer not null,
    "detail" text not null default ''::text,
    "unlock_delay_hours" integer not null default 24,
    "reveal_at" timestamp with time zone not null default now(),
    "claimed_by_wallet" text,
    "claimed_by_name" text,
    "claimed_run_id" uuid,
    "claimed_at" timestamp with time zone
      );


alter table "public"."bounties" enable row level security;


  create table "public"."crypto_payment_sessions" (
    "id" bigint not null default nextval('public.crypto_payment_sessions_id_seq'::regclass),
    "wallet_address" text not null,
    "client_run_id" text not null,
    "kind" text not null,
    "chain_id" integer not null,
    "expected_amount_wei" text not null,
    "status" text not null default 'pending'::text,
    "payment_tx_hash" text,
    "parent_payment_session_id" bigint,
    "metadata" jsonb not null default '{}'::jsonb,
    "confirmed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."dfk_gold_burns" (
    "id" bigint generated always as identity not null,
    "wallet_address" text not null,
    "amount" numeric not null,
    "tx_hash" text not null,
    "created_at" timestamp with time zone not null default now(),
    "confirmed_at" timestamp with time zone not null default now(),
    "chain_id" integer not null default 53935,
    "block_number" bigint,
    "burn_amount" numeric(20,3) not null default 0,
    "defender_gold_awarded" integer not null default 0
      );


alter table "public"."dfk_gold_burns" enable row level security;


  create table "public"."player_profiles" (
    "user_id" uuid not null,
    "username" text,
    "best_wave" integer not null default 0,
    "total_runs" integer not null default 0,
    "total_waves_cleared" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."player_profiles" enable row level security;


  create table "public"."players" (
    "wallet_address" text not null,
    "display_name" text,
    "best_wave" integer not null default 0,
    "total_runs" integer not null default 0,
    "total_waves_cleared" integer not null default 0,
    "last_run_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "vanity_name" text,
    "total_avax_wei_spent" text not null default '0'::text,
    "paid_games_remaining" integer default 0,
    "free_games_remaining" integer default 5,
    "last_free_reset" timestamp with time zone default now(),
    "total_paid_games_purchased" integer not null default 0,
    "free_games_last_reset" date not null default ((now() AT TIME ZONE 'utc'::text))::date,
    "used_wallet_heroes" boolean not null default false
      );


alter table "public"."players" enable row level security;


  create table "public"."run_history" (
    "id" bigint generated always as identity not null,
    "user_id" uuid not null,
    "wave_reached" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."run_history" enable row level security;


  create table "public"."runs" (
    "id" uuid not null default gen_random_uuid(),
    "wallet_address" text not null,
    "client_run_id" text not null,
    "display_name_snapshot" text,
    "game_version" text not null,
    "mode" text not null,
    "result" text not null,
    "wave_reached" integer not null default 0,
    "waves_cleared" integer not null default 0,
    "portal_hp_left" integer not null default 0,
    "gold_on_hand" integer not null default 0,
    "premium_jewels" integer not null default 0,
    "heroes_json" jsonb not null default '[]'::jsonb,
    "stats_json" jsonb not null default '{}'::jsonb,
    "run_started_at" timestamp with time zone,
    "completed_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "payment_session_id" bigint,
    "payment_tx_hash" text,
    "chain_id" integer,
    "entry_fee_wei" text not null default '0'::text,
    "powerup_spend_wei" text not null default '0'::text,
    "total_spend_wei" text not null default '0'::text,
    "shadow_payout_model" text,
    "shadow_gross_payout_wei" text not null default '0'::text,
    "shadow_net_payout_wei" text not null default '0'::text,
    "used_wallet_heroes" boolean default false
      );


alter table "public"."runs" enable row level security;


  create table "public"."wallet_auth_nonces" (
    "wallet_address" text not null,
    "nonce" text not null,
    "expires_at" timestamp with time zone not null,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."wallet_auth_nonces" enable row level security;


  create table "public"."wallet_sessions" (
    "session_token" uuid not null default gen_random_uuid(),
    "wallet_address" text not null,
    "expires_at" timestamp with time zone not null,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "last_seen_at" timestamp with time zone
      );


alter table "public"."wallet_sessions" enable row level security;

alter sequence "public"."bounties_id_seq" owned by "public"."bounties"."id";

alter sequence "public"."crypto_payment_sessions_id_seq" owned by "public"."crypto_payment_sessions"."id";

CREATE UNIQUE INDEX bounties_pkey ON public.bounties USING btree (id);

CREATE UNIQUE INDEX bounties_sort_order_key ON public.bounties USING btree (sort_order);

CREATE UNIQUE INDEX crypto_payment_sessions_pkey ON public.crypto_payment_sessions USING btree (id);

CREATE UNIQUE INDEX dfk_gold_burns_pkey ON public.dfk_gold_burns USING btree (id);

CREATE UNIQUE INDEX dfk_gold_burns_tx_hash_key ON public.dfk_gold_burns USING btree (tx_hash);

CREATE UNIQUE INDEX idx_bounties_claimed_run_unique ON public.bounties USING btree (claimed_run_id) WHERE (claimed_run_id IS NOT NULL);

CREATE INDEX idx_bounties_sort_order ON public.bounties USING btree (sort_order);

CREATE INDEX idx_crypto_payment_sessions_client_run ON public.crypto_payment_sessions USING btree (client_run_id);

CREATE INDEX idx_crypto_payment_sessions_status ON public.crypto_payment_sessions USING btree (status);

CREATE INDEX idx_crypto_payment_sessions_wallet ON public.crypto_payment_sessions USING btree (wallet_address);

CREATE INDEX idx_dfk_gold_burns_wallet ON public.dfk_gold_burns USING btree (wallet_address, confirmed_at DESC);

CREATE INDEX idx_runs_best_wave ON public.runs USING btree (wave_reached DESC, completed_at DESC);

CREATE INDEX idx_runs_wallet_completed_at ON public.runs USING btree (wallet_address, completed_at DESC);

CREATE INDEX idx_wallet_sessions_wallet ON public.wallet_sessions USING btree (wallet_address, expires_at DESC);

CREATE INDEX player_profiles_best_wave_idx ON public.player_profiles USING btree (best_wave DESC);

CREATE UNIQUE INDEX player_profiles_pkey ON public.player_profiles USING btree (user_id);

CREATE UNIQUE INDEX player_profiles_username_key ON public.player_profiles USING btree (username);

CREATE UNIQUE INDEX players_pkey ON public.players USING btree (wallet_address);

CREATE UNIQUE INDEX players_vanity_name_unique ON public.players USING btree (lower(vanity_name)) WHERE (vanity_name IS NOT NULL);

CREATE INDEX run_history_created_at_idx ON public.run_history USING btree (created_at DESC);

CREATE UNIQUE INDEX run_history_pkey ON public.run_history USING btree (id);

CREATE INDEX run_history_user_id_idx ON public.run_history USING btree (user_id);

CREATE UNIQUE INDEX runs_client_run_id_key ON public.runs USING btree (client_run_id);

CREATE UNIQUE INDEX runs_pkey ON public.runs USING btree (id);

CREATE UNIQUE INDEX unique_claimed_run ON public.bounties USING btree (claimed_run_id);

CREATE UNIQUE INDEX uq_crypto_payment_sessions_entry ON public.crypto_payment_sessions USING btree (wallet_address, client_run_id, kind) WHERE (kind = 'entry_fee'::text);

CREATE UNIQUE INDEX wallet_auth_nonces_pkey ON public.wallet_auth_nonces USING btree (wallet_address);

CREATE UNIQUE INDEX wallet_sessions_pkey ON public.wallet_sessions USING btree (session_token);

alter table "public"."bounties" add constraint "bounties_pkey" PRIMARY KEY using index "bounties_pkey";

alter table "public"."crypto_payment_sessions" add constraint "crypto_payment_sessions_pkey" PRIMARY KEY using index "crypto_payment_sessions_pkey";

alter table "public"."dfk_gold_burns" add constraint "dfk_gold_burns_pkey" PRIMARY KEY using index "dfk_gold_burns_pkey";

alter table "public"."player_profiles" add constraint "player_profiles_pkey" PRIMARY KEY using index "player_profiles_pkey";

alter table "public"."players" add constraint "players_pkey" PRIMARY KEY using index "players_pkey";

alter table "public"."run_history" add constraint "run_history_pkey" PRIMARY KEY using index "run_history_pkey";

alter table "public"."runs" add constraint "runs_pkey" PRIMARY KEY using index "runs_pkey";

alter table "public"."wallet_auth_nonces" add constraint "wallet_auth_nonces_pkey" PRIMARY KEY using index "wallet_auth_nonces_pkey";

alter table "public"."wallet_sessions" add constraint "wallet_sessions_pkey" PRIMARY KEY using index "wallet_sessions_pkey";

alter table "public"."bounties" add constraint "bounties_claimed_by_wallet_fkey" FOREIGN KEY (claimed_by_wallet) REFERENCES public.players(wallet_address) ON DELETE SET NULL not valid;

alter table "public"."bounties" validate constraint "bounties_claimed_by_wallet_fkey";

alter table "public"."bounties" add constraint "bounties_claimed_run_id_fkey" FOREIGN KEY (claimed_run_id) REFERENCES public.runs(id) ON DELETE SET NULL not valid;

alter table "public"."bounties" validate constraint "bounties_claimed_run_id_fkey";

alter table "public"."bounties" add constraint "bounties_required_wave_check" CHECK ((required_wave > 0)) not valid;

alter table "public"."bounties" validate constraint "bounties_required_wave_check";

alter table "public"."bounties" add constraint "bounties_sort_order_key" UNIQUE using index "bounties_sort_order_key";

alter table "public"."bounties" add constraint "bounties_unlock_delay_hours_check" CHECK ((unlock_delay_hours >= 0)) not valid;

alter table "public"."bounties" validate constraint "bounties_unlock_delay_hours_check";

alter table "public"."bounties" add constraint "unique_claimed_run" UNIQUE using index "unique_claimed_run";

alter table "public"."crypto_payment_sessions" add constraint "crypto_payment_sessions_kind_check" CHECK ((kind = ANY (ARRAY['entry_fee'::text, 'powerup'::text]))) not valid;

alter table "public"."crypto_payment_sessions" validate constraint "crypto_payment_sessions_kind_check";

alter table "public"."crypto_payment_sessions" add constraint "crypto_payment_sessions_parent_payment_session_id_fkey" FOREIGN KEY (parent_payment_session_id) REFERENCES public.crypto_payment_sessions(id) ON DELETE SET NULL not valid;

alter table "public"."crypto_payment_sessions" validate constraint "crypto_payment_sessions_parent_payment_session_id_fkey";

alter table "public"."crypto_payment_sessions" add constraint "crypto_payment_sessions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'expired'::text, 'failed'::text]))) not valid;

alter table "public"."crypto_payment_sessions" validate constraint "crypto_payment_sessions_status_check";

alter table "public"."dfk_gold_burns" add constraint "dfk_gold_burns_amount_check" CHECK ((amount >= (0)::numeric)) not valid;

alter table "public"."dfk_gold_burns" validate constraint "dfk_gold_burns_amount_check";

alter table "public"."dfk_gold_burns" add constraint "dfk_gold_burns_tx_hash_key" UNIQUE using index "dfk_gold_burns_tx_hash_key";

alter table "public"."player_profiles" add constraint "player_profiles_best_wave_nonnegative" CHECK ((best_wave >= 0)) not valid;

alter table "public"."player_profiles" validate constraint "player_profiles_best_wave_nonnegative";

alter table "public"."player_profiles" add constraint "player_profiles_total_runs_nonnegative" CHECK ((total_runs >= 0)) not valid;

alter table "public"."player_profiles" validate constraint "player_profiles_total_runs_nonnegative";

alter table "public"."player_profiles" add constraint "player_profiles_total_waves_nonnegative" CHECK ((total_waves_cleared >= 0)) not valid;

alter table "public"."player_profiles" validate constraint "player_profiles_total_waves_nonnegative";

alter table "public"."player_profiles" add constraint "player_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."player_profiles" validate constraint "player_profiles_user_id_fkey";

alter table "public"."player_profiles" add constraint "player_profiles_username_key" UNIQUE using index "player_profiles_username_key";

alter table "public"."player_profiles" add constraint "player_profiles_username_length" CHECK (((username IS NULL) OR ((char_length(username) >= 3) AND (char_length(username) <= 24)))) not valid;

alter table "public"."player_profiles" validate constraint "player_profiles_username_length";

alter table "public"."players" add constraint "players_best_wave_check" CHECK ((best_wave >= 0)) not valid;

alter table "public"."players" validate constraint "players_best_wave_check";

alter table "public"."players" add constraint "players_total_runs_check" CHECK ((total_runs >= 0)) not valid;

alter table "public"."players" validate constraint "players_total_runs_check";

alter table "public"."players" add constraint "players_total_waves_cleared_check" CHECK ((total_waves_cleared >= 0)) not valid;

alter table "public"."players" validate constraint "players_total_waves_cleared_check";

alter table "public"."players" add constraint "players_wallet_lowercase" CHECK ((wallet_address = lower(wallet_address))) not valid;

alter table "public"."players" validate constraint "players_wallet_lowercase";

alter table "public"."run_history" add constraint "run_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."run_history" validate constraint "run_history_user_id_fkey";

alter table "public"."run_history" add constraint "run_history_wave_nonnegative" CHECK ((wave_reached >= 0)) not valid;

alter table "public"."run_history" validate constraint "run_history_wave_nonnegative";

alter table "public"."runs" add constraint "runs_client_run_id_key" UNIQUE using index "runs_client_run_id_key";

alter table "public"."runs" add constraint "runs_gold_on_hand_check" CHECK ((gold_on_hand >= 0)) not valid;

alter table "public"."runs" validate constraint "runs_gold_on_hand_check";

alter table "public"."runs" add constraint "runs_payment_session_id_fkey" FOREIGN KEY (payment_session_id) REFERENCES public.crypto_payment_sessions(id) ON DELETE SET NULL not valid;

alter table "public"."runs" validate constraint "runs_payment_session_id_fkey";

alter table "public"."runs" add constraint "runs_portal_hp_left_check" CHECK ((portal_hp_left >= 0)) not valid;

alter table "public"."runs" validate constraint "runs_portal_hp_left_check";

alter table "public"."runs" add constraint "runs_premium_jewels_check" CHECK ((premium_jewels >= 0)) not valid;

alter table "public"."runs" validate constraint "runs_premium_jewels_check";

alter table "public"."runs" add constraint "runs_wallet_address_fkey" FOREIGN KEY (wallet_address) REFERENCES public.players(wallet_address) ON DELETE CASCADE not valid;

alter table "public"."runs" validate constraint "runs_wallet_address_fkey";

alter table "public"."runs" add constraint "runs_wallet_lowercase" CHECK ((wallet_address = lower(wallet_address))) not valid;

alter table "public"."runs" validate constraint "runs_wallet_lowercase";

alter table "public"."runs" add constraint "runs_wave_reached_check" CHECK ((wave_reached >= 0)) not valid;

alter table "public"."runs" validate constraint "runs_wave_reached_check";

alter table "public"."runs" add constraint "runs_waves_cleared_check" CHECK ((waves_cleared >= 0)) not valid;

alter table "public"."runs" validate constraint "runs_waves_cleared_check";

alter table "public"."wallet_auth_nonces" add constraint "wallet_auth_nonces_wallet_lowercase" CHECK ((wallet_address = lower(wallet_address))) not valid;

alter table "public"."wallet_auth_nonces" validate constraint "wallet_auth_nonces_wallet_lowercase";

alter table "public"."wallet_sessions" add constraint "wallet_sessions_wallet_address_fkey" FOREIGN KEY (wallet_address) REFERENCES public.players(wallet_address) ON DELETE CASCADE not valid;

alter table "public"."wallet_sessions" validate constraint "wallet_sessions_wallet_address_fkey";

alter table "public"."wallet_sessions" add constraint "wallet_sessions_wallet_lowercase" CHECK ((wallet_address = lower(wallet_address))) not valid;

alter table "public"."wallet_sessions" validate constraint "wallet_sessions_wallet_lowercase";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
 RETURNS TABLE(username text, best_wave integer, total_runs integer, total_waves_cleared integer, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    coalesce(nullif(trim(p.username), ''), 'Anonymous') as username,
    p.best_wave,
    p.total_runs,
    p.total_waves_cleared,
    p.updated_at
  from public.player_profiles p
  order by p.best_wave desc, p.total_waves_cleared desc, p.total_runs desc, p.updated_at asc
  limit 100;
$function$
;

create or replace view "public"."global_burn_stats" as  SELECT COALESCE(sum(amount), (0)::numeric) AS total_burned
   FROM public.dfk_gold_burns;


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.player_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$function$
;

create or replace view "public"."public_run_leaderboard" as  SELECT wallet_address,
    vanity_name,
    COALESCE(vanity_name, display_name, wallet_address) AS display_name,
    used_wallet_heroes,
    best_wave,
    total_runs,
    total_waves_cleared,
    last_run_at,
    updated_at
   FROM public.players
  ORDER BY best_wave DESC, total_waves_cleared DESC, updated_at DESC, wallet_address;


CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_run_event(p_best_wave integer, p_total_runs integer, p_total_waves_cleared integer)
 RETURNS TABLE(best_wave integer, total_runs integer, total_waves_cleared integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_best_wave < 0 or p_total_runs < 0 or p_total_waves_cleared < 0 then
    raise exception 'Values must be non-negative';
  end if;

  insert into public.player_profiles (
    user_id,
    best_wave,
    total_runs,
    total_waves_cleared,
    updated_at
  )
  values (
    v_user_id,
    p_best_wave,
    p_total_runs,
    p_total_waves_cleared,
    now()
  )
  on conflict (user_id)
  do update set
    best_wave = greatest(public.player_profiles.best_wave, excluded.best_wave),
    total_runs = greatest(public.player_profiles.total_runs, excluded.total_runs),
    total_waves_cleared = greatest(public.player_profiles.total_waves_cleared, excluded.total_waves_cleared),
    updated_at = now();

  insert into public.run_history (
    user_id,
    wave_reached,
    created_at
  )
  values (
    v_user_id,
    p_best_wave,
    now()
  );

  return query
  select
    pp.best_wave,
    pp.total_runs,
    pp.total_waves_cleared
  from public.player_profiles pp
  where pp.user_id = v_user_id;
end;
$function$
;

grant delete on table "public"."bounties" to "anon";

grant insert on table "public"."bounties" to "anon";

grant references on table "public"."bounties" to "anon";

grant select on table "public"."bounties" to "anon";

grant trigger on table "public"."bounties" to "anon";

grant truncate on table "public"."bounties" to "anon";

grant update on table "public"."bounties" to "anon";

grant delete on table "public"."bounties" to "authenticated";

grant insert on table "public"."bounties" to "authenticated";

grant references on table "public"."bounties" to "authenticated";

grant select on table "public"."bounties" to "authenticated";

grant trigger on table "public"."bounties" to "authenticated";

grant truncate on table "public"."bounties" to "authenticated";

grant update on table "public"."bounties" to "authenticated";

grant delete on table "public"."bounties" to "service_role";

grant insert on table "public"."bounties" to "service_role";

grant references on table "public"."bounties" to "service_role";

grant select on table "public"."bounties" to "service_role";

grant trigger on table "public"."bounties" to "service_role";

grant truncate on table "public"."bounties" to "service_role";

grant update on table "public"."bounties" to "service_role";

grant delete on table "public"."crypto_payment_sessions" to "anon";

grant insert on table "public"."crypto_payment_sessions" to "anon";

grant references on table "public"."crypto_payment_sessions" to "anon";

grant select on table "public"."crypto_payment_sessions" to "anon";

grant trigger on table "public"."crypto_payment_sessions" to "anon";

grant truncate on table "public"."crypto_payment_sessions" to "anon";

grant update on table "public"."crypto_payment_sessions" to "anon";

grant delete on table "public"."crypto_payment_sessions" to "authenticated";

grant insert on table "public"."crypto_payment_sessions" to "authenticated";

grant references on table "public"."crypto_payment_sessions" to "authenticated";

grant select on table "public"."crypto_payment_sessions" to "authenticated";

grant trigger on table "public"."crypto_payment_sessions" to "authenticated";

grant truncate on table "public"."crypto_payment_sessions" to "authenticated";

grant update on table "public"."crypto_payment_sessions" to "authenticated";

grant delete on table "public"."crypto_payment_sessions" to "service_role";

grant insert on table "public"."crypto_payment_sessions" to "service_role";

grant references on table "public"."crypto_payment_sessions" to "service_role";

grant select on table "public"."crypto_payment_sessions" to "service_role";

grant trigger on table "public"."crypto_payment_sessions" to "service_role";

grant truncate on table "public"."crypto_payment_sessions" to "service_role";

grant update on table "public"."crypto_payment_sessions" to "service_role";

grant delete on table "public"."dfk_gold_burns" to "anon";

grant insert on table "public"."dfk_gold_burns" to "anon";

grant references on table "public"."dfk_gold_burns" to "anon";

grant select on table "public"."dfk_gold_burns" to "anon";

grant trigger on table "public"."dfk_gold_burns" to "anon";

grant truncate on table "public"."dfk_gold_burns" to "anon";

grant update on table "public"."dfk_gold_burns" to "anon";

grant delete on table "public"."dfk_gold_burns" to "authenticated";

grant insert on table "public"."dfk_gold_burns" to "authenticated";

grant references on table "public"."dfk_gold_burns" to "authenticated";

grant select on table "public"."dfk_gold_burns" to "authenticated";

grant trigger on table "public"."dfk_gold_burns" to "authenticated";

grant truncate on table "public"."dfk_gold_burns" to "authenticated";

grant update on table "public"."dfk_gold_burns" to "authenticated";

grant delete on table "public"."dfk_gold_burns" to "service_role";

grant insert on table "public"."dfk_gold_burns" to "service_role";

grant references on table "public"."dfk_gold_burns" to "service_role";

grant select on table "public"."dfk_gold_burns" to "service_role";

grant trigger on table "public"."dfk_gold_burns" to "service_role";

grant truncate on table "public"."dfk_gold_burns" to "service_role";

grant update on table "public"."dfk_gold_burns" to "service_role";

grant delete on table "public"."player_profiles" to "anon";

grant insert on table "public"."player_profiles" to "anon";

grant references on table "public"."player_profiles" to "anon";

grant select on table "public"."player_profiles" to "anon";

grant trigger on table "public"."player_profiles" to "anon";

grant truncate on table "public"."player_profiles" to "anon";

grant update on table "public"."player_profiles" to "anon";

grant delete on table "public"."player_profiles" to "authenticated";

grant insert on table "public"."player_profiles" to "authenticated";

grant references on table "public"."player_profiles" to "authenticated";

grant select on table "public"."player_profiles" to "authenticated";

grant trigger on table "public"."player_profiles" to "authenticated";

grant truncate on table "public"."player_profiles" to "authenticated";

grant update on table "public"."player_profiles" to "authenticated";

grant delete on table "public"."player_profiles" to "service_role";

grant insert on table "public"."player_profiles" to "service_role";

grant references on table "public"."player_profiles" to "service_role";

grant select on table "public"."player_profiles" to "service_role";

grant trigger on table "public"."player_profiles" to "service_role";

grant truncate on table "public"."player_profiles" to "service_role";

grant update on table "public"."player_profiles" to "service_role";

grant delete on table "public"."players" to "anon";

grant insert on table "public"."players" to "anon";

grant references on table "public"."players" to "anon";

grant select on table "public"."players" to "anon";

grant trigger on table "public"."players" to "anon";

grant truncate on table "public"."players" to "anon";

grant update on table "public"."players" to "anon";

grant delete on table "public"."players" to "authenticated";

grant insert on table "public"."players" to "authenticated";

grant references on table "public"."players" to "authenticated";

grant select on table "public"."players" to "authenticated";

grant trigger on table "public"."players" to "authenticated";

grant truncate on table "public"."players" to "authenticated";

grant update on table "public"."players" to "authenticated";

grant delete on table "public"."players" to "service_role";

grant insert on table "public"."players" to "service_role";

grant references on table "public"."players" to "service_role";

grant select on table "public"."players" to "service_role";

grant trigger on table "public"."players" to "service_role";

grant truncate on table "public"."players" to "service_role";

grant update on table "public"."players" to "service_role";

grant delete on table "public"."run_history" to "anon";

grant insert on table "public"."run_history" to "anon";

grant references on table "public"."run_history" to "anon";

grant select on table "public"."run_history" to "anon";

grant trigger on table "public"."run_history" to "anon";

grant truncate on table "public"."run_history" to "anon";

grant update on table "public"."run_history" to "anon";

grant delete on table "public"."run_history" to "authenticated";

grant insert on table "public"."run_history" to "authenticated";

grant references on table "public"."run_history" to "authenticated";

grant select on table "public"."run_history" to "authenticated";

grant trigger on table "public"."run_history" to "authenticated";

grant truncate on table "public"."run_history" to "authenticated";

grant update on table "public"."run_history" to "authenticated";

grant delete on table "public"."run_history" to "service_role";

grant insert on table "public"."run_history" to "service_role";

grant references on table "public"."run_history" to "service_role";

grant select on table "public"."run_history" to "service_role";

grant trigger on table "public"."run_history" to "service_role";

grant truncate on table "public"."run_history" to "service_role";

grant update on table "public"."run_history" to "service_role";

grant delete on table "public"."runs" to "anon";

grant insert on table "public"."runs" to "anon";

grant references on table "public"."runs" to "anon";

grant select on table "public"."runs" to "anon";

grant trigger on table "public"."runs" to "anon";

grant truncate on table "public"."runs" to "anon";

grant update on table "public"."runs" to "anon";

grant delete on table "public"."runs" to "authenticated";

grant insert on table "public"."runs" to "authenticated";

grant references on table "public"."runs" to "authenticated";

grant select on table "public"."runs" to "authenticated";

grant trigger on table "public"."runs" to "authenticated";

grant truncate on table "public"."runs" to "authenticated";

grant update on table "public"."runs" to "authenticated";

grant delete on table "public"."runs" to "service_role";

grant insert on table "public"."runs" to "service_role";

grant references on table "public"."runs" to "service_role";

grant select on table "public"."runs" to "service_role";

grant trigger on table "public"."runs" to "service_role";

grant truncate on table "public"."runs" to "service_role";

grant update on table "public"."runs" to "service_role";

grant delete on table "public"."wallet_auth_nonces" to "anon";

grant insert on table "public"."wallet_auth_nonces" to "anon";

grant references on table "public"."wallet_auth_nonces" to "anon";

grant select on table "public"."wallet_auth_nonces" to "anon";

grant trigger on table "public"."wallet_auth_nonces" to "anon";

grant truncate on table "public"."wallet_auth_nonces" to "anon";

grant update on table "public"."wallet_auth_nonces" to "anon";

grant delete on table "public"."wallet_auth_nonces" to "authenticated";

grant insert on table "public"."wallet_auth_nonces" to "authenticated";

grant references on table "public"."wallet_auth_nonces" to "authenticated";

grant select on table "public"."wallet_auth_nonces" to "authenticated";

grant trigger on table "public"."wallet_auth_nonces" to "authenticated";

grant truncate on table "public"."wallet_auth_nonces" to "authenticated";

grant update on table "public"."wallet_auth_nonces" to "authenticated";

grant delete on table "public"."wallet_auth_nonces" to "service_role";

grant insert on table "public"."wallet_auth_nonces" to "service_role";

grant references on table "public"."wallet_auth_nonces" to "service_role";

grant select on table "public"."wallet_auth_nonces" to "service_role";

grant trigger on table "public"."wallet_auth_nonces" to "service_role";

grant truncate on table "public"."wallet_auth_nonces" to "service_role";

grant update on table "public"."wallet_auth_nonces" to "service_role";

grant delete on table "public"."wallet_sessions" to "anon";

grant insert on table "public"."wallet_sessions" to "anon";

grant references on table "public"."wallet_sessions" to "anon";

grant select on table "public"."wallet_sessions" to "anon";

grant trigger on table "public"."wallet_sessions" to "anon";

grant truncate on table "public"."wallet_sessions" to "anon";

grant update on table "public"."wallet_sessions" to "anon";

grant delete on table "public"."wallet_sessions" to "authenticated";

grant insert on table "public"."wallet_sessions" to "authenticated";

grant references on table "public"."wallet_sessions" to "authenticated";

grant select on table "public"."wallet_sessions" to "authenticated";

grant trigger on table "public"."wallet_sessions" to "authenticated";

grant truncate on table "public"."wallet_sessions" to "authenticated";

grant update on table "public"."wallet_sessions" to "authenticated";

grant delete on table "public"."wallet_sessions" to "service_role";

grant insert on table "public"."wallet_sessions" to "service_role";

grant references on table "public"."wallet_sessions" to "service_role";

grant select on table "public"."wallet_sessions" to "service_role";

grant trigger on table "public"."wallet_sessions" to "service_role";

grant truncate on table "public"."wallet_sessions" to "service_role";

grant update on table "public"."wallet_sessions" to "service_role";


  create policy "bounties_read_none"
  on "public"."bounties"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "dfk_gold_burns_read_none"
  on "public"."dfk_gold_burns"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "profiles are viewable by everyone"
  on "public"."player_profiles"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "users can insert their own profile"
  on "public"."player_profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "users can update their own profile"
  on "public"."player_profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "players_no_direct_write"
  on "public"."players"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "players_public_read"
  on "public"."players"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "users can insert their own run history"
  on "public"."run_history"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "users can view their own run history"
  on "public"."run_history"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "runs_read_none"
  on "public"."runs"
  as permissive
  for select
  to anon, authenticated
using (false);



  create policy "runs_write_none"
  on "public"."runs"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "nonces_write_none"
  on "public"."wallet_auth_nonces"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "sessions_write_none"
  on "public"."wallet_sessions"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);


CREATE TRIGGER trg_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


