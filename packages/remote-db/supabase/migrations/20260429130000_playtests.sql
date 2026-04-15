-- Org playtests: sessions, external-grant playtesters, activity segments, telemetry, surveys.
-- Spec: qb-publisher-dashboard agents/playtest.md

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE public.playtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  ruleset_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playtests_org_ruleset_fk
    FOREIGN KEY (organization_id, ruleset_id)
    REFERENCES public.organization_rulesets (organization_id, ruleset_id)
    ON DELETE CASCADE
);

CREATE INDEX playtests_org_ruleset_idx ON public.playtests (organization_id, ruleset_id);

CREATE OR REPLACE FUNCTION public.playtests_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER playtests_updated_at_trg
  BEFORE UPDATE ON public.playtests
  FOR EACH ROW
  EXECUTE FUNCTION public.playtests_set_updated_at();

CREATE TABLE public.playtest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_id uuid NOT NULL REFERENCES public.playtests (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX playtest_sessions_playtest_idx ON public.playtest_sessions (playtest_id);

CREATE OR REPLACE FUNCTION public.playtest_sessions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER playtest_sessions_updated_at_trg
  BEFORE UPDATE ON public.playtest_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.playtest_sessions_set_updated_at();

CREATE TABLE public.playtesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'active', 'paused', 'feedback', 'closed')),
  first_active_timestamp timestamptz,
  last_paused_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playtesters_session_user_uidx UNIQUE (playtest_session_id, user_id)
);

CREATE INDEX playtesters_user_idx ON public.playtesters (user_id);

CREATE OR REPLACE FUNCTION public.playtesters_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER playtesters_updated_at_trg
  BEFORE UPDATE ON public.playtesters
  FOR EACH ROW
  EXECUTE FUNCTION public.playtesters_set_updated_at();

CREATE TABLE public.playtest_activity_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX playtest_activity_segments_playtester_idx ON public.playtest_activity_segments (playtester_id);

CREATE TABLE public.character_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  properties text NOT NULL DEFAULT '',
  attribute_snapshot text NOT NULL DEFAULT '',
  inventory_snapshot text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX character_snapshots_session_tester_idx ON public.character_snapshots (playtest_session_id, playtester_id);

CREATE TABLE public.action_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  action_id text NOT NULL,
  action_name text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX action_reports_session_idx ON public.action_reports (playtest_session_id);

CREATE TABLE public.script_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  error text NOT NULL,
  script_name text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX script_error_reports_session_idx ON public.script_error_reports (playtest_session_id);

CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_id uuid NOT NULL REFERENCES public.playtests (id) ON DELETE CASCADE,
  question text NOT NULL DEFAULT '',
  is_freeform boolean NOT NULL DEFAULT true,
  options jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX survey_questions_playtest_idx ON public.survey_questions (playtest_id, sort_order);

CREATE TABLE public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  response text NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_responses_session_tester_uidx UNIQUE (playtest_session_id, playtester_id)
);

CREATE OR REPLACE FUNCTION public.survey_responses_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER survey_responses_updated_at_trg
  BEFORE UPDATE ON public.survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.survey_responses_set_updated_at();

-- =============================================================================
-- Triggers: enroll grant check, session close → feedback, grant revoke → closed
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtesters_enforce_external_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_org_id uuid;
  v_ruleset_id text;
BEGIN
  SELECT p.organization_id, p.ruleset_id
  INTO v_org_id, v_ruleset_id
  FROM public.playtest_sessions s
  INNER JOIN public.playtests p ON p.id = s.playtest_id
  WHERE s.id = NEW.playtest_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Playtest session not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ruleset_external_grants g
    WHERE g.organization_id = v_org_id
      AND g.ruleset_id = v_ruleset_id
      AND g.user_id = NEW.user_id
      AND g.is_active
  ) THEN
    RAISE EXCEPTION 'User must have an active resolved external grant for this ruleset';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER playtesters_enforce_external_grant_trg
  BEFORE INSERT ON public.playtesters
  FOR EACH ROW
  EXECUTE FUNCTION public.playtesters_enforce_external_grant();

CREATE OR REPLACE FUNCTION public.playtest_close_open_segments_for_playtesters(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.playtest_activity_segments seg
  SET ended_at = now()
  FROM public.playtesters pt
  WHERE seg.playtester_id = pt.id
    AND seg.ended_at IS NULL
    AND pt.playtest_session_id = p_session_id
    AND pt.status IN ('active', 'paused');
END;
$$;

REVOKE ALL ON FUNCTION public.playtest_close_open_segments_for_playtesters(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.playtest_sessions_after_close_playtesters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.status = 'closed'
     AND (TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status)) THEN
    PERFORM public.playtest_close_open_segments_for_playtesters(NEW.id);

    UPDATE public.playtesters
    SET status = 'feedback'
    WHERE playtest_session_id = NEW.id
      AND status IN ('ready', 'active', 'paused');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER playtest_sessions_after_close_playtesters_trg
  AFTER INSERT OR UPDATE OF status ON public.playtest_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.playtest_sessions_after_close_playtesters();

CREATE OR REPLACE FUNCTION public.ruleset_external_grants_playtesters_on_revoke()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_org uuid;
  v_rs text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;
  IF NEW.is_active OR NOT OLD.is_active THEN
    RETURN NEW;
  END IF;
  v_uid := OLD.user_id;
  v_org := OLD.organization_id;
  v_rs := OLD.ruleset_id;
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.playtest_activity_segments seg
  SET ended_at = now()
  FROM public.playtesters pt
  INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
  INNER JOIN public.playtests p ON p.id = s.playtest_id
  WHERE seg.playtester_id = pt.id
    AND seg.ended_at IS NULL
    AND pt.user_id = v_uid
    AND p.organization_id = v_org
    AND p.ruleset_id = v_rs;

  UPDATE public.playtesters pt
  SET status = 'closed'
  FROM public.playtest_sessions s
  INNER JOIN public.playtests p ON p.id = s.playtest_id
  WHERE pt.playtest_session_id = s.id
    AND pt.user_id = v_uid
    AND p.organization_id = v_org
    AND p.ruleset_id = v_rs
    AND pt.status <> 'closed';

  RETURN NEW;
END;
$$;

CREATE TRIGGER ruleset_external_grants_playtesters_on_revoke_trg
  AFTER UPDATE OF is_active ON public.ruleset_external_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.ruleset_external_grants_playtesters_on_revoke();

-- =============================================================================
-- RPCs: start, pause, survey submit
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtest_start_session(p_playtest_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_playtester_id uuid;
  v_ruleset_id text;
  v_org_id uuid;
  v_session_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.ruleset_id, p.organization_id, s.status
  INTO v_ruleset_id, v_org_id, v_session_status
  FROM public.playtest_sessions s
  INNER JOIN public.playtests p ON p.id = s.playtest_id
  WHERE s.id = p_playtest_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session_status <> 'open' THEN
    RAISE EXCEPTION 'Session is not open for play';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ruleset_external_grants g
    WHERE g.organization_id = v_org_id
      AND g.ruleset_id = v_ruleset_id
      AND g.user_id = v_uid
      AND g.is_active
  ) THEN
    RAISE EXCEPTION 'No active external grant for this ruleset';
  END IF;

  SELECT id INTO v_playtester_id
  FROM public.playtesters
  WHERE playtest_session_id = p_playtest_session_id
    AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not enrolled in this playtest session';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.playtesters WHERE id = v_playtester_id AND status = 'active'
  ) THEN
    RETURN;
  END IF;

  UPDATE public.playtest_activity_segments seg
  SET ended_at = now()
  FROM public.playtesters pt_other
  INNER JOIN public.playtest_sessions s_other ON s_other.id = pt_other.playtest_session_id
  INNER JOIN public.playtests p_other ON p_other.id = s_other.playtest_id
  WHERE seg.playtester_id = pt_other.id
    AND seg.ended_at IS NULL
    AND pt_other.user_id = v_uid
    AND pt_other.status = 'active'
    AND p_other.ruleset_id = v_ruleset_id
    AND s_other.id <> p_playtest_session_id;

  UPDATE public.playtesters pt_other
  SET status = 'paused',
      last_paused_timestamp = now()
  FROM public.playtest_sessions s_other
  INNER JOIN public.playtests p_other ON p_other.id = s_other.playtest_id
  WHERE pt_other.playtest_session_id = s_other.id
    AND pt_other.user_id = v_uid
    AND pt_other.status = 'active'
    AND p_other.ruleset_id = v_ruleset_id
    AND s_other.id <> p_playtest_session_id;

  UPDATE public.playtesters
  SET status = 'active',
      first_active_timestamp = COALESCE(first_active_timestamp, now())
  WHERE id = v_playtester_id;

  INSERT INTO public.playtest_activity_segments (playtester_id, started_at)
  VALUES (v_playtester_id, now());
END;
$$;

REVOKE ALL ON FUNCTION public.playtest_start_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_start_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.playtest_pause_session(p_playtest_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_playtester_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_playtester_id
  FROM public.playtesters
  WHERE playtest_session_id = p_playtest_session_id
    AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enrolled in this session';
  END IF;

  UPDATE public.playtest_activity_segments
  SET ended_at = now()
  WHERE playtester_id = v_playtester_id
    AND ended_at IS NULL;

  UPDATE public.playtesters
  SET status = 'paused',
      last_paused_timestamp = now()
  WHERE id = v_playtester_id
    AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.playtest_pause_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_pause_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.playtest_submit_survey(
  p_playtest_session_id uuid,
  p_response jsonb
)
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

  INSERT INTO public.survey_responses (playtest_session_id, playtester_id, response)
  VALUES (p_playtest_session_id, v_playtester_id, p_response::text)
  ON CONFLICT (playtest_session_id, playtester_id)
  DO UPDATE SET response = EXCLUDED.response;

  UPDATE public.playtesters
  SET status = 'closed'
  WHERE id = v_playtester_id;
END;
$$;

REVOKE ALL ON FUNCTION public.playtest_submit_survey(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_submit_survey(uuid, jsonb) TO authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.playtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playtest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playtesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playtest_activity_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.playtests FROM PUBLIC;
REVOKE ALL ON TABLE public.playtest_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.playtesters FROM PUBLIC;
REVOKE ALL ON TABLE public.playtest_activity_segments FROM PUBLIC;
REVOKE ALL ON TABLE public.character_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE public.action_reports FROM PUBLIC;
REVOKE ALL ON TABLE public.script_error_reports FROM PUBLIC;
REVOKE ALL ON TABLE public.survey_questions FROM PUBLIC;
REVOKE ALL ON TABLE public.survey_responses FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtest_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtest_activity_segments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.character_snapshots TO authenticated;
GRANT SELECT, INSERT ON TABLE public.action_reports TO authenticated;
GRANT SELECT, INSERT ON TABLE public.script_error_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.survey_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.survey_responses TO authenticated;

-- playtests
CREATE POLICY playtests_all_admin ON public.playtests
  FOR ALL
  USING (public.is_organization_admin(organization_id))
  WITH CHECK (public.is_organization_admin(organization_id));

CREATE POLICY playtests_select_enrolled_tester ON public.playtests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtesters pt ON pt.playtest_session_id = s.id
      WHERE s.playtest_id = playtests.id
        AND pt.user_id = (SELECT auth.uid())
    )
  );

-- playtest_sessions
CREATE POLICY playtest_sessions_all_admin ON public.playtest_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.playtests p
      WHERE p.id = playtest_sessions.playtest_id
        AND public.is_organization_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playtests p
      WHERE p.id = playtest_sessions.playtest_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY playtest_sessions_select_tester ON public.playtest_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      WHERE pt.playtest_session_id = playtest_sessions.id
        AND pt.user_id = (SELECT auth.uid())
    )
  );

-- playtesters
CREATE POLICY playtesters_all_admin ON public.playtesters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = playtesters.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = playtesters.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY playtesters_select_self ON public.playtesters
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- playtest_activity_segments
CREATE POLICY playtest_activity_segments_all_admin ON public.playtest_activity_segments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE pt.id = playtest_activity_segments.playtester_id
        AND public.is_organization_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE pt.id = playtest_activity_segments.playtester_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY playtest_activity_segments_select_self ON public.playtest_activity_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playtesters pt
      WHERE pt.id = playtest_activity_segments.playtester_id
        AND pt.user_id = (SELECT auth.uid())
    )
  );

-- character_snapshots
CREATE POLICY character_snapshots_select_admin ON public.character_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = character_snapshots.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY character_snapshots_insert_tester_feedback ON public.character_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playtesters pt
      WHERE pt.id = character_snapshots.playtester_id
        AND pt.user_id = (SELECT auth.uid())
        AND pt.status = 'feedback'
        AND pt.playtest_session_id = character_snapshots.playtest_session_id
    )
  );

-- action_reports
CREATE POLICY action_reports_select_admin ON public.action_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = action_reports.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY action_reports_insert_active_tester ON public.action_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
      WHERE pt.id = action_reports.playtester_id
        AND pt.user_id = (SELECT auth.uid())
        AND pt.status = 'active'
        AND s.id = action_reports.playtest_session_id
        AND s.status = 'open'
    )
  );

-- script_error_reports
CREATE POLICY script_error_reports_select_admin ON public.script_error_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = script_error_reports.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY script_error_reports_insert_active_tester ON public.script_error_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
      WHERE pt.id = script_error_reports.playtester_id
        AND pt.user_id = (SELECT auth.uid())
        AND pt.status = 'active'
        AND s.id = script_error_reports.playtest_session_id
        AND s.status = 'open'
    )
  );

-- survey_questions
CREATE POLICY survey_questions_all_admin ON public.survey_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.playtests p
      WHERE p.id = survey_questions.playtest_id
        AND public.is_organization_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playtests p
      WHERE p.id = survey_questions.playtest_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY survey_questions_select_tester ON public.survey_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtests p
      INNER JOIN public.playtest_sessions s ON s.playtest_id = p.id
      INNER JOIN public.playtesters pt ON pt.playtest_session_id = s.id
      WHERE p.id = survey_questions.playtest_id
        AND pt.user_id = (SELECT auth.uid())
    )
  );

-- survey_responses
CREATE POLICY survey_responses_select_admin ON public.survey_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = survey_responses.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY survey_responses_select_self ON public.survey_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playtesters pt
      WHERE pt.id = survey_responses.playtester_id
        AND pt.user_id = (SELECT auth.uid())
    )
  );

-- Inserts/updates from clients use RPC for submit; block direct tester writes
CREATE POLICY survey_responses_no_direct_tester_write ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = survey_responses.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

CREATE POLICY survey_responses_no_direct_tester_update ON public.survey_responses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtest_sessions s
      INNER JOIN public.playtests p ON p.id = s.playtest_id
      WHERE s.id = survey_responses.playtest_session_id
        AND public.is_organization_admin(p.organization_id)
    )
  );

COMMENT ON TABLE public.playtests IS 'Organization-scoped playtest definition for a linked ruleset.';
COMMENT ON TABLE public.playtest_sessions IS 'Single run of a playtest; draft hidden from players until open.';
COMMENT ON FUNCTION public.playtest_start_session(uuid) IS 'Player: start or resume play on an open session (one active per ruleset per user).';
COMMENT ON FUNCTION public.playtest_pause_session(uuid) IS 'Player: pause and close activity segment.';
COMMENT ON FUNCTION public.playtest_submit_survey(uuid, jsonb) IS 'Player: submit survey JSON when session closed and status is feedback; then closed.';
