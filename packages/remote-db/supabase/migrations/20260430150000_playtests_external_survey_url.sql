-- Replace built-in questionnaire (survey_questions / survey_responses) with an optional
-- external survey URL on playtests. Drops legacy tables and RPC; adds feedback completion RPC.

-- =============================================================================
-- RLS policies (must drop before tables)
-- =============================================================================

DROP POLICY IF EXISTS survey_questions_all_admin ON public.survey_questions;
DROP POLICY IF EXISTS survey_questions_select_tester ON public.survey_questions;

DROP POLICY IF EXISTS survey_responses_select_admin ON public.survey_responses;
DROP POLICY IF EXISTS survey_responses_select_self ON public.survey_responses;
DROP POLICY IF EXISTS survey_responses_no_direct_tester_write ON public.survey_responses;
DROP POLICY IF EXISTS survey_responses_no_direct_tester_update ON public.survey_responses;

-- =============================================================================
-- Legacy survey RPC and tables
-- =============================================================================

REVOKE ALL ON FUNCTION public.playtest_submit_survey(uuid, jsonb) FROM PUBLIC;
DROP FUNCTION public.playtest_submit_survey(uuid, jsonb);

DROP TRIGGER IF EXISTS survey_responses_updated_at_trg ON public.survey_responses;
DROP FUNCTION public.survey_responses_set_updated_at();

DROP TABLE public.survey_responses;
DROP TABLE public.survey_questions;

-- =============================================================================
-- External survey URL on playtest definition
-- =============================================================================

ALTER TABLE public.playtests
  ADD COLUMN IF NOT EXISTS survey_url text;

COMMENT ON COLUMN public.playtests.survey_url IS
  'Optional HTTPS URL to an external feedback form (Typeform, Google Forms, etc.).';

-- =============================================================================
-- RPC: finish feedback without in-app survey payload
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtest_complete_feedback(p_playtest_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_playtester_id uuid;
  v_session_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT pt.id, s.status
  INTO v_playtester_id, v_session_status
  FROM public.playtesters pt
  INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
  WHERE pt.playtest_session_id = p_playtest_session_id
    AND pt.user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enrolled in this session';
  END IF;

  IF v_session_status <> 'closed' THEN
    RAISE EXCEPTION 'Session is not closed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.playtesters WHERE id = v_playtester_id AND status = 'feedback'
  ) THEN
    RAISE EXCEPTION 'Feedback is not available for your playtester row';
  END IF;

  UPDATE public.playtesters
  SET status = 'closed'
  WHERE id = v_playtester_id;
END;
$$;

REVOKE ALL ON FUNCTION public.playtest_complete_feedback(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_complete_feedback(uuid) TO authenticated;

COMMENT ON FUNCTION public.playtest_complete_feedback(uuid) IS
  'Player: after external survey (or if none), transition feedback → closed when session is closed.';
