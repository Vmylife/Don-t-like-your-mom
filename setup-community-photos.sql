-- DON'T LIKE YOUR MOM v0.7.0 — player photo submissions
-- Execute IN YOUR EXISTING Supabase project, SQL Editor, as project owner.
-- Does not modify leaderboard / duel tables or functions.

create table if not exists public.dlym_photo_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.dlym_photo_admins enable row level security;
revoke all on public.dlym_photo_admins from public, anon, authenticated;

create or replace function public.dlym_is_photo_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.dlym_photo_admins a where a.user_id=auth.uid()
  );
$$;
revoke all on function public.dlym_is_photo_admin() from public, anon, authenticated;
grant execute on function public.dlym_is_photo_admin() to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('dlym-submissions','dlym-submissions',false,2097152,array['image/webp']::text[])
on conflict (id) do update set public=false, file_size_limit=2097152,allowed_mime_types=array['image/webp']::text[];
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('dlym-approved','dlym-approved',true,2097152,array['image/webp']::text[])
on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/webp']::text[];

create table if not exists public.dlym_photo_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  age integer not null check (age between 18 and 99),
  city text not null check (char_length(trim(city)) between 1 and 24),
  bio text not null check (char_length(trim(bio)) between 1 and 100),
  private_path text not null unique,
  approved_path text unique,
  consent boolean not null default false check (consent = true),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (status <> 'approved' or approved_path is not null)
);
create index if not exists dlym_photo_submissions_owner_created on public.dlym_photo_submissions (owner_id, created_at desc);
create index if not exists dlym_photo_submissions_status_created on public.dlym_photo_submissions (status, created_at desc);
alter table public.dlym_photo_submissions enable row level security;
revoke all on public.dlym_photo_submissions from public, anon, authenticated;
grant select, insert on public.dlym_photo_submissions to authenticated;

-- Users can see ONLY their own submission rows; admins can see all.
drop policy if exists dlym_photo_own_or_admin_read on public.dlym_photo_submissions;
create policy dlym_photo_own_or_admin_read on public.dlym_photo_submissions
for select to authenticated using (owner_id=auth.uid() or public.dlym_is_photo_admin());

-- A user can only submit a pending record for a file they uploaded privately.
drop policy if exists dlym_photo_submit_own on public.dlym_photo_submissions;
create policy dlym_photo_submit_own on public.dlym_photo_submissions
for insert to authenticated with check (
  owner_id=auth.uid() and status='pending' and approved_path is null and consent=true
  and private_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  and split_part(private_path,'/',1)=auth.uid()::text
  and exists(select 1 from storage.objects o where o.bucket_id='dlym-submissions' and o.name=private_path)
);

-- Limit successful submissions per account. This does NOT stop someone from
-- creating multiple anonymous accounts; use Auth CAPTCHA if abused.
create or replace function public.dlym_photo_rate_limit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- Never trust client-supplied timestamps (otherwise a caller could evade limits).
  new.created_at := now();
  new.reviewed_at := null;
  if (select count(*) from public.dlym_photo_submissions s
      where s.owner_id=new.owner_id and s.created_at>now()-interval '24 hours') >= 3 then
    raise exception '24 小時內每位投稿者最多可投稿 3 張照片';
  end if;
  return new;
end;
$$;
drop trigger if exists dlym_photo_rate_limit_insert on public.dlym_photo_submissions;
create trigger dlym_photo_rate_limit_insert before insert on public.dlym_photo_submissions
for each row execute function public.dlym_photo_rate_limit();
revoke all on function public.dlym_photo_rate_limit() from public,anon,authenticated;

-- Bound original uploads per anonymous identity (including orphaned files).
-- Anonymous identities can still be recreated; enable abuse/CAPTCHA protection.
create or replace function public.dlym_can_upload_photo()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and (
    select count(*) from storage.objects o
    where o.bucket_id='dlym-submissions'
      and o.name like auth.uid()::text||'/%'
      and o.created_at>now()-interval '24 hours'
  ) < 3;
$$;
revoke all on function public.dlym_can_upload_photo() from public,anon,authenticated;
grant execute on function public.dlym_can_upload_photo() to authenticated;

-- RLS for private originals. Nobody unauthenticated can read pending photos.
drop policy if exists dlym_upload_own_private on storage.objects;
create policy dlym_upload_own_private on storage.objects
for insert to authenticated with check (
  bucket_id='dlym-submissions'
  and (storage.foldername(name))[1]=auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  and public.dlym_can_upload_photo()
);
drop policy if exists dlym_read_own_or_admin_private on storage.objects;
create policy dlym_read_own_or_admin_private on storage.objects
for select to authenticated using (
  bucket_id='dlym-submissions'
  and ((storage.foldername(name))[1]=auth.uid()::text or public.dlym_is_photo_admin())
);
drop policy if exists dlym_admin_delete_private on storage.objects;
create policy dlym_admin_delete_private on storage.objects
for delete to authenticated using (bucket_id='dlym-submissions' and public.dlym_is_photo_admin());

-- Only the admin may publish to the public bucket. Random visitors cannot.
drop policy if exists dlym_admin_publish_photo on storage.objects;
create policy dlym_admin_publish_photo on storage.objects
for insert to authenticated with check (
  bucket_id='dlym-approved' and public.dlym_is_photo_admin()
  and name ~ '^approved/[0-9a-f-]{36}\.webp$'
);
drop policy if exists dlym_admin_delete_public on storage.objects;
create policy dlym_admin_delete_public on storage.objects
for delete to authenticated using (bucket_id='dlym-approved' and public.dlym_is_photo_admin());
-- Storage copy and deletion need admin to SELECT object metadata.
drop policy if exists dlym_admin_read_public_metadata on storage.objects;
create policy dlym_admin_read_public_metadata on storage.objects
for select to authenticated using (bucket_id='dlym-approved' and public.dlym_is_photo_admin());

-- Final approval requires an actually published object at a fixed path.
create or replace function public.dlym_review_photo(p_id uuid, p_approve boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_photo public.dlym_photo_submissions%rowtype;
declare v_path text;
begin
  if not public.dlym_is_photo_admin() then raise exception 'ADMIN_ONLY'; end if;
  select * into v_photo from public.dlym_photo_submissions where id=p_id for update;
  if not found then raise exception 'SUBMISSION_NOT_FOUND'; end if;
  if v_photo.status <> 'pending' then raise exception 'ALREADY_REVIEWED'; end if;
  if p_approve then
    v_path := 'approved/'||p_id::text||'.webp';
    if not exists(select 1 from storage.objects where bucket_id='dlym-approved' and name=v_path) then
      raise exception 'PUBLISHED_FILE_NOT_FOUND';
    end if;
    update public.dlym_photo_submissions set status='approved',approved_path=v_path,reviewed_at=now() where id=p_id;
  else
    update public.dlym_photo_submissions set status='rejected',reviewed_at=now() where id=p_id;
  end if;
  return true;
end;
$$;
revoke all on function public.dlym_review_photo(uuid,boolean) from public,anon,authenticated;
grant execute on function public.dlym_review_photo(uuid,boolean) to authenticated;

-- Remove a previously approved card from the game's feed. Admin UI also deletes
-- its public Storage object to invalidate old direct image URLs.
create or replace function public.dlym_unpublish_photo(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.dlym_is_photo_admin() then raise exception 'ADMIN_ONLY'; end if;
  update public.dlym_photo_submissions
  set status='rejected',reviewed_at=now()
  where id=p_id and status='approved';
  if not found then raise exception 'APPROVED_SUBMISSION_NOT_FOUND'; end if;
  return true;
end;
$$;
revoke all on function public.dlym_unpublish_photo(uuid) from public,anon,authenticated;
grant execute on function public.dlym_unpublish_photo(uuid) to authenticated;

-- Public API exposes only non-sensitive game card data, never private paths,
-- user IDs, private preview URLs or pending/rejected submissions.
create or replace function public.dlym_approved_photos()
returns table(id uuid, nickname text, age integer, city text, bio text, photo_path text)
language sql stable security definer set search_path='' as $$
  select s.id,s.nickname,s.age,s.city,s.bio,s.approved_path as photo_path
  from public.dlym_photo_submissions s
  where s.status='approved' and s.approved_path is not null
    and exists(select 1 from storage.objects o where o.bucket_id='dlym-approved' and o.name=s.approved_path)
  order by s.reviewed_at desc nulls last
  limit 500;
$$;
revoke all on function public.dlym_approved_photos() from public,anon,authenticated;
grant execute on function public.dlym_approved_photos() to anon,authenticated;

notify pgrst, 'reload schema';
-- IMPORTANT: After you create YOUR ADMIN LOGIN in Authentication -> Users,
-- run a SEPARATE query with the exact email you control:
-- INSERT INTO public.dlym_photo_admins(user_id)
-- SELECT id FROM auth.users WHERE email='YOU@EXAMPLE.COM'
-- ON CONFLICT (user_id) DO NOTHING;
