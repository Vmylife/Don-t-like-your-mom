-- DON'T LIKE YOUR MOM v0.8.3: 每個匿名投稿身份每 24 小時最多 6 件。
-- 在原本 Supabase 專案 SQL Editor 執行。只取代兩個既有函式的定義。
-- 不會刪除任何投稿、私人照片、已公開照片或排行榜資料。

-- 第一關：建立投稿紀錄前，檢查過去 24 小時已送出的投稿數量。
create or replace function public.dlym_photo_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.reviewed_at := null;
  if (
    select count(*)
    from public.dlym_photo_submissions s
    where s.owner_id = new.owner_id
      and s.created_at > now() - interval '24 hours'
  ) >= 6 then
    raise exception '24 小時內每位投稿者最多可投稿 6 張照片';
  end if;
  return new;
end;
$$;

revoke all on function public.dlym_photo_rate_limit() from public, anon, authenticated;

-- 第二關：上傳私人檔案前，限制同一身份過去 24 小時的上傳量。
create or replace function public.dlym_can_upload_photo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    select count(*)
    from storage.objects o
    where o.bucket_id = 'dlym-submissions'
      and o.name like auth.uid()::text || '/%'
      and o.created_at > now() - interval '24 hours'
  ) < 6;
$$;

revoke all on function public.dlym_can_upload_photo() from public, anon, authenticated;
grant execute on function public.dlym_can_upload_photo() to authenticated;

-- PostgreSQL 函式原本的觸發器和 RLS policy 會繼續使用更新後定義。
-- 設定完成後，可以重新開啟投稿頁測試第 4～6 筆。
