-- App-local Dexie field `cloudEnabled` is not synced; this column is for ops/dashboard only.
-- RLS policies on public.users are unchanged; column privileges + trigger enforce immutability for API roles.
-- Updates from the Supabase SQL editor (superuser / table owner) are unaffected.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cloud_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.cloud_enabled IS
  'Feature flag; set manually in Supabase SQL/Dashboard. Not writable via anon/authenticated API.';

-- Block INSERT/UPDATE of this column for Supabase API roles (PostgREST).
REVOKE INSERT (cloud_enabled) ON public.users FROM authenticated;
REVOKE UPDATE (cloud_enabled) ON public.users FROM authenticated;
REVOKE INSERT (cloud_enabled) ON public.users FROM anon;
REVOKE UPDATE (cloud_enabled) ON public.users FROM anon;
REVOKE INSERT (cloud_enabled) ON public.users FROM service_role;
REVOKE UPDATE (cloud_enabled) ON public.users FROM service_role;

CREATE OR REPLACE FUNCTION public.users_cloud_enabled_no_api_mutate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- JWT-backed requests (browser/app): force default on insert; forbid changes on update.
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.cloud_enabled := false;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.cloud_enabled IS DISTINCT FROM OLD.cloud_enabled THEN
        RAISE EXCEPTION 'cloud_enabled cannot be modified via the API'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_cloud_enabled_no_api_mutate ON public.users;
CREATE TRIGGER users_cloud_enabled_no_api_mutate
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.users_cloud_enabled_no_api_mutate();
