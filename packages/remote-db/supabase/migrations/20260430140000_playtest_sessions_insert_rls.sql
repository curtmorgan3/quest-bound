-- INSERT into playtest_sessions failed RLS: WITH CHECK used
-- playtest_session_is_org_admin(id), whose helper SELECTs the session row by id.
-- During INSERT that row is not yet visible to the subquery, so playtest_id is NULL
-- and the check fails. Use playtest_id on the new row instead.

DROP POLICY IF EXISTS playtest_sessions_all_admin ON public.playtest_sessions;

CREATE POLICY playtest_sessions_all_admin ON public.playtest_sessions
  FOR ALL
  USING (public.playtest_playtest_row_is_org_admin(playtest_sessions.playtest_id))
  WITH CHECK (public.playtest_playtest_row_is_org_admin(playtest_sessions.playtest_id));

COMMENT ON POLICY playtest_sessions_all_admin ON public.playtest_sessions IS
  'Org admin CRUD; INSERT WITH CHECK uses playtest_id on the new row (not session id lookup).';
