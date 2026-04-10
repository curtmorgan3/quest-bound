-- Publisher dashboard: Quest Bound internal staff may list/create organizations when the caller is
-- the Quest Bound org admin or a member of organization id 30bd98d4-6a34-4458-9b1f-c457bc05188a.

CREATE OR REPLACE FUNCTION public.quest_bound_org_staff_is_quest_bound_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = '30bd98d4-6a34-4458-9b1f-c457bc05188a'::uuid
      AND admin_user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = '30bd98d4-6a34-4458-9b1f-c457bc05188a'::uuid
      AND user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.quest_bound_org_staff_list_organizations()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  admin_user_id uuid,
  admin_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.name,
    o.slug,
    COALESCE(o.description, '')::text,
    o.admin_user_id,
    COALESCE(au.email::text, '') AS admin_email
  FROM public.organizations o
  LEFT JOIN auth.users au ON au.id = o.admin_user_id
  WHERE public.quest_bound_org_staff_is_quest_bound_member();
$$;

CREATE OR REPLACE FUNCTION public.quest_bound_org_staff_create_organization(
  p_name text,
  p_slug text,
  p_description text,
  p_admin_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin uuid;
  v_org_id uuid;
  v_email text;
  v_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.quest_bound_org_staff_is_quest_bound_member() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  v_email := lower(trim(p_admin_email));
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Enter a valid email address for the organization admin.';
  END IF;

  v_slug := lower(trim(p_slug));
  IF length(v_slug) < 3 OR length(v_slug) > 30 OR v_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Slug must be 3–30 characters: lowercase letters, digits, and hyphens only.';
  END IF;

  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'Organization name is required.';
  END IF;

  SELECT u.id
  INTO v_admin
  FROM auth.users u
  WHERE lower(trim(u.email::text)) = v_email
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No Quest Bound account exists for that email. The person must sign up first.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations WHERE admin_user_id = v_admin) THEN
    RAISE EXCEPTION 'That user already administers an organization.';
  END IF;

  INSERT INTO public.organizations (name, slug, description, admin_user_id, image_url)
  VALUES (
    trim(p_name),
    v_slug,
    COALESCE(NULLIF(trim(p_description), ''), ''),
    v_admin,
    NULL
  )
  RETURNING id INTO v_org_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id = v_admin
  ) THEN
    INSERT INTO public.organization_members (organization_id, user_id)
    VALUES (v_org_id, v_admin);
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.quest_bound_org_staff_is_quest_bound_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quest_bound_org_staff_list_organizations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quest_bound_org_staff_create_organization(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.quest_bound_org_staff_is_quest_bound_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quest_bound_org_staff_list_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.quest_bound_org_staff_create_organization(text, text, text, text) TO authenticated;
