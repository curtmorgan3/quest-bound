-- Fix marketplace storage uploads: evaluate org slug + admin check under SECURITY DEFINER.
-- The previous policy used `FROM organizations` inside storage.objects WITH CHECK; that SELECT
-- was still subject to organizations RLS and could fail the upload (403) even for org admins.

CREATE OR REPLACE FUNCTION public.marketplace_storage_path_is_org_admin(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations AS o
    WHERE lower(o.slug) = lower(split_part(trim(both '/' from p_object_name::text), '/', 1))
      AND public.is_organization_admin(o.id)
  );
$$;

REVOKE ALL ON FUNCTION public.marketplace_storage_path_is_org_admin(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_storage_path_is_org_admin(text) TO authenticated;

DROP POLICY IF EXISTS "marketplace insert org admin" ON storage.objects;
DROP POLICY IF EXISTS "marketplace update org admin" ON storage.objects;
DROP POLICY IF EXISTS "marketplace delete org admin" ON storage.objects;

CREATE POLICY "marketplace insert org admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketplace'
  AND public.marketplace_storage_path_is_org_admin(name)
);

CREATE POLICY "marketplace update org admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketplace'
  AND public.marketplace_storage_path_is_org_admin(name)
)
WITH CHECK (
  bucket_id = 'marketplace'
  AND public.marketplace_storage_path_is_org_admin(name)
);

CREATE POLICY "marketplace delete org admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace'
  AND public.marketplace_storage_path_is_org_admin(name)
);
