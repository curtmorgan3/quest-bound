-- Expose whether cloud data sync is allowed for UI (public.users.cloud_enabled).
-- Table RLS hides rows when cloud_enabled is false, so clients cannot read the column directly.
-- This function bypasses RLS for a single boolean; it does not grant data sync by itself.

CREATE OR REPLACE FUNCTION public.cloud_sync_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT bool_or(u.cloud_enabled)
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.cloud_sync_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cloud_sync_enabled() TO authenticated, anon, service_role;
