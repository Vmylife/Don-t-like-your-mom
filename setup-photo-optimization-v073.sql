-- DON'T LIKE YOUR MOM v0.7.3 | optional existing approved photo optimization.
-- SQL Editor of the SAME Supabase project, run once AFTER v0.7.2.
-- This adds ONLY an admin update policy. No data is changed or deleted by this SQL.
-- New submissions' size limit is enforced in client code at 500 KB;
-- keep existing 2 MB bucket cap so already stored photos remain usable.
DROP POLICY IF EXISTS dlym_admin_optimize_public ON storage.objects;
CREATE POLICY dlym_admin_optimize_public ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dlym-approved'
    AND public.dlym_is_photo_admin()
    AND name ~ '^approved/[0-9a-f-]{36}\.(webp|jpg)$'
  )
  WITH CHECK (
    bucket_id = 'dlym-approved'
    AND public.dlym_is_photo_admin()
    AND name ~ '^approved/[0-9a-f-]{36}\.(webp|jpg)$'
  );
-- Existing SELECT and INSERT permissions for admins are already in v0.7.2.
NOTIFY pgrst, 'reload schema';
