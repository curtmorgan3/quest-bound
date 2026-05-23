-- Private storage bucket for per-user ruleset zip backups.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ruleset-cloud-backups', 'ruleset-cloud-backups', false, 209715200);

CREATE POLICY "ruleset_cloud_backups_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ruleset-cloud-backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "ruleset_cloud_backups_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ruleset-cloud-backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "ruleset_cloud_backups_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ruleset-cloud-backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "ruleset_cloud_backups_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ruleset-cloud-backups'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- Tracks which rulesets have a cloud backup (used to enable pull/delete buttons).
CREATE TABLE public.cloud_ruleset_backups (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ruleset_id text        NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ruleset_id)
);

ALTER TABLE public.cloud_ruleset_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY cloud_ruleset_backups_own
  ON public.cloud_ruleset_backups
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_ruleset_backups TO authenticated;
