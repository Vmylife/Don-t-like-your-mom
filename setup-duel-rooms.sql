-- DON'T LIKE YOUR MOM v0.6.0 - synchronous two-player rooms.
-- Run once in the SAME Supabase project as your existing leaderboard.
-- Room credentials are UUID bearer tokens: treat room URLs as invitation links.
create table if not exists public.dlym_duel_rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  seed text not null check (seed ~ '^[a-f0-9]{16}$'),
  deck_hash text not null check (deck_hash ~ '^[a-f0-9]{8}$'),
  host_token uuid not null default gen_random_uuid(),
  guest_token uuid,
  host_name text not null,
  guest_name text,
  host_ready boolean not null default false,
  guest_ready boolean not null default false,
  starts_at timestamptz,
  host_score integer,
  guest_score integer,
  host_survived boolean,
  guest_survived boolean,
  host_finished_at timestamptz,
  guest_finished_at timestamptz
);

-- Direct table access is disabled. Anonymous clients can only use these validated RPCs.
alter table public.dlym_duel_rooms enable row level security;
revoke all on public.dlym_duel_rooms from public, anon, authenticated;

create or replace function public.dlym_duel_create(p_seed text, p_deck text, p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.dlym_duel_rooms%rowtype;
begin
  if coalesce(p_seed, '') !~ '^[a-f0-9]{16}$' or coalesce(p_deck, '') !~ '^[a-f0-9]{8}$'
     or char_length(btrim(coalesce(p_name,''))) not between 1 and 16 then
    raise exception 'INVALID_DUEL_REQUEST';
  end if;
  insert into public.dlym_duel_rooms (seed, deck_hash, host_name)
  values (p_seed,p_deck,btrim(p_name)) returning * into r;
  return jsonb_build_object('id',r.id,'token',r.host_token,'seed',r.seed,'deck_hash',r.deck_hash);
end $$;

create or replace function public.dlym_duel_join(p_room uuid,p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.dlym_duel_rooms%rowtype;
begin
  if char_length(btrim(coalesce(p_name,''))) not between 1 and 16 then
    raise exception 'INVALID_NAME';
  end if;
  select * into r from public.dlym_duel_rooms where id = p_room for update;
  if not found or r.expires_at <= now() then raise exception 'ROOM_NOT_FOUND'; end if;
  if r.guest_token is not null then raise exception 'ROOM_FULL'; end if;
  if r.starts_at is not null then raise exception 'ROOM_ALREADY_STARTED'; end if;
  update public.dlym_duel_rooms set guest_token = gen_random_uuid(), guest_name = btrim(p_name)
    where id = p_room returning * into r;
  return jsonb_build_object('id',r.id,'token',r.guest_token,'seed',r.seed,'deck_hash',r.deck_hash);
end $$;

create or replace function public.dlym_duel_state(p_room uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.dlym_duel_rooms%rowtype;
declare side text;
begin
  select * into r from public.dlym_duel_rooms where id = p_room and expires_at > now();
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if p_token = r.host_token then side := 'host';
  elsif p_token = r.guest_token and r.guest_token is not null then side := 'guest';
  else raise exception 'INVALID_ROOM_TOKEN'; end if;
  return jsonb_build_object('id',r.id,'role',side,'seed',r.seed,'deck_hash',r.deck_hash,
    'server_time',clock_timestamp(),'expires_at',r.expires_at,'starts_at',r.starts_at,
    'host_name',r.host_name,'guest_name',r.guest_name,
    'host_ready',r.host_ready,'guest_ready',r.guest_ready,
    'host_finished',r.host_finished_at is not null,'guest_finished',r.guest_finished_at is not null,
    'host_score',r.host_score,'guest_score',r.guest_score,
    'host_survived',r.host_survived,'guest_survived',r.guest_survived);
end $$;

create or replace function public.dlym_duel_ready(p_room uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.dlym_duel_rooms%rowtype;
begin
  select * into r from public.dlym_duel_rooms where id = p_room for update;
  if not found or r.expires_at <= now() then raise exception 'ROOM_NOT_FOUND'; end if;
  if r.starts_at is not null then return jsonb_build_object('starts_at',r.starts_at); end if;
  if p_token = r.host_token then r.host_ready := true;
  elsif p_token = r.guest_token and r.guest_token is not null then r.guest_ready := true;
  else raise exception 'INVALID_ROOM_TOKEN'; end if;
  if r.host_ready and r.guest_ready then r.starts_at := clock_timestamp() + interval '4 seconds'; end if;
  update public.dlym_duel_rooms
    set host_ready = r.host_ready, guest_ready = r.guest_ready, starts_at = r.starts_at
    where id = p_room;
  return jsonb_build_object('starts_at',r.starts_at,'host_ready',r.host_ready,'guest_ready',r.guest_ready);
end $$;

create or replace function public.dlym_duel_finish(p_room uuid,p_token uuid,p_score integer,p_survived boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.dlym_duel_rooms%rowtype;
begin
  select * into r from public.dlym_duel_rooms where id = p_room for update;
  if not found or r.expires_at <= now() then raise exception 'ROOM_NOT_FOUND'; end if;
  if r.starts_at is null or clock_timestamp() < r.starts_at then raise exception 'ROUND_NOT_STARTED'; end if;
  if clock_timestamp() > r.starts_at + interval '90 seconds' then raise exception 'ROUND_EXPIRED'; end if;
  if p_score < 0 or p_score > 160 or p_survived is null then raise exception 'INVALID_SCORE'; end if;
  -- Survivors must have played almost all 45 seconds, allowing network delays.
  if p_survived and clock_timestamp() < r.starts_at + interval '44 seconds' then
    raise exception 'ROUND_TOO_SHORT';
  end if;
  if p_token = r.host_token then
    if r.host_finished_at is not null then raise exception 'SCORE_ALREADY_SUBMITTED'; end if;
    update public.dlym_duel_rooms set host_score=p_score,host_survived=p_survived,host_finished_at=clock_timestamp() where id=p_room;
  elsif p_token = r.guest_token and r.guest_token is not null then
    if r.guest_finished_at is not null then raise exception 'SCORE_ALREADY_SUBMITTED'; end if;
    update public.dlym_duel_rooms set guest_score=p_score,guest_survived=p_survived,guest_finished_at=clock_timestamp() where id=p_room;
  else raise exception 'INVALID_ROOM_TOKEN'; end if;
  return jsonb_build_object('accepted',true);
end $$;

revoke all on function public.dlym_duel_create(text,text,text) from public;
revoke all on function public.dlym_duel_join(uuid,text) from public;
revoke all on function public.dlym_duel_state(uuid,uuid) from public;
revoke all on function public.dlym_duel_ready(uuid,uuid) from public;
revoke all on function public.dlym_duel_finish(uuid,uuid,integer,boolean) from public;
grant execute on function public.dlym_duel_create(text,text,text) to anon,authenticated;
grant execute on function public.dlym_duel_join(uuid,text) to anon,authenticated;
grant execute on function public.dlym_duel_state(uuid,uuid) to anon,authenticated;
grant execute on function public.dlym_duel_ready(uuid,uuid) to anon,authenticated;
grant execute on function public.dlym_duel_finish(uuid,uuid,integer,boolean) to anon,authenticated;
