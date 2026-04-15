-- sync_is_allowed() was STABLE. For INSERT ... RETURNING on public.users, the bootstrap SELECT
-- policy uses (cloud_enabled IS NOT TRUE OR sync_is_allowed()). Allowlisted first inserts set
-- cloud_enabled = true, so sync_is_allowed() must run. STABLE lets PostgreSQL evaluate it once
-- per statement before the new row exists → false for the whole statement → 403 on RETURNING.
-- VOLATILE forces re-evaluation so the EXISTS sees the row just inserted in the same statement.

CREATE OR REPLACE FUNCTION public.sync_is_allowed()
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
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
  'VOLATILE so RLS/bootstrap checks see public.users changes in the same statement (e.g. first allowlisted INSERT RETURNING).';
