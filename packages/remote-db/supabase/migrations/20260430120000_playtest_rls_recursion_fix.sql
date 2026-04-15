-- Break RLS cycles between playtests ↔ playtest_sessions ↔ playtesters by using
-- SECURITY DEFINER helpers with row_security = off (same pattern as org RLS fix).

-- =============================================================================
-- Helpers (bypass RLS for existence checks only)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtest_playtest_row_is_org_admin(p_playtest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p_playtest_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.playtests p
      WHERE p.id = p_playtest_id
        AND public.is_organization_admin(p.organization_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.playtest_session_is_org_admin(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.playtest_playtest_row_is_org_admin(
    (SELECT s.playtest_id FROM public.playtest_sessions s WHERE s.id = p_session_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.playtest_user_enrolled_in_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.playtesters pt
      WHERE pt.playtest_session_id = p_session_id
        AND pt.user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.playtest_user_enrolled_in_playtest(p_playtest_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p_playtest_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtesters pt ON pt.playtest_session_id = s.id
      WHERE s.playtest_id = p_playtest_id
        AND pt.user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.playtest_activity_segment_is_org_admin(p_playtester_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.playtest_session_is_org_admin(
    (SELECT pt.playtest_session_id FROM public.playtesters pt WHERE pt.id = p_playtester_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.playtest_can_insert_tester_telemetry(
  p_session_id uuid,
  p_playtester_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.playtesters pt
    INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
    WHERE pt.id = p_playtester_id
      AND pt.playtest_session_id = p_session_id
      AND pt.user_id = (SELECT auth.uid())
      AND pt.status = 'active'
      AND s.id = p_session_id
      AND s.status = 'open'
  );
$$;

REVOKE ALL ON FUNCTION public.playtest_playtest_row_is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_playtest_row_is_org_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.playtest_session_is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_session_is_org_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.playtest_user_enrolled_in_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_user_enrolled_in_session(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.playtest_user_enrolled_in_playtest(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_user_enrolled_in_playtest(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.playtest_activity_segment_is_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_activity_segment_is_org_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.playtest_can_insert_tester_telemetry(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_can_insert_tester_telemetry(uuid, uuid) TO authenticated;

-- =============================================================================
-- Replace policies that caused recursion
-- =============================================================================

DROP POLICY IF EXISTS playtests_select_enrolled_tester ON public.playtests;
CREATE POLICY playtests_select_enrolled_tester ON public.playtests
  FOR SELECT
  USING (public.playtest_user_enrolled_in_playtest(playtests.id));

DROP POLICY IF EXISTS playtest_sessions_all_admin ON public.playtest_sessions;
CREATE POLICY playtest_sessions_all_admin ON public.playtest_sessions
  FOR ALL
  USING (public.playtest_session_is_org_admin(playtest_sessions.id))
  WITH CHECK (public.playtest_session_is_org_admin(playtest_sessions.id));

DROP POLICY IF EXISTS playtest_sessions_select_tester ON public.playtest_sessions;
CREATE POLICY playtest_sessions_select_tester ON public.playtest_sessions
  FOR SELECT
  USING (public.playtest_user_enrolled_in_session(playtest_sessions.id));

DROP POLICY IF EXISTS playtesters_all_admin ON public.playtesters;
CREATE POLICY playtesters_all_admin ON public.playtesters
  FOR ALL
  USING (public.playtest_session_is_org_admin(playtesters.playtest_session_id))
  WITH CHECK (public.playtest_session_is_org_admin(playtesters.playtest_session_id));

DROP POLICY IF EXISTS playtest_activity_segments_all_admin ON public.playtest_activity_segments;
CREATE POLICY playtest_activity_segments_all_admin ON public.playtest_activity_segments
  FOR ALL
  USING (public.playtest_activity_segment_is_org_admin(playtest_activity_segments.playtester_id))
  WITH CHECK (public.playtest_activity_segment_is_org_admin(playtest_activity_segments.playtester_id));

DROP POLICY IF EXISTS character_snapshots_select_admin ON public.character_snapshots;
CREATE POLICY character_snapshots_select_admin ON public.character_snapshots
  FOR SELECT
  USING (public.playtest_session_is_org_admin(character_snapshots.playtest_session_id));

DROP POLICY IF EXISTS action_reports_select_admin ON public.action_reports;
CREATE POLICY action_reports_select_admin ON public.action_reports
  FOR SELECT
  USING (public.playtest_session_is_org_admin(action_reports.playtest_session_id));

DROP POLICY IF EXISTS action_reports_insert_active_tester ON public.action_reports;
CREATE POLICY action_reports_insert_active_tester ON public.action_reports
  FOR INSERT
  WITH CHECK (
    public.playtest_can_insert_tester_telemetry(
      action_reports.playtest_session_id,
      action_reports.playtester_id
    )
  );

DROP POLICY IF EXISTS script_error_reports_select_admin ON public.script_error_reports;
CREATE POLICY script_error_reports_select_admin ON public.script_error_reports
  FOR SELECT
  USING (public.playtest_session_is_org_admin(script_error_reports.playtest_session_id));

DROP POLICY IF EXISTS script_error_reports_insert_active_tester ON public.script_error_reports;
CREATE POLICY script_error_reports_insert_active_tester ON public.script_error_reports
  FOR INSERT
  WITH CHECK (
    public.playtest_can_insert_tester_telemetry(
      script_error_reports.playtest_session_id,
      script_error_reports.playtester_id
    )
  );

DROP POLICY IF EXISTS survey_questions_select_tester ON public.survey_questions;
CREATE POLICY survey_questions_select_tester ON public.survey_questions
  FOR SELECT
  USING (public.playtest_user_enrolled_in_playtest(survey_questions.playtest_id));

DROP POLICY IF EXISTS survey_responses_select_admin ON public.survey_responses;
CREATE POLICY survey_responses_select_admin ON public.survey_responses
  FOR SELECT
  USING (public.playtest_session_is_org_admin(survey_responses.playtest_session_id));

DROP POLICY IF EXISTS survey_responses_no_direct_tester_write ON public.survey_responses;
CREATE POLICY survey_responses_no_direct_tester_write ON public.survey_responses
  FOR INSERT
  WITH CHECK (public.playtest_session_is_org_admin(survey_responses.playtest_session_id));

DROP POLICY IF EXISTS survey_responses_no_direct_tester_update ON public.survey_responses;
CREATE POLICY survey_responses_no_direct_tester_update ON public.survey_responses
  FOR UPDATE
  USING (public.playtest_session_is_org_admin(survey_responses.playtest_session_id));

COMMENT ON FUNCTION public.playtest_playtest_row_is_org_admin(uuid) IS
  'RLS helper: bypasses RLS to test org admin on a playtests row (avoids playtests↔sessions recursion).';
COMMENT ON FUNCTION public.playtest_user_enrolled_in_playtest(uuid) IS
  'RLS helper: bypasses RLS to test whether auth user has a playtesters row under this playtest.';
