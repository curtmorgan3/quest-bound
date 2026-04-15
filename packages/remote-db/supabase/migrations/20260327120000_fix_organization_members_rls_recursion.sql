-- Superseded in effect by 20260328120000_org_rls_definer_helpers.sql (third branch here still
-- self-recursed via EXISTS organization_members). Kept so migration history stays linear.
--
-- Fix infinite RLS recursion between organization_members_select and organizations_select.
-- organizations_select referenced organization_members; organization_members_select queried
-- organizations with a nested EXISTS on organization_members, re-entering the same policy.
--
-- New member visibility:
-- 1) Row is for auth.uid()
-- 2) User is org admin (organizations row readable via admin_user_id = auth.uid() only)
-- 3) User has a membership row in the same org (inner query only evaluates RLS on own row)

DROP POLICY IF EXISTS organization_members_select ON public.organization_members;

CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT USING (
    organization_members.user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_members.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS me
      WHERE me.organization_id = organization_members.organization_id
        AND me.user_id = (SELECT auth.uid())
    )
  );
