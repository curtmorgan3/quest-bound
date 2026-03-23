-- Fix infinite RLS recursion on organization org tables.
--
-- Problems:
-- 1) organization_members_select used EXISTS (organization_members me ...) which re-evaluated
--    RLS on the same row (me can be the row under check) → infinite recursion.
-- 2) organizations_select referenced organization_invites; organization_invites_select
--    referenced organizations → infinite recursion.
--
-- Fix: SECURITY DEFINER helpers with row_security = off for membership/admin/invite checks,
-- then policies call only those helpers (no cross-table policy subqueries).

CREATE OR REPLACE FUNCTION public.is_organization_admin(p_organization_id uuid)
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
    WHERE o.id = p_organization_id
      AND o.admin_user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_organization_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_pending_org_invite(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_invites AS i
    WHERE i.organization_id = p_organization_id
      AND i.status = 'pending'
      AND i.invitee_email_normalized = public.auth_email_normalized()
  );
$$;

CREATE OR REPLACE FUNCTION public.organization_row_visible_to_user(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.is_organization_admin(p_organization_id)
    OR public.user_is_organization_member(p_organization_id)
    OR public.user_has_pending_org_invite(p_organization_id);
$$;

REVOKE ALL ON FUNCTION public.is_organization_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_is_organization_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_organization_member(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.user_has_pending_org_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_pending_org_invite(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.organization_row_visible_to_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_row_visible_to_user(uuid) TO authenticated;

-- organizations
DROP POLICY IF EXISTS organizations_select ON public.organizations;
CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING (public.organization_row_visible_to_user(organizations.id));

-- organization_members
DROP POLICY IF EXISTS organization_members_select ON public.organization_members;
CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT USING (
    organization_members.user_id = (SELECT auth.uid())
    OR public.is_organization_admin(organization_members.organization_id)
    OR public.user_is_organization_member(organization_members.organization_id)
  );

DROP POLICY IF EXISTS organization_members_insert ON public.organization_members;
CREATE POLICY organization_members_insert ON public.organization_members
  FOR INSERT WITH CHECK (
    public.is_organization_admin(organization_members.organization_id)
    OR (
      organization_members.user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.organization_invites AS i
        WHERE i.organization_id = organization_members.organization_id
          AND i.status = 'pending'
          AND i.invitee_email_normalized = public.auth_email_normalized()
      )
    )
  );

DROP POLICY IF EXISTS organization_members_delete ON public.organization_members;
CREATE POLICY organization_members_delete ON public.organization_members
  FOR DELETE USING (
    public.is_organization_admin(organization_members.organization_id)
    OR (
      organization_members.user_id = (SELECT auth.uid())
      AND NOT public.is_organization_admin(organization_members.organization_id)
    )
  );

-- organization_rulesets
DROP POLICY IF EXISTS organization_rulesets_select ON public.organization_rulesets;
CREATE POLICY organization_rulesets_select ON public.organization_rulesets
  FOR SELECT USING (
    public.is_organization_admin(organization_rulesets.organization_id)
    OR public.user_is_organization_member(organization_rulesets.organization_id)
  );

DROP POLICY IF EXISTS organization_rulesets_insert ON public.organization_rulesets;
CREATE POLICY organization_rulesets_insert ON public.organization_rulesets
  FOR INSERT WITH CHECK (public.is_organization_admin(organization_rulesets.organization_id));

DROP POLICY IF EXISTS organization_rulesets_delete ON public.organization_rulesets;
CREATE POLICY organization_rulesets_delete ON public.organization_rulesets
  FOR DELETE USING (public.is_organization_admin(organization_rulesets.organization_id));

-- organization_invites
DROP POLICY IF EXISTS organization_invites_select ON public.organization_invites;
CREATE POLICY organization_invites_select ON public.organization_invites
  FOR SELECT USING (
    public.is_organization_admin(organization_invites.organization_id)
    OR (
      status = 'pending'
      AND invitee_email_normalized = public.auth_email_normalized()
    )
  );

DROP POLICY IF EXISTS organization_invites_insert ON public.organization_invites;
CREATE POLICY organization_invites_insert ON public.organization_invites
  FOR INSERT WITH CHECK (
    public.is_organization_admin(organization_invites.organization_id)
    AND invited_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS organization_invites_update ON public.organization_invites;
CREATE POLICY organization_invites_update ON public.organization_invites
  FOR UPDATE USING (
    public.is_organization_admin(organization_invites.organization_id)
    OR (
      status = 'pending'
      AND invitee_email_normalized = public.auth_email_normalized()
    )
  )
  WITH CHECK (
    public.is_organization_admin(organization_invites.organization_id)
    OR (
      invitee_email_normalized = public.auth_email_normalized()
      AND status IN ('accepted', 'dismissed')
    )
  );

DROP POLICY IF EXISTS organization_invites_delete ON public.organization_invites;
CREATE POLICY organization_invites_delete ON public.organization_invites
  FOR DELETE USING (public.is_organization_admin(organization_invites.organization_id));
