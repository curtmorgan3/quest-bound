-- First INSERT with allowlisted email sets cloud_enabled = true. The bootstrap SELECT policy
-- (cloud_enabled IS NOT TRUE OR sync_is_allowed()) then requires sync_is_allowed() to read
-- the new row for INSERT ... RETURNING. That check re-enters RLS on public.users while deciding
-- visibility of the same row → unreliable / fails with "new row violates row-level security policy".
--
-- Non-allowlisted inserts already pass via cloud_enabled IS NOT TRUE. Own-row reads are safe to
-- allow whenever user_id matches; other synced tables remain gated by sync_is_allowed().

DROP POLICY IF EXISTS "Users can select own rows" ON public.users;

CREATE POLICY "Users can select own rows" ON public.users
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- EXISTS on public.users must not be subject to RLS recursion when policies call this helper.
CREATE OR REPLACE FUNCTION public.sync_is_allowed()
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.cloud_enabled IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.sync_is_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_is_allowed() TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.sync_is_allowed() IS
  'VOLATILE + row_security=off: reliable EXISTS over public.users for RLS; avoids bootstrap RETURNING deadlock with users SELECT policy.';
