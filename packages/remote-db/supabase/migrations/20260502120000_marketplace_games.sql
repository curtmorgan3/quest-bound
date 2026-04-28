-- Marketplace storefronts: internal staff table + public.games + RLS.
-- Product plan: marketplace repo `plan.md` (standalone Next.js app; same Supabase project).

-- =============================================================================
-- quest_bound_staff — who may bypass draft visibility (QA / internal ops)
-- Inserts/updates only via service role (no RLS policies = deny non-bypass users).
-- =============================================================================

CREATE TABLE public.quest_bound_staff (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.quest_bound_staff ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.quest_bound_staff FROM PUBLIC;
GRANT ALL ON TABLE public.quest_bound_staff TO service_role;

COMMENT ON TABLE public.quest_bound_staff IS
  'Quest Bound internal staff (marketplace QA). Manage rows with service role only; seed via SQL.';

-- =============================================================================
-- games — one storefront per linked ruleset (per org)
-- =============================================================================

CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  publisher_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  ruleset_id text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'preview', 'live')),
  price numeric(12, 2) NOT NULL DEFAULT 0,
  sale_price numeric(12, 2),
  sale_start_date timestamptz,
  sale_end_date timestamptz,
  ruleset_app_url text,
  parent_id uuid REFERENCES public.games (id) ON DELETE SET NULL,
  version text NOT NULL DEFAULT '1.0.0',
  title text NOT NULL,
  cover_image_url text NOT NULL DEFAULT '',
  header text NOT NULL DEFAULT '',
  release_date date NOT NULL DEFAULT (CURRENT_DATE),
  publisher_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  carousel_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT games_org_ruleset_fk
    FOREIGN KEY (organization_id, ruleset_id)
    REFERENCES public.organization_rulesets (organization_id, ruleset_id)
    ON DELETE RESTRICT,
  CONSTRAINT games_org_slug_uidx UNIQUE (organization_id, slug),
  CONSTRAINT games_slug_format_chk CHECK (slug ~ '^[a-z0-9-]{2,80}$')
);

CREATE INDEX games_organization_id_idx ON public.games (organization_id);
CREATE INDEX games_org_ruleset_idx ON public.games (organization_id, ruleset_id);

CREATE OR REPLACE FUNCTION public.games_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER games_updated_at_trg
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.games_set_updated_at();

COMMENT ON TABLE public.games IS
  'Marketplace storefront listing; RLS: preview/live public; draft for org admin/members or quest_bound_staff.';

-- =============================================================================
-- Helper: staff bypass (same SECURITY DEFINER pattern as org helpers)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_is_quest_bound_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quest_bound_staff AS qbs
    WHERE qbs.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_quest_bound_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_quest_bound_staff() TO authenticated;

-- =============================================================================
-- RLS: games
-- =============================================================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- SELECT: public preview/live; draft for org admins or members; full access for quest_bound_staff.
CREATE POLICY games_select ON public.games
  FOR SELECT
  USING (
    (games.status IN ('preview', 'live'))
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND games.status = 'draft'
      AND (
        public.is_organization_admin(games.organization_id)
        OR public.user_is_organization_member(games.organization_id)
      )
    )
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND public.user_is_quest_bound_staff()
    )
  );

-- Writes: org admins for their org; quest_bound_staff may manage any row (publisher tooling TBD).
CREATE POLICY games_insert_org_admin ON public.games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_organization_admin(games.organization_id)
  );

CREATE POLICY games_update_org_admin_or_staff ON public.games
  FOR UPDATE
  TO authenticated
  USING (
    public.is_organization_admin(games.organization_id)
    OR public.user_is_quest_bound_staff()
  )
  WITH CHECK (
    public.is_organization_admin(games.organization_id)
    OR public.user_is_quest_bound_staff()
  );

CREATE POLICY games_delete_org_admin_or_staff ON public.games
  FOR DELETE
  TO authenticated
  USING (
    public.is_organization_admin(games.organization_id)
    OR public.user_is_quest_bound_staff()
  );

-- Allow anon to resolve org slug when the org has a public storefront; staff see all orgs.
DROP POLICY IF EXISTS organizations_select ON public.organizations;

CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING (
    admin_user_id = (SELECT auth.uid())
    OR public.user_is_organization_member(organizations.id)
    OR public.user_has_pending_org_invite(organizations.id)
    OR public.user_is_quest_bound_staff()
    OR EXISTS (
      SELECT 1
      FROM public.games AS g
      WHERE g.organization_id = organizations.id
        AND g.status IN ('preview', 'live')
    )
  );

-- Table privileges (match other public schema tables)
GRANT SELECT ON TABLE public.games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.games TO authenticated;
GRANT ALL ON TABLE public.games TO service_role;
