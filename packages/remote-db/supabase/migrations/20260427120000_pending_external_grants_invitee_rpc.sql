-- Invitees can list pending external grants (email match), accept (set user_id), or reject (soft revoke).
-- Complements the trigger on public.users for users whose profile row is inserted/updated after the grant exists.

CREATE OR REPLACE FUNCTION public.list_pending_external_grants_for_invitee()
RETURNS TABLE (
  grant_id uuid,
  organization_id uuid,
  organization_name text,
  ruleset_id text,
  ruleset_title text,
  permission text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    g.id,
    g.organization_id,
    o.name,
    g.ruleset_id,
    r.title,
    g.permission,
    g.created_at
  FROM public.ruleset_external_grants AS g
  INNER JOIN public.organizations AS o ON o.id = g.organization_id
  INNER JOIN public.organization_rulesets AS link
    ON link.organization_id = g.organization_id
    AND link.ruleset_id = g.ruleset_id
  LEFT JOIN public.rulesets AS r
    ON r.user_id = link.owner_user_id
    AND r.id = g.ruleset_id
  WHERE g.is_active
    AND g.user_id IS NULL
    AND g.invitee_email_normalized = public.auth_email_normalized();
$$;

REVOKE ALL ON FUNCTION public.list_pending_external_grants_for_invitee() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_external_grants_for_invitee() TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_ruleset_external_grant(p_grant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  n integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.ruleset_external_grants AS g
  SET user_id = (SELECT auth.uid()),
      updated_at = now()
  WHERE g.id = p_grant_id
    AND g.is_active
    AND g.user_id IS NULL
    AND g.invitee_email_normalized = public.auth_email_normalized();

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'Grant not found, already resolved, or not addressed to your account';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_ruleset_external_grant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_ruleset_external_grant(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_ruleset_external_grant(p_grant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  n integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.ruleset_external_grants AS g
  SET is_active = false,
      updated_at = now()
  WHERE g.id = p_grant_id
    AND g.is_active
    AND g.user_id IS NULL
    AND g.invitee_email_normalized = public.auth_email_normalized();

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE EXCEPTION 'Grant not found, already resolved, or not addressed to your account';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_ruleset_external_grant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_ruleset_external_grant(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_pending_external_grants_for_invitee() IS
  'SECURITY DEFINER: pending ruleset_external_grants for the session user primary email (auth.users / auth_email_normalized).';

COMMENT ON FUNCTION public.accept_ruleset_external_grant(uuid) IS
  'SECURITY DEFINER: sets user_id on a pending grant when invitee email matches the signed-in user.';

COMMENT ON FUNCTION public.reject_ruleset_external_grant(uuid) IS
  'SECURITY DEFINER: soft-revokes (is_active false) a pending grant for the signed-in invitee.';
