-- Phase 5: RPCs for org admin UI (invite validation, member emails).
-- Product spec: agents/collab.md

-- Lookup auth user by email only when caller is org admin (mitigates open email probing).
CREATE OR REPLACE FUNCTION public.find_auth_user_id_by_email_for_org_invite(
  p_organization_id uuid,
  p_email text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT u.id
  FROM auth.users AS u
  WHERE EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = p_organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    AND lower(trim(COALESCE(u.email::text, ''))) = lower(trim(COALESCE(p_email, '')))
    AND length(trim(COALESCE(p_email, ''))) > 0
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_auth_user_id_by_email_for_org_invite(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_auth_user_id_by_email_for_org_invite(uuid, text) TO authenticated;

-- Member emails for org admin only (auth.users not readable from client).
CREATE OR REPLACE FUNCTION public.organization_admin_list_members(p_organization_id uuid)
RETURNS TABLE (user_id uuid, email text, joined_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT m.user_id, u.email::text, m.created_at
  FROM public.organization_members AS m
  INNER JOIN auth.users AS u ON u.id = m.user_id
  WHERE m.organization_id = p_organization_id
    AND EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = p_organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.organization_admin_list_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_admin_list_members(uuid) TO authenticated;
