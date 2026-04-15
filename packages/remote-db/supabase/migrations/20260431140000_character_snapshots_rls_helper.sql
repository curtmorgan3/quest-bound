-- character_snapshots INSERT/DELETE from the client was failing RLS (403) for some setups:
-- subqueries in policies can interact badly with RLS on joined tables, and pause RPC only
-- sets status = 'paused' when the row was still 'active'. Use SECURITY DEFINER + row_security off
-- like playtest_can_insert_tester_telemetry.

CREATE OR REPLACE FUNCTION public.playtest_tester_may_write_character_snapshot(
  p_playtest_session_id uuid,
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
      AND pt.playtest_session_id = p_playtest_session_id
      AND pt.user_id = (SELECT auth.uid())
      AND (
        (s.status = 'open' AND pt.status IN ('active', 'paused'))
        OR (s.status = 'closed' AND pt.status = 'feedback')
      )
  );
$$;

REVOKE ALL ON FUNCTION public.playtest_tester_may_write_character_snapshot(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.playtest_tester_may_write_character_snapshot(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS character_snapshots_insert_tester_feedback ON public.character_snapshots;
DROP POLICY IF EXISTS character_snapshots_insert_tester ON public.character_snapshots;
DROP POLICY IF EXISTS character_snapshots_delete_tester_paused ON public.character_snapshots;

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
