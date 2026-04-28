-- Public marketplace media: `marketplace/{org_slug}/{game_slug}/...`
-- Anonymous read for storefront images; writes for org admins under their org slug prefix.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('marketplace', 'marketplace', true, 52428800) -- 50MB per object
ON CONFLICT (id) DO NOTHING;

-- Public reads (storefront + dashboard previews)
CREATE POLICY "marketplace read anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'marketplace');

CREATE POLICY "marketplace read authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'marketplace');

-- Writes: authenticated org admins; object key must start with their organization slug (first folder).
CREATE POLICY "marketplace insert org admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketplace'
  AND EXISTS (
    SELECT 1
    FROM public.organizations AS o
    WHERE lower(o.slug) = lower((storage.foldername(name))[1])
      AND public.is_organization_admin(o.id)
  )
);

CREATE POLICY "marketplace update org admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketplace'
  AND EXISTS (
    SELECT 1
    FROM public.organizations AS o
    WHERE lower(o.slug) = lower((storage.foldername(name))[1])
      AND public.is_organization_admin(o.id)
  )
)
WITH CHECK (
  bucket_id = 'marketplace'
  AND EXISTS (
    SELECT 1
    FROM public.organizations AS o
    WHERE lower(o.slug) = lower((storage.foldername(name))[1])
      AND public.is_organization_admin(o.id)
  )
);

CREATE POLICY "marketplace delete org admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace'
  AND EXISTS (
    SELECT 1
    FROM public.organizations AS o
    WHERE lower(o.slug) = lower((storage.foldername(name))[1])
      AND public.is_organization_admin(o.id)
  )
);
