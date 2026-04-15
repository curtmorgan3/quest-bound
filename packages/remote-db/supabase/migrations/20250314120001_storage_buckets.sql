-- Quest Bound Phase 1: Storage buckets for assets and fonts
-- Private buckets; per-user folders: {user_id}/{file}
-- RLS on storage.objects so users can only access their own folder.

-- Create private buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('assets', 'assets', false, 52428800),  -- 50MB per file
  ('fonts', 'fonts', false, 10485760)      -- 10MB per file
ON CONFLICT (id) DO NOTHING;

-- Policies: users can only read/write objects in their own folder (name starts with auth.uid() + '/')
-- Folder structure: {user_id}/{asset_id}.{ext} e.g. abc123-uuid/asset-456.png

-- Assets bucket: INSERT (upload)
CREATE POLICY "User uploads to assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Assets bucket: SELECT (download)
CREATE POLICY "User reads own assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Assets bucket: UPDATE (overwrite)
CREATE POLICY "User updates own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Assets bucket: DELETE
CREATE POLICY "User deletes own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fonts bucket: INSERT
CREATE POLICY "User uploads to fonts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fonts bucket: SELECT
CREATE POLICY "User reads own fonts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fonts bucket: UPDATE
CREATE POLICY "User updates own fonts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fonts bucket: DELETE
CREATE POLICY "User deletes own fonts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
