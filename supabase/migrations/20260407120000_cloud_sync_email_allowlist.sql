-- Emails in cloud_sync_email_allowlist (lowercase) get public.users.cloud_enabled = true on first
-- API insert. Matching uses auth.users.email (server truth), not NEW.email from the client payload.
-- Manage the list in the Supabase SQL editor (or migrations) as postgres; no API access.

CREATE TABLE public.cloud_sync_email_allowlist (
  email TEXT NOT NULL PRIMARY KEY,
  CONSTRAINT cloud_sync_email_allowlist_email_normalized CHECK (
    email = lower(btrim(email))
    AND length(btrim(email)) > 0
  )
);

COMMENT ON TABLE public.cloud_sync_email_allowlist IS
  'Lowercase emails that receive cloud_enabled=true automatically when the user''s first public.users row is inserted via the API.';

ALTER TABLE public.cloud_sync_email_allowlist ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cloud_sync_email_allowlist FROM PUBLIC;
REVOKE ALL ON TABLE public.cloud_sync_email_allowlist FROM anon;
REVOKE ALL ON TABLE public.cloud_sync_email_allowlist FROM authenticated;
REVOKE ALL ON TABLE public.cloud_sync_email_allowlist FROM service_role;

CREATE OR REPLACE FUNCTION public.users_cloud_enabled_no_api_mutate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  allowlisted boolean;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'user_id must match auth.uid() for users row mutations via API'
        USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.cloud_sync_email_allowlist AS a
        INNER JOIN auth.users AS u ON u.id = NEW.user_id
        WHERE u.email IS NOT NULL
          AND btrim(u.email) <> ''
          AND a.email = lower(btrim(u.email))
      )
      INTO allowlisted;

      NEW.cloud_enabled := COALESCE(allowlisted, false);
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

COMMENT ON FUNCTION public.users_cloud_enabled_no_api_mutate() IS
  'SECURITY DEFINER: sets cloud_enabled on INSERT from auth.users email vs cloud_sync_email_allowlist; blocks API changes to cloud_enabled on UPDATE. Skipped when auth.uid() is null (dashboard SQL).';
