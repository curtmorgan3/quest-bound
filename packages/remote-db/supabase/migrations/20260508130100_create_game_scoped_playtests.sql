-- Game-scoped playtest schema, has_game_access entitlement predicate,
-- recursion-safe RLS helpers, player + telemetry RPCs, email auto-accept trigger.

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE public.playtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  survey_url text,
  created_by uuid NOT NULL REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playtests_org_game_idx ON public.playtests (organization_id, game_id);
CREATE INDEX playtests_game_idx ON public.playtests (game_id);

CREATE OR REPLACE FUNCTION public.playtest_set_updated_at()
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
  EXECUTE FUNCTION public.playtest_set_updated_at();

CREATE TABLE public.playtest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_id uuid NOT NULL REFERENCES public.playtests (id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX playtest_sessions_playtest_status_idx ON public.playtest_sessions (playtest_id, status);

CREATE TRIGGER playtest_sessions_updated_at_trg
  BEFORE UPDATE ON public.playtest_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.playtest_set_updated_at();

CREATE TABLE public.playtesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  invitee_email_normalized text,
  status text NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'active', 'paused', 'feedback', 'closed')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  first_active_timestamp timestamptz,
  last_paused_timestamp timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playtesters_user_or_email_chk
    CHECK (user_id IS NOT NULL OR invitee_email_normalized IS NOT NULL)
);
CREATE UNIQUE INDEX playtesters_session_user_uidx
  ON public.playtesters (playtest_session_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX playtesters_session_email_uidx
  ON public.playtesters (playtest_session_id, invitee_email_normalized)
  WHERE user_id IS NULL;
CREATE INDEX playtesters_user_idx ON public.playtesters (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER playtesters_updated_at_trg
  BEFORE UPDATE ON public.playtesters
  FOR EACH ROW
  EXECUTE FUNCTION public.playtest_set_updated_at();

CREATE TABLE public.playtest_activity_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX playtest_activity_segments_playtester_idx ON public.playtest_activity_segments (playtester_id);
CREATE INDEX playtest_activity_segments_session_idx ON public.playtest_activity_segments (playtest_session_id);

CREATE TABLE public.action_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  action_id text NOT NULL,
  action_name text NOT NULL DEFAULT '',
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX action_reports_session_idx ON public.action_reports (playtest_session_id);
CREATE INDEX action_reports_game_idx ON public.action_reports (game_id);

CREATE TABLE public.script_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  script_name text NOT NULL DEFAULT '',
  error text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX script_error_reports_session_idx ON public.script_error_reports (playtest_session_id);
CREATE INDEX script_error_reports_game_idx ON public.script_error_reports (game_id);

CREATE TABLE public.character_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playtester_id uuid NOT NULL REFERENCES public.playtesters (id) ON DELETE CASCADE,
  playtest_session_id uuid NOT NULL REFERENCES public.playtest_sessions (id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_snapshots_playtester_session_uidx
    UNIQUE (playtester_id, playtest_session_id)
);

-- =============================================================================
-- Cascading triggers: session close → playtesters → feedback, close segments
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtest_close_open_segments_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.playtest_activity_segments
  SET ended_at = now()
  WHERE playtest_session_id = p_session_id
    AND ended_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.playtest_close_open_segments_for_session(uuid) FROM PUBLIC;

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
    PERFORM public.playtest_close_open_segments_for_session(NEW.id);

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

-- =============================================================================
-- RLS recursion-fix helpers (SECURITY DEFINER + row_security off)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtest_playtest_row_is_org_admin(p_playtest_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
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
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.playtest_playtest_row_is_org_admin(
    (SELECT s.playtest_id FROM public.playtest_sessions s WHERE s.id = p_session_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.playtest_user_enrolled_in_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p_session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.playtesters pt
      WHERE pt.playtest_session_id = p_session_id
        AND pt.user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.playtest_user_enrolled_in_playtest(p_playtest_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
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
LANGUAGE sql STABLE SECURITY DEFINER
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
LANGUAGE sql STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.playtest_tester_may_write_character_snapshot(
  p_session_id uuid,
  p_playtester_id uuid
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
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
      AND (
        (s.status = 'open' AND pt.status IN ('active', 'paused'))
        OR (s.status = 'closed' AND pt.status = 'feedback')
      )
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
REVOKE ALL ON FUNCTION public.playtest_tester_may_write_character_snapshot(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_tester_may_write_character_snapshot(uuid, uuid) TO authenticated;

-- =============================================================================
-- has_game_access: purchaser OR enrolled in an open session (status not closed)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_game_access(p_game_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_game_id IS NOT NULL
    AND (SELECT auth.uid()) IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_game_purchase_authorizations a
        WHERE a.user_id = (SELECT auth.uid())
          AND a.game_id = p_game_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.playtesters pt
        INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
        INNER JOIN public.playtests pl ON pl.id = s.playtest_id
        WHERE pl.game_id = p_game_id
          AND s.status = 'open'
          AND pt.user_id = (SELECT auth.uid())
          AND pt.status <> 'closed'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.has_game_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_game_access(uuid) TO authenticated;

COMMENT ON FUNCTION public.has_game_access(uuid) IS
  'Unified entitlement: purchaser OR enrolled playtester in an open session (status not closed).';

-- =============================================================================
-- Player-facing RPCs
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
  v_session_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.status INTO v_session_status
  FROM public.playtest_sessions s
  WHERE s.id = p_playtest_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session_status <> 'open' THEN
    RAISE EXCEPTION 'Session is not open for play';
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

  UPDATE public.playtesters
  SET status = 'active',
      first_active_timestamp = COALESCE(first_active_timestamp, now())
  WHERE id = v_playtester_id;

  INSERT INTO public.playtest_activity_segments (playtester_id, playtest_session_id, started_at)
  VALUES (v_playtester_id, p_playtest_session_id, now());
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

-- =============================================================================
-- Telemetry RPCs (resolve caller's active playtester(s) for the game; fan out)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.report_playtest_action_fired(
  p_game_id uuid,
  p_action_id text,
  p_action_name text DEFAULT ''
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH inserted AS (
    INSERT INTO public.action_reports (
      playtester_id, playtest_session_id, game_id, action_id, action_name
    )
    SELECT pt.id, pt.playtest_session_id, p_game_id, p_action_id, p_action_name
    FROM public.playtesters pt
    INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
    INNER JOIN public.playtests pl ON pl.id = s.playtest_id
    WHERE pl.game_id = p_game_id
      AND s.status = 'open'
      AND pt.user_id = v_uid
      AND pt.status = 'active'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.report_playtest_action_fired(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_playtest_action_fired(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_playtest_script_error(
  p_game_id uuid,
  p_script_name text,
  p_error text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH inserted AS (
    INSERT INTO public.script_error_reports (
      playtester_id, playtest_session_id, game_id, script_name, error
    )
    SELECT pt.id, pt.playtest_session_id, p_game_id, p_script_name, p_error
    FROM public.playtesters pt
    INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
    INNER JOIN public.playtests pl ON pl.id = s.playtest_id
    WHERE pl.game_id = p_game_id
      AND s.status = 'open'
      AND pt.user_id = v_uid
      AND pt.status = 'active'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.report_playtest_script_error(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_playtest_script_error(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_playtest_character_snapshot(
  p_playtest_session_id uuid,
  p_payload jsonb
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
  v_pt_status text;
  v_session_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT pt.id, pt.status, s.status
  INTO v_playtester_id, v_pt_status, v_session_status
  FROM public.playtesters pt
  INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
  WHERE pt.playtest_session_id = p_playtest_session_id
    AND pt.user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enrolled in this session';
  END IF;

  IF NOT (
    (v_session_status = 'open' AND v_pt_status IN ('active', 'paused'))
    OR (v_session_status = 'closed' AND v_pt_status = 'feedback')
  ) THEN
    RAISE EXCEPTION 'Snapshot not allowed in current state';
  END IF;

  INSERT INTO public.character_snapshots (playtester_id, playtest_session_id, payload)
  VALUES (v_playtester_id, p_playtest_session_id, p_payload)
  ON CONFLICT (playtester_id, playtest_session_id)
  DO UPDATE SET payload = EXCLUDED.payload, captured_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.replace_playtest_character_snapshot(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_playtest_character_snapshot(uuid, jsonb) TO authenticated;

-- =============================================================================
-- Email-invite auto-accept: resolve pending playtesters when public.users email matches
-- =============================================================================

CREATE OR REPLACE FUNCTION public.playtesters_resolve_pending_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  norm text;
BEGIN
  norm := lower(trim(COALESCE(NEW.email, '')));
  IF norm = '' THEN
    RETURN NEW;
  END IF;
  UPDATE public.playtesters
  SET user_id = NEW.user_id,
      updated_at = now()
  WHERE user_id IS NULL
    AND invitee_email_normalized = norm
    AND status <> 'closed';
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_resolve_playtesters_trg
  AFTER INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.playtesters_resolve_pending_for_user();

COMMENT ON FUNCTION public.playtesters_resolve_pending_for_user() IS
  'Sets user_id on pending playtesters when public.users primary email matches invitee_email_normalized.';

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

REVOKE ALL ON TABLE public.playtests FROM PUBLIC;
REVOKE ALL ON TABLE public.playtest_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.playtesters FROM PUBLIC;
REVOKE ALL ON TABLE public.playtest_activity_segments FROM PUBLIC;
REVOKE ALL ON TABLE public.character_snapshots FROM PUBLIC;
REVOKE ALL ON TABLE public.action_reports FROM PUBLIC;
REVOKE ALL ON TABLE public.script_error_reports FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtest_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.playtest_activity_segments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.character_snapshots TO authenticated;
GRANT SELECT, INSERT ON TABLE public.action_reports TO authenticated;
GRANT SELECT, INSERT ON TABLE public.script_error_reports TO authenticated;

-- playtests
CREATE POLICY playtests_all_admin ON public.playtests
  FOR ALL
  USING (public.is_organization_admin(organization_id))
  WITH CHECK (public.is_organization_admin(organization_id));

CREATE POLICY playtests_select_enrolled_tester ON public.playtests
  FOR SELECT
  USING (public.playtest_user_enrolled_in_playtest(playtests.id));

-- playtest_sessions: org admin via playtest_id (avoids INSERT recursion)
CREATE POLICY playtest_sessions_all_admin ON public.playtest_sessions
  FOR ALL
  USING (public.playtest_playtest_row_is_org_admin(playtest_sessions.playtest_id))
  WITH CHECK (public.playtest_playtest_row_is_org_admin(playtest_sessions.playtest_id));

CREATE POLICY playtest_sessions_select_tester ON public.playtest_sessions
  FOR SELECT
  USING (public.playtest_user_enrolled_in_session(playtest_sessions.id));

-- playtesters
CREATE POLICY playtesters_all_admin ON public.playtesters
  FOR ALL
  USING (public.playtest_session_is_org_admin(playtesters.playtest_session_id))
  WITH CHECK (public.playtest_session_is_org_admin(playtesters.playtest_session_id));

CREATE POLICY playtesters_select_self ON public.playtesters
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- playtest_activity_segments
CREATE POLICY playtest_activity_segments_all_admin ON public.playtest_activity_segments
  FOR ALL
  USING (public.playtest_activity_segment_is_org_admin(playtest_activity_segments.playtester_id))
  WITH CHECK (public.playtest_activity_segment_is_org_admin(playtest_activity_segments.playtester_id));

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
  USING (public.playtest_session_is_org_admin(character_snapshots.playtest_session_id));

CREATE POLICY character_snapshots_select_self ON public.character_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playtesters pt
      WHERE pt.id = character_snapshots.playtester_id
        AND pt.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY character_snapshots_insert_tester ON public.character_snapshots
  FOR INSERT
  WITH CHECK (
    public.playtest_tester_may_write_character_snapshot(
      character_snapshots.playtest_session_id,
      character_snapshots.playtester_id
    )
  );

CREATE POLICY character_snapshots_delete_tester ON public.character_snapshots
  FOR DELETE
  USING (
    public.playtest_tester_may_write_character_snapshot(
      character_snapshots.playtest_session_id,
      character_snapshots.playtester_id
    )
  );

-- action_reports
CREATE POLICY action_reports_select_admin ON public.action_reports
  FOR SELECT
  USING (public.playtest_session_is_org_admin(action_reports.playtest_session_id));

CREATE POLICY action_reports_insert_active_tester ON public.action_reports
  FOR INSERT
  WITH CHECK (
    public.playtest_can_insert_tester_telemetry(
      action_reports.playtest_session_id,
      action_reports.playtester_id
    )
  );

-- script_error_reports
CREATE POLICY script_error_reports_select_admin ON public.script_error_reports
  FOR SELECT
  USING (public.playtest_session_is_org_admin(script_error_reports.playtest_session_id));

CREATE POLICY script_error_reports_insert_active_tester ON public.script_error_reports
  FOR INSERT
  WITH CHECK (
    public.playtest_can_insert_tester_telemetry(
      script_error_reports.playtest_session_id,
      script_error_reports.playtester_id
    )
  );

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.playtests IS 'Game-scoped playtest definition (org admins manage; one per game per playtest entity).';
COMMENT ON TABLE public.playtest_sessions IS 'Single run of a playtest; draft hidden from players until status=open.';
COMMENT ON TABLE public.playtesters IS 'Enrollment row; user_id resolves on signup via email auto-accept.';
COMMENT ON FUNCTION public.playtest_start_session(uuid) IS 'Player: open or resume play on an open session.';
COMMENT ON FUNCTION public.playtest_pause_session(uuid) IS 'Player: pause and close current activity segment.';
COMMENT ON FUNCTION public.playtest_complete_feedback(uuid) IS 'Player: feedback → closed after external survey (or no survey).';
COMMENT ON FUNCTION public.report_playtest_action_fired(uuid, text, text) IS 'Bundler telemetry: fan out an action report to all of caller''s active playtesters for the game.';
COMMENT ON FUNCTION public.report_playtest_script_error(uuid, text, text) IS 'Bundler telemetry: fan out a script error report to all of caller''s active playtesters for the game.';
COMMENT ON FUNCTION public.replace_playtest_character_snapshot(uuid, jsonb) IS 'Bundler: upsert character snapshot keyed by (playtester, session).';
