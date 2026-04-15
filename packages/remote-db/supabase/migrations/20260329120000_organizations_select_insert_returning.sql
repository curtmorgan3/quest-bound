-- INSERT ... RETURNING must pass SELECT RLS. Using only
-- organization_row_visible_to_user(organizations.id) could reject the new row in some
-- evaluation orders (helper functions + STABLE). Allow direct row match for admins.
--
-- Logically equivalent to OR-ing admin / member / pending-invite visibility without
-- re-querying organizations.id for the admin case via a subquery.

DROP POLICY IF EXISTS organizations_select ON public.organizations;

CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING (
    admin_user_id = (SELECT auth.uid())
    OR public.user_is_organization_member(organizations.id)
    OR public.user_has_pending_org_invite(organizations.id)
  );

-- Ensure insert policy remains (defensive if ever dropped).
DROP POLICY IF EXISTS organizations_insert ON public.organizations;
CREATE POLICY organizations_insert ON public.organizations
  FOR INSERT WITH CHECK (admin_user_id = (SELECT auth.uid()));
