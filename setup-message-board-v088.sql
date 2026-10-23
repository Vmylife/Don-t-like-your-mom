-- DON'T LIKE YOUR MOM v0.8.8 -- 玩家留言板（先審後公開）
-- 在原本的 Supabase SQL Editor 執行一次即可；可重跑。
-- 不影響既有排行榜、投稿、照片或營運統計。
-- 需先安裝 v0.7.0 玩家照片投稿 SQL，其中有 dlym_photo_admins 管理員白名單。
BEGIN;

CREATE TABLE IF NOT EXISTS public.dlym_board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 18),
  category text NOT NULL CHECK (category IN ('chat','suggestion','bug')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 6 AND 400),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','removed')),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS dlym_board_post_feed_idx ON public.dlym_board_posts(status, pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS dlym_board_post_owner_idx ON public.dlym_board_posts(owner_id, created_at DESC);
ALTER TABLE public.dlym_board_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dlym_board_posts FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.dlym_board_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.dlym_board_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','abuse','privacy','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS dlym_board_reports_post_idx ON public.dlym_board_reports(post_id);
CREATE INDEX IF NOT EXISTS dlym_board_reports_reporter_idx ON public.dlym_board_reports(reporter_id, created_at DESC);
ALTER TABLE public.dlym_board_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dlym_board_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.dlym_board_reports_id_seq FROM PUBLIC, anon, authenticated;

-- 玩家只能建立待審留言：每 90 秒最多一篇、24 小時最多六篇。
CREATE OR REPLACE FUNCTION public.dlym_board_submit(p_nickname text,p_category text,p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  n text := btrim(coalesce(p_nickname,''));
  c text := btrim(coalesce(p_content,''));
  item_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION '請先建立匿名投稿身份' USING ERRCODE='42501'; END IF;
  IF char_length(n) NOT BETWEEN 2 AND 18 OR n ~ '[[:cntrl:]]'
    THEN RAISE EXCEPTION '暱稱請輸入 2～18 個字'; END IF;
  IF p_category IS NULL OR p_category NOT IN ('chat','suggestion','bug')
    THEN RAISE EXCEPTION '留言分類不正確'; END IF;
  IF char_length(c) NOT BETWEEN 6 AND 400 OR replace(c, E'\n', '') ~ '[[:cntrl:]]'
    THEN RAISE EXCEPTION '留言請輸入 6～400 個字'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(uid::text));
  IF EXISTS(SELECT 1 FROM public.dlym_board_posts
       WHERE owner_id=uid AND created_at > now()-interval '90 seconds') THEN
    RAISE EXCEPTION '發文太快，請 90 秒後再試';
  END IF;
  IF (SELECT count(*) FROM public.dlym_board_posts
       WHERE owner_id=uid AND created_at > now()-interval '24 hours') >= 6 THEN
    RAISE EXCEPTION '每個身份 24 小時最多留言 6 次';
  END IF;
  INSERT INTO public.dlym_board_posts(owner_id,nickname,category,content)
  VALUES(uid,n,p_category,c) RETURNING id INTO item_id;
  RETURN item_id;
END;
$$;

-- 公開讀取：只回傳「已通過」的文字、暱稱、分類；不洩漏 owner_id。
CREATE OR REPLACE FUNCTION public.dlym_board_feed(
  p_category text DEFAULT 'all', p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  category text := coalesce(p_category,'all');
  lim integer := least(30,greatest(1,coalesce(p_limit,20)));
  skip integer := least(1000,greatest(0,coalesce(p_offset,0)));
  payload jsonb;
  n integer;
BEGIN
  IF category NOT IN ('all','chat','suggestion','bug') THEN category := 'all'; END IF;
  SELECT count(*)::integer INTO n FROM public.dlym_board_posts
    WHERE status='approved' AND (category='all' OR category = public.dlym_board_posts.category);
  SELECT coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO payload
  FROM (
    SELECT id,nickname,category,content,pinned,created_at
    FROM public.dlym_board_posts
    WHERE status='approved' AND (category='all' OR category = public.dlym_board_posts.category)
    ORDER BY pinned DESC,created_at DESC,id DESC LIMIT lim OFFSET skip
  ) q;
  RETURN jsonb_build_object('posts',payload,'total',n);
END;
$$;

-- 玩家可以檢舉已公開留言；一身份一篇只能檢舉一次，每日十次上限。
CREATE OR REPLACE FUNCTION public.dlym_board_report(p_post uuid,p_reason text DEFAULT 'other')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION '檢舉需要匿名身份' USING ERRCODE='42501'; END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('spam','abuse','privacy','other') THEN
    RAISE EXCEPTION '檢舉原因不正確'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.dlym_board_posts WHERE id=p_post AND status='approved')
    THEN RAISE EXCEPTION '找不到此公開留言'; END IF;
  IF (SELECT count(*) FROM public.dlym_board_reports
      WHERE reporter_id=uid AND created_at>now()-interval '24 hours')>=10 THEN
    RAISE EXCEPTION '今天檢舉次數已達上限'; END IF;
  INSERT INTO public.dlym_board_reports(post_id,reporter_id,reason)
  VALUES(p_post,uid,p_reason) ON CONFLICT (post_id,reporter_id) DO NOTHING;
  RETURN true;
END;
$$;

-- 沿用照片審核管理員 UUID 白名單，不另設密碼。
CREATE OR REPLACE FUNCTION public.dlym_board_admin_list(p_status text DEFAULT 'pending',p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  result jsonb;
  state text := coalesce(p_status,'pending');
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.dlym_photo_admins WHERE user_id=auth.uid()
  ) THEN RAISE EXCEPTION '只有站長可以管理留言' USING ERRCODE='42501'; END IF;
  IF state NOT IN ('pending','approved','reported','rejected','removed') THEN state:='pending'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO result
  FROM (
    SELECT p.id,p.nickname,p.category,p.content,p.status,p.pinned,p.created_at,p.reviewed_at,
           (SELECT count(*)::integer FROM public.dlym_board_reports r WHERE r.post_id=p.id) AS reports
    FROM public.dlym_board_posts p
    WHERE (state='reported' AND p.status='approved' AND EXISTS (
            SELECT 1 FROM public.dlym_board_reports r WHERE r.post_id=p.id))
       OR (state<>'reported' AND p.status=state)
    ORDER BY (SELECT count(*) FROM public.dlym_board_reports r WHERE r.post_id=p.id) DESC,
             p.created_at DESC
    LIMIT least(200,greatest(1,coalesce(p_limit,100)))
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.dlym_board_moderate(p_id uuid,p_action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.dlym_photo_admins WHERE user_id=auth.uid()
  ) THEN RAISE EXCEPTION '只有站長可以管理留言' USING ERRCODE='42501'; END IF;
  IF p_action='approve' THEN
    UPDATE public.dlym_board_posts SET status='approved',reviewed_at=now()
    WHERE id=p_id AND status='pending';
  ELSIF p_action='reject' THEN
    UPDATE public.dlym_board_posts SET status='rejected',reviewed_at=now()
    WHERE id=p_id AND status='pending';
  ELSIF p_action='remove' THEN
    UPDATE public.dlym_board_posts SET status='removed',pinned=false,reviewed_at=now()
    WHERE id=p_id AND status='approved';
  ELSIF p_action='pin' THEN
    UPDATE public.dlym_board_posts SET pinned=true
    WHERE id=p_id AND status='approved';
  ELSIF p_action='unpin' THEN
    UPDATE public.dlym_board_posts SET pinned=false
    WHERE id=p_id AND status='approved';
  ELSE
    RAISE EXCEPTION '管理操作不正確';
  END IF;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.dlym_board_submit(text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dlym_board_feed(text,integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dlym_board_report(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dlym_board_admin_list(text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.dlym_board_moderate(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dlym_board_submit(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dlym_board_report(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dlym_board_feed(text,integer,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dlym_board_admin_list(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dlym_board_moderate(uuid,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
