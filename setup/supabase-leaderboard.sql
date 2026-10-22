-- DON'T LIKE YOUR MOM v0.5.0 | Supabase SQL Editor: paste & Run once.
-- WARNING: public leaderboard with nickname, no login; reasonable checks do not prevent determined cheaters.
-- All times are stored in UTC; "today" uses Asia/Taipei date.

create table if not exists public.dlym_round_tickets (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default clock_timestamp(),
  claimed_at timestamptz
);
create table if not exists public.dlym_leaderboard_scores (
  id bigint generated always as identity primary key,
  ticket uuid not null unique references public.dlym_round_tickets(id),
  player_name text not null check (char_length(player_name) between 2 and 16),
  likes integer not null check (likes between 0 and 160),
  hidden_avoided integer not null check (hidden_avoided between 0 and 160),
  best_combo integer not null check (best_combo between 0 and 160),
  submitted_at timestamptz not null default clock_timestamp()
);
create index if not exists dlym_scores_order_idx
on public.dlym_leaderboard_scores (likes desc, hidden_avoided desc, submitted_at asc);
create index if not exists dlym_scores_time_idx
on public.dlym_leaderboard_scores (submitted_at desc);

-- Deny direct access. The only public entry points are the restricted RPC functions below.
alter table public.dlym_round_tickets enable row level security;
alter table public.dlym_leaderboard_scores enable row level security;
revoke all on public.dlym_round_tickets from public, anon, authenticated;
revoke all on public.dlym_leaderboard_scores from public, anon, authenticated;

create or replace function public.dlym_start_round()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_ticket uuid;
begin
  insert into public.dlym_round_tickets default values returning id into v_ticket;
  return v_ticket;
end;
$$;

create or replace function public.dlym_submit_score(
  p_ticket uuid,
  p_name text,
  p_likes integer,
  p_hidden_avoided integer,
  p_best_combo integer,
  p_elapsed_ms integer
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_started timestamptz;
  v_claimed timestamptz;
  v_seconds numeric;
  v_name text := btrim(p_name);
begin
  if p_ticket is null or v_name is null or char_length(v_name) not between 2 and 16
     or v_name ~ '[[:cntrl:]]'
     or p_likes is null or p_likes not between 0 and 160
     or p_hidden_avoided is null or p_hidden_avoided not between 0 and 160
     or p_best_combo is null or p_best_combo not between 0 and 160
     or p_best_combo > p_likes + p_hidden_avoided
     or p_elapsed_ms is null or p_elapsed_ms not between 44000 and 45000
  then
    raise exception 'Invalid score submission';
  end if;

  select started_at, claimed_at into v_started, v_claimed
    from public.dlym_round_tickets where id = p_ticket for update;
  if not found or v_claimed is not null then
    raise exception 'Invalid or already used round ticket';
  end if;
  v_seconds := extract(epoch from (clock_timestamp() - v_started));
  -- A valid survived round lasts 45s; allow the player time to enter a nickname afterward.
  -- Tolerate ~5s start-request network delay; tickets expire after one hour.
  if v_seconds < 40 or v_seconds > 3600 then
    raise exception 'Round duration mismatch';
  end if;
  -- Cannot be faster than the swipe animation allows (~225ms per card); 180ms tolerance.
  if p_likes + p_hidden_avoided > floor((v_seconds * 1000 + 1000) / 180) then
    raise exception 'Implausible number of swipes';
  end if;
  update public.dlym_round_tickets set claimed_at = clock_timestamp() where id = p_ticket;
  insert into public.dlym_leaderboard_scores
    (ticket, player_name, likes, hidden_avoided, best_combo)
  values (p_ticket, v_name, p_likes, p_hidden_avoided, p_best_combo);
  return true;
end;
$$;

create or replace function public.dlym_get_leaderboard(p_scope text default 'all')
returns table (
  rank_no bigint,
  player_name text,
  likes integer,
  hidden_avoided integer,
  best_combo integer,
  submitted_at timestamptz
)
language plpgsql security definer stable set search_path = ''
as $$
begin
  if p_scope is null or p_scope not in ('all','today') then
    raise exception 'Invalid leaderboard scope';
  end if;
  return query
    select row_number() over (order by s.likes desc, s.hidden_avoided desc,
                               s.best_combo desc, s.submitted_at asc)::bigint as rank_no,
           s.player_name, s.likes, s.hidden_avoided, s.best_combo, s.submitted_at
      from public.dlym_leaderboard_scores s
     where p_scope = 'all'
        or (s.submitted_at at time zone 'Asia/Taipei')::date =
           (now() at time zone 'Asia/Taipei')::date
     order by s.likes desc, s.hidden_avoided desc, s.best_combo desc, s.submitted_at asc
     limit 100;
end;
$$;

revoke all on function public.dlym_start_round() from public;
revoke all on function public.dlym_submit_score(uuid,text,integer,integer,integer,integer) from public;
revoke all on function public.dlym_get_leaderboard(text) from public;
grant execute on function public.dlym_start_round() to anon, authenticated;
grant execute on function public.dlym_submit_score(uuid,text,integer,integer,integer,integer) to anon, authenticated;
grant execute on function public.dlym_get_leaderboard(text) to anon, authenticated;

-- Check with: select * from public.dlym_get_leaderboard('all');
-- NOTE: No arbitrary write access. However anonymous web users can forge gameplay
-- or make many tickets; competitive public tournaments require authentication,
-- rate limiting (gateway/Edge Function), and trusted server-side game verification.
