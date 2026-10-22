-- DON'T LIKE YOUR MOM v0.7.1 — 永久「歷代日冠」
-- 貼到「原本排行榜」的 Supabase 專案 SQL Editor，整份執行一次即可。
-- 注意：不要執行在新專案；不會清除、修改原本排行榜或照片投稿資料。
-- 台灣時間 00:00 換日。每天只有最終第一名入選；依原排行榜排序規則。
-- 不使用付費排程：開啟「歷代日冠」時自動補存所有已結束的日期（含安裝前）。

begin;

create table if not exists public.dlym_daily_champions (
  champion_date date primary key,
  score_id bigint not null unique references public.dlym_leaderboard_scores(id),
  player_name text not null,
  likes integer not null,
  hidden_avoided integer not null,
  best_combo integer not null,
  submitted_at timestamptz not null,
  archived_at timestamptz not null default clock_timestamp()
);

-- 只能透過受限制的 RPC 讀取，無法直接由公開網頁修改冠軍紀錄。
alter table public.dlym_daily_champions enable row level security;
revoke all on public.dlym_daily_champions from public, anon, authenticated;

-- 每次查詢歷代日冠時補存「已結束日期」中尚未保存的冠軍。
-- 依序比：LIKE ↓、躲過媽媽 ↓、COMBO ↓、上榜時間 ↑、ID ↑。
-- ON CONFLICT DO NOTHING：已封存冠軍不會被之後的查詢改寫。
create or replace function public.dlym_archive_daily_champions()
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare v_added integer := 0;
begin
  with unarchived_scores as (
    select s.id, s.player_name, s.likes, s.hidden_avoided, s.best_combo,
           s.submitted_at,
           (s.submitted_at at time zone 'Asia/Taipei')::date as local_date
    from public.dlym_leaderboard_scores s
    where (s.submitted_at at time zone 'Asia/Taipei')::date <
          (now() at time zone 'Asia/Taipei')::date
      and not exists (
        select 1 from public.dlym_daily_champions c
        where c.champion_date = (s.submitted_at at time zone 'Asia/Taipei')::date
      )
  ),
  ranked as (
    select u.*,
           row_number() over (
             partition by u.local_date
             order by u.likes desc, u.hidden_avoided desc,
                      u.best_combo desc, u.submitted_at asc, u.id asc
           ) as day_rank
    from unarchived_scores u
  )
  insert into public.dlym_daily_champions
    (champion_date, score_id, player_name, likes, hidden_avoided, best_combo, submitted_at)
  select r.local_date, r.id, r.player_name, r.likes,
         r.hidden_avoided, r.best_combo, r.submitted_at
  from ranked r
  where r.day_rank = 1
  on conflict (champion_date) do nothing;

  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

create or replace function public.dlym_get_daily_champions(
  p_offset integer default 0,
  p_limit integer default 40
)
returns table (
  champion_date date,
  player_name text,
  likes integer,
  hidden_avoided integer,
  best_combo integer,
  submitted_at timestamptz
)
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_offset is null or p_offset < 0 or p_offset > 100000
    or p_limit is null or p_limit < 1 or p_limit > 100
  then
    raise exception 'Invalid champions page';
  end if;

  -- 閱讀前自動補存已結束的日榜，無須設定 pg_cron。
  perform public.dlym_archive_daily_champions();

  return query
    select c.champion_date, c.player_name, c.likes,
           c.hidden_avoided, c.best_combo, c.submitted_at
    from public.dlym_daily_champions c
    order by c.champion_date desc
    limit p_limit offset p_offset;
end;
$$;

-- 僅允許公開呼叫「讀取並自動封存」的 RPC；不開放直接封存函式與資料表。
revoke all on function public.dlym_archive_daily_champions() from public, anon, authenticated;
revoke all on function public.dlym_get_daily_champions(integer,integer) from public, anon, authenticated;
grant execute on function public.dlym_get_daily_champions(integer,integer) to anon, authenticated;

commit;

-- 首次補存歷史上所有已完成的日期；可重複執行，不會洗掉冠軍。
select public.dlym_archive_daily_champions() as newly_archived_days;

-- 新函式加入 REST API 目錄。
notify pgrst, 'reload schema';

-- 安裝完成後的檢查（最多顯示最近 10 天冠軍）：
select champion_date, player_name, likes, hidden_avoided, best_combo
from public.dlym_daily_champions
order by champion_date desc
limit 10;
