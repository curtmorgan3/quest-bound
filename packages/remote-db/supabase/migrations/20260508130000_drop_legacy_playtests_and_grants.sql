-- Drop ruleset-scoped playtest schema and external-ruleset-grant infrastructure.
-- New game-scoped playtest schema lands in 20260508130100.
--
-- Strategy: defang user_has_active_external_ruleset_grant() to return false so the
-- ~30 sync-table SELECT policies (added in 20260426120000) continue to work without
-- having to rewrite each one. read_authorized_for_owner_ruleset() then collapses to
-- is_org_collaborator_for_owner_ruleset() at runtime. storage_org_ruleset_path_allowed()
-- is similarly redefined to drop its external-grant branch.

-- =============================================================================
-- 1. Triggers + RPCs that reference the legacy tables
-- =============================================================================

DROP TRIGGER IF EXISTS users_resolve_ruleset_external_grants_trg ON public.users;
DROP FUNCTION IF EXISTS public.resolve_ruleset_external_grants_on_user_email();

DROP FUNCTION IF EXISTS public.playtest_start_session(uuid);
DROP FUNCTION IF EXISTS public.playtest_pause_session(uuid);
DROP FUNCTION IF EXISTS public.playtest_complete_feedback(uuid);

DROP FUNCTION IF EXISTS public.list_pending_external_grants_for_invitee();
DROP FUNCTION IF EXISTS public.accept_ruleset_external_grant(uuid);
DROP FUNCTION IF EXISTS public.reject_ruleset_external_grant(uuid);

DROP TRIGGER IF EXISTS ruleset_external_grants_playtesters_on_revoke_trg
  ON public.ruleset_external_grants;
DROP FUNCTION IF EXISTS public.ruleset_external_grants_playtesters_on_revoke();

DROP TRIGGER IF EXISTS ruleset_external_grants_updated_at_trg
  ON public.ruleset_external_grants;
DROP FUNCTION IF EXISTS public.ruleset_external_grants_set_updated_at();

DROP TRIGGER IF EXISTS playtest_sessions_after_close_playtesters_trg
  ON public.playtest_sessions;
DROP FUNCTION IF EXISTS public.playtest_sessions_after_close_playtesters();
DROP FUNCTION IF EXISTS public.playtest_close_open_segments_for_playtesters(uuid);

DROP TRIGGER IF EXISTS playtesters_enforce_external_grant_trg
  ON public.playtesters;
DROP FUNCTION IF EXISTS public.playtesters_enforce_external_grant();

DROP TRIGGER IF EXISTS playtests_updated_at_trg ON public.playtests;
DROP TRIGGER IF EXISTS playtest_sessions_updated_at_trg ON public.playtest_sessions;
DROP TRIGGER IF EXISTS playtesters_updated_at_trg ON public.playtesters;
DROP FUNCTION IF EXISTS public.playtests_set_updated_at();
DROP FUNCTION IF EXISTS public.playtest_sessions_set_updated_at();
DROP FUNCTION IF EXISTS public.playtesters_set_updated_at();

-- =============================================================================
-- 2. Defang user_has_active_external_ruleset_grant so the ~30 sync-table SELECT
--    policies that call it (via read_authorized_for_owner_ruleset) keep working.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_has_active_external_ruleset_grant(
  p_owner_user_id uuid,
  p_ruleset_id text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT false;
$$;

COMMENT ON FUNCTION public.user_has_active_external_ruleset_grant(uuid, text) IS
  'Stub: external ruleset grants removed in favor of game-scoped has_game_access. Always returns false; kept so existing SELECT policies still resolve.';

-- =============================================================================
-- 3. Defang storage_org_ruleset_path_allowed: drop the external-grant read branch
--    so we can drop ruleset_external_grants. Signature unchanged.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.storage_org_ruleset_path_allowed(
  p_name text,
  p_require_admin boolean,
  p_allow_external_grant_read boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  org_uuid uuid;
  rsid text;
  is_admin boolean;
  is_member boolean;
BEGIN
  parts := string_to_array(nullif(trim(p_name), ''), '/');
  IF parts IS NULL OR array_length(parts, 1) IS NULL OR array_length(parts, 1) < 3 THEN
    RETURN false;
  END IF;
  BEGIN
    org_uuid := parts[1]::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;
  rsid := parts[2];
  SELECT
    (org.admin_user_id = (SELECT auth.uid())),
    EXISTS (
      SELECT 1
      FROM public.organization_members AS m
      WHERE m.organization_id = org.id AND m.user_id = (SELECT auth.uid())
    )
  INTO is_admin, is_member
  FROM public.organizations AS org
  WHERE org.id = org_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_require_admin AND NOT is_admin THEN
    RETURN false;
  END IF;

  IF NOT p_require_admin AND NOT is_admin AND NOT is_member THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organization_rulesets AS o
    WHERE o.organization_id = org_uuid
      AND o.ruleset_id = rsid
  );
END;
$$;

COMMENT ON FUNCTION public.storage_org_ruleset_path_allowed(text, boolean, boolean) IS
  'External-grant read branch removed; org admins/members only. p_allow_external_grant_read is now ignored.';

-- =============================================================================
-- 4. Drop legacy tables (children → parents). RLS policies drop with their tables.
-- =============================================================================

DROP TABLE IF EXISTS public.playtest_activity_segments;
DROP TABLE IF EXISTS public.character_snapshots;
DROP TABLE IF EXISTS public.action_reports;
DROP TABLE IF EXISTS public.script_error_reports;
DROP TABLE IF EXISTS public.playtesters;
DROP TABLE IF EXISTS public.playtest_sessions;
DROP TABLE IF EXISTS public.playtests;
DROP TABLE IF EXISTS public.ruleset_external_grants;

-- =============================================================================
-- 5. RLS recursion-fix helpers (now safe to drop — their policies dropped above)
-- =============================================================================

DROP FUNCTION IF EXISTS public.playtest_playtest_row_is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.playtest_session_is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.playtest_user_enrolled_in_session(uuid);
DROP FUNCTION IF EXISTS public.playtest_user_enrolled_in_playtest(uuid);
DROP FUNCTION IF EXISTS public.playtest_activity_segment_is_org_admin(uuid);
DROP FUNCTION IF EXISTS public.playtest_can_insert_tester_telemetry(uuid, uuid);
DROP FUNCTION IF EXISTS public.playtest_tester_may_write_character_snapshot(uuid, uuid);
