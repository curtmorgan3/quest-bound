-- PostgREST INSERT/UPSERT with RETURNING must pass SELECT RLS on the new row.
-- sync_is_allowed() is false until some public.users row for the auth user has cloud_enabled = true,
-- so brand-new accounts (cloud_enabled false from trigger) could not read their own row and the
-- whole request failed with 403.

DROP POLICY IF EXISTS "Users can select own rows" ON public.users;

CREATE POLICY "Users can select own rows" ON public.users
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    AND (
      cloud_enabled IS NOT TRUE
      OR public.sync_is_allowed()
    )
  );
