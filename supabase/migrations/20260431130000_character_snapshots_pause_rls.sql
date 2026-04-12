-- Snapshots are written when the playtester pauses (open session, paused status).
-- Keep insert during closed+feedback for older clients that still snapshot at feedback.
-- Allow delete while paused so repeat pauses can replace the row.

DROP POLICY IF EXISTS character_snapshots_insert_tester_feedback ON public.character_snapshots;

CREATE POLICY character_snapshots_insert_tester ON public.character_snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
      WHERE pt.id = character_snapshots.playtester_id
        AND pt.user_id = (SELECT auth.uid())
        AND pt.playtest_session_id = character_snapshots.playtest_session_id
        AND (
          (s.status = 'open' AND pt.status = 'paused')
          OR (s.status = 'closed' AND pt.status = 'feedback')
        )
    )
  );

CREATE POLICY character_snapshots_delete_tester_paused ON public.character_snapshots
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.playtesters pt
      INNER JOIN public.playtest_sessions s ON s.id = pt.playtest_session_id
      WHERE pt.id = character_snapshots.playtester_id
        AND pt.user_id = (SELECT auth.uid())
        AND character_snapshots.playtest_session_id = s.id
        AND s.status = 'open'
        AND pt.status = 'paused'
    )
  );
