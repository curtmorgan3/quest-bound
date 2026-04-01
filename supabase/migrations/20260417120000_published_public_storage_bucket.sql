-- Public bucket for hosted ruleset bundles: {userOrOrgId}/{rulesetId}/latest.zip
-- Anonymous read; writes via Supabase Dashboard / service role (no end-user INSERT policies).

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('published-public', 'published-public', true, 104857600) -- 100MB per object
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "published-public read anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'published-public');

CREATE POLICY "published-public read authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'published-public');
