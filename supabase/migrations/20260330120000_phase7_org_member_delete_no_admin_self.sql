-- Phase 7: Admin cannot "leave" by deleting their own organization_members row.
-- Previously is_organization_admin(...) alone allowed DELETE on any member row including self.

DROP POLICY IF EXISTS organization_members_delete ON public.organization_members;

CREATE POLICY organization_members_delete ON public.organization_members
  FOR DELETE USING (
    (
      public.is_organization_admin(organization_members.organization_id)
      AND organization_members.user_id IS DISTINCT FROM (SELECT auth.uid())
    )
    OR (
      organization_members.user_id = (SELECT auth.uid())
      AND NOT public.is_organization_admin(organization_members.organization_id)
    )
  );
