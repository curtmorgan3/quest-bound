-- paid_subscribers: active Patreon patrons tracked by email.
-- Written exclusively by the patreon-hook Netlify function via service role.
-- Rows here grant cloud_enabled=true on user INSERT, alongside cloud_sync_email_allowlist.

CREATE TABLE public.paid_subscribers (
  email TEXT NOT NULL PRIMARY KEY,
  CONSTRAINT paid_subscribers_email_normalized CHECK (
    email = lower(btrim(email))
    AND length(btrim(email)) > 0
  )
);

COMMENT ON TABLE public.paid_subscribers IS
  'Lowercase emails of active Patreon patrons. Written by the patreon-hook function via service role. '
  'Grants cloud_enabled=true alongside cloud_sync_email_allowlist.';

ALTER TABLE public.paid_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.paid_subscribers FROM PUBLIC;
REVOKE ALL ON TABLE public.paid_subscribers FROM anon;
REVOKE ALL ON TABLE public.paid_subscribers FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.paid_subscribers TO service_role;

-- SECURITY DEFINER RPC so the webhook (service role) can safely revoke cloud_enabled
-- while still checking cloud_sync_email_allowlist (which service_role cannot read directly).
CREATE OR REPLACE FUNCTION public.revoke_paid_subscriber(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Only revoke cloud_enabled if the email is not on the manual allowlist.
  IF NOT EXISTS (
    SELECT 1
    FROM public.cloud_sync_email_allowlist
    WHERE email = lower(btrim(p_email))
  ) THEN
    UPDATE public.users
    SET cloud_enabled = false
    WHERE lower(btrim(email)) = lower(btrim(p_email));
  END IF;
END;
$$;

COMMENT ON FUNCTION public.revoke_paid_subscriber(text) IS
  'SECURITY DEFINER: removes cloud_enabled for a patron email unless they are on cloud_sync_email_allowlist. '
  'Called by the patreon-hook function via service role when a patron cancels or is declined.';

REVOKE ALL ON FUNCTION public.revoke_paid_subscriber(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_paid_subscriber(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_paid_subscriber(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_paid_subscriber(text) TO service_role;

-- Update the INSERT trigger to also check paid_subscribers for new users.
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
        FROM auth.users AS u
        WHERE u.id = NEW.user_id
          AND u.email IS NOT NULL
          AND btrim(u.email) <> ''
          AND (
            EXISTS (
              SELECT 1 FROM public.cloud_sync_email_allowlist AS a
              WHERE a.email = lower(btrim(u.email))
            )
            OR EXISTS (
              SELECT 1 FROM public.paid_subscribers AS ps
              WHERE ps.email = lower(btrim(u.email))
            )
          )
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
  'SECURITY DEFINER: sets cloud_enabled on INSERT from auth.users email vs cloud_sync_email_allowlist '
  'or paid_subscribers; blocks API changes to cloud_enabled on UPDATE. '
  'Skipped when auth.uid() is null (dashboard SQL / service role).';
