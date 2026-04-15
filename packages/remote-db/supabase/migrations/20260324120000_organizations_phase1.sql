-- Phase 1: Organizations (schema, seat limits, org RLS, collaborative sync RLS, storage paths).
-- Product spec: agents/collab.md
--
-- Sync client note: org collaborators must push/pull rows with user_id = the ruleset owner's
-- cloud id (see collab plan Phase 4). Current app uses session user_id everywhere; solo sync
-- unchanged until client work lands.

-- =============================================================================
-- Email helper (no dependency on public.organization_* tables)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auth_email_normalized()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT lower(trim(COALESCE(
    (SELECT u.email FROM auth.users AS u WHERE u.id = (SELECT auth.uid()) LIMIT 1),
    ''
  )));
$$;

REVOKE ALL ON FUNCTION public.auth_email_normalized() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_email_normalized() TO authenticated;

-- =============================================================================
-- Tables (must exist before helper functions that reference them)
-- =============================================================================

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  admin_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_format_chk CHECK (
    slug ~ '^[a-z0-9-]{3,30}$'
  )
);

CREATE UNIQUE INDEX organizations_one_admin_per_user ON public.organizations (admin_user_id);

CREATE UNIQUE INDEX organizations_name_lower_uidx ON public.organizations (lower(name));

CREATE UNIQUE INDEX organizations_slug_lower_uidx ON public.organizations (lower(slug));

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX organization_members_user_idx ON public.organization_members (user_id);

CREATE TABLE public.organization_rulesets (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  ruleset_id text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, ruleset_id),
  CONSTRAINT organization_rulesets_ruleset_one_org_uidx UNIQUE (ruleset_id)
);

CREATE INDEX organization_rulesets_owner_idx ON public.organization_rulesets (owner_user_id);

CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  invitee_email_normalized text NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- At most one pending invite per org + email (re-invite after dismiss uses a new row)
CREATE UNIQUE INDEX organization_invites_one_pending_per_email
  ON public.organization_invites (organization_id, invitee_email_normalized)
  WHERE status = 'pending';

-- =============================================================================
-- sync_deletes: ruleset scope for org collaborators (nullable for legacy rows)
-- =============================================================================

ALTER TABLE public.sync_deletes
  ADD COLUMN IF NOT EXISTS ruleset_id text;

-- =============================================================================
-- Helpers that reference organization tables (after CREATE TABLE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_org_collaborator_for_owner_ruleset(
  p_owner_user_id uuid,
  p_ruleset_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_rulesets AS o
    INNER JOIN public.organizations AS org ON org.id = o.organization_id
    WHERE o.ruleset_id = p_ruleset_id
      AND o.owner_user_id = p_owner_user_id
      AND (
        org.admin_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.organization_members AS m
          WHERE m.organization_id = o.organization_id
            AND m.user_id = (SELECT auth.uid())
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_collaborator_for_owner_ruleset(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_collaborator_for_owner_ruleset(uuid, text) TO authenticated;

-- Org-scoped ruleset assets/fonts: {organization_id}/{ruleset_id}/...
CREATE OR REPLACE FUNCTION public.storage_org_ruleset_path_allowed(
  p_name text,
  p_require_admin boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  org_uuid uuid;
  rsid text;
  is_admin boolean;
  is_member boolean;
BEGIN
  parts := string_to_array(nullif(trim(p_name), ''), '/');
  IF parts IS NULL OR array_length(parts, 1) IS NULL OR array_length(parts, 1) < 3 THEN
    RETURN false;
  END IF;
  BEGIN
    org_uuid := parts[1]::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;
  rsid := parts[2];
  SELECT
    (org.admin_user_id = (SELECT auth.uid())),
    EXISTS (
      SELECT 1
      FROM public.organization_members AS m
      WHERE m.organization_id = org.id AND m.user_id = (SELECT auth.uid())
    )
  INTO is_admin, is_member
  FROM public.organizations AS org
  WHERE org.id = org_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_require_admin AND NOT is_admin THEN
    RETURN false;
  END IF;

  IF NOT p_require_admin AND NOT is_admin AND NOT is_member THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organization_rulesets AS o
    WHERE o.organization_id = org_uuid
      AND o.ruleset_id = rsid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storage_org_ruleset_path_allowed(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_org_ruleset_path_allowed(text, boolean) TO authenticated;

-- Org logo: {organization_id}/logo.ext (reserved object name under org folder)
CREATE OR REPLACE FUNCTION public.storage_org_logo_path_allowed(
  p_name text,
  p_require_admin boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  org_uuid uuid;
  fname text;
  is_admin boolean;
  is_member boolean;
BEGIN
  parts := string_to_array(nullif(trim(p_name), ''), '/');
  IF parts IS NULL OR array_length(parts, 1) IS NULL OR array_length(parts, 1) <> 2 THEN
    RETURN false;
  END IF;
  BEGIN
    org_uuid := parts[1]::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;
  fname := parts[2];
  IF fname IS NULL OR fname !~* '^logo(\.|$)' THEN
    RETURN false;
  END IF;

  SELECT
    (org.admin_user_id = (SELECT auth.uid())),
    EXISTS (
      SELECT 1
      FROM public.organization_members AS m
      WHERE m.organization_id = org.id AND m.user_id = (SELECT auth.uid())
    )
  INTO is_admin, is_member
  FROM public.organizations AS org
  WHERE org.id = org_uuid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_require_admin AND NOT is_admin THEN
    RETURN false;
  END IF;

  IF NOT p_require_admin AND NOT is_admin AND NOT is_member THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_org_logo_path_allowed(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_org_logo_path_allowed(text, boolean) TO authenticated;

-- =============================================================================
-- Triggers: seat cap (admin + max 4 other seats = members + pending invites)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_organization_seat_cap_invite()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  member_cnt integer;
  pending_cnt integer;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT count(*) INTO member_cnt
    FROM public.organization_members AS m
    WHERE m.organization_id = NEW.organization_id;

    SELECT count(*) INTO pending_cnt
    FROM public.organization_invites AS i
    WHERE i.organization_id = NEW.organization_id
      AND i.status = 'pending';

    IF member_cnt + pending_cnt >= 4 THEN
      RAISE EXCEPTION 'Organization seat limit reached (max 4 members or pending invites besides the admin)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_invites_seat_cap_trg
  BEFORE INSERT ON public.organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_organization_seat_cap_invite();

CREATE OR REPLACE FUNCTION public.enforce_organization_seat_cap_member()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  member_cnt integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO member_cnt
    FROM public.organization_members AS m
    WHERE m.organization_id = NEW.organization_id;

    IF member_cnt >= 4 THEN
      RAISE EXCEPTION 'Organization member limit reached (max 4 members besides the admin)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_members_seat_cap_trg
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_organization_seat_cap_member();

CREATE OR REPLACE FUNCTION public.enforce_organization_invite_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.invitee_email_normalized IS DISTINCT FROM OLD.invitee_email_normalized
      OR NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
      RAISE EXCEPTION 'Cannot change immutable organization invite fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_invites_immutable_trg
  BEFORE UPDATE ON public.organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_organization_invite_immutable();

CREATE OR REPLACE FUNCTION public.validate_organization_ruleset_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  org_admin uuid;
BEGIN
  SELECT o.admin_user_id INTO org_admin
  FROM public.organizations AS o
  WHERE o.id = NEW.organization_id;

  IF org_admin IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  IF org_admin <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Only the organization admin may link rulesets';
  END IF;

  IF NEW.owner_user_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'You may only link rulesets you own in the cloud';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rulesets AS r
    WHERE r.user_id = NEW.owner_user_id
      AND r.id = NEW.ruleset_id
  ) THEN
    RAISE EXCEPTION 'Ruleset must exist in the cloud for this owner';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER organization_rulesets_validate_trg
  BEFORE INSERT OR UPDATE ON public.organization_rulesets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organization_ruleset_link();

CREATE OR REPLACE FUNCTION public.organizations_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_updated_at_trg
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.organizations_set_updated_at();

-- =============================================================================
-- RLS: organization tables
-- =============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY organizations_select ON public.organizations
  FOR SELECT USING (
    admin_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members AS m
      WHERE m.organization_id = organizations.id
        AND m.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_invites AS i
      WHERE i.organization_id = organizations.id
        AND i.status = 'pending'
        AND i.invitee_email_normalized = public.auth_email_normalized()
    )
  );

CREATE POLICY organizations_insert ON public.organizations
  FOR INSERT WITH CHECK (admin_user_id = (SELECT auth.uid()));

CREATE POLICY organizations_update ON public.organizations
  FOR UPDATE USING (admin_user_id = (SELECT auth.uid()))
  WITH CHECK (admin_user_id = (SELECT auth.uid()));

CREATE POLICY organizations_delete ON public.organizations
  FOR DELETE USING (admin_user_id = (SELECT auth.uid()));

CREATE POLICY organization_members_select ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_members.organization_id
        AND (
          o.admin_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.organization_members AS m2
            WHERE m2.organization_id = o.id
              AND m2.user_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY organization_members_insert ON public.organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_members.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    OR (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.organization_invites AS i
        WHERE i.organization_id = organization_members.organization_id
          AND i.status = 'pending'
          AND i.invitee_email_normalized = public.auth_email_normalized()
      )
    )
  );

CREATE POLICY organization_members_delete ON public.organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_members.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    OR (
      organization_members.user_id = (SELECT auth.uid())
      AND NOT EXISTS (
        SELECT 1
        FROM public.organizations AS o
        WHERE o.id = organization_members.organization_id
          AND o.admin_user_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY organization_rulesets_select ON public.organization_rulesets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_rulesets.organization_id
        AND (
          o.admin_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.organization_members AS m
            WHERE m.organization_id = o.id
              AND m.user_id = (SELECT auth.uid())
          )
        )
    )
  );

CREATE POLICY organization_rulesets_insert ON public.organization_rulesets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_rulesets.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY organization_rulesets_delete ON public.organization_rulesets
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_rulesets.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY organization_invites_select ON public.organization_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_invites.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    OR (
      status = 'pending'
      AND invitee_email_normalized = public.auth_email_normalized()
    )
  );

CREATE POLICY organization_invites_insert ON public.organization_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_invites.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    AND invited_by = (SELECT auth.uid())
  );

CREATE POLICY organization_invites_update ON public.organization_invites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_invites.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    OR (
      status = 'pending'
      AND invitee_email_normalized = public.auth_email_normalized()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_invites.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
    OR (
      invitee_email_normalized = public.auth_email_normalized()
      AND status IN ('accepted', 'dismissed')
    )
  );

CREATE POLICY organization_invites_delete ON public.organization_invites
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.organizations AS o
      WHERE o.id = organization_invites.organization_id
        AND o.admin_user_id = (SELECT auth.uid())
    )
  );

-- =============================================================================
-- RLS: synced data tables (own rows OR org collaborator on ruleset owner partition)
-- =============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'rulesets',
    'attributes',
    'actions',
    'items',
    'charts',
    'documents',
    'assets',
    'fonts',
    'windows',
    'components',
    'characters',
    'character_attributes',
    'pages',
    'character_pages',
    'character_windows',
    'ruleset_windows',
    'inventories',
    'inventory_items',
    'dice_rolls',
    'scripts',
    'script_logs',
    'dependency_graph_nodes',
    'archetypes',
    'character_archetypes',
    'custom_properties',
    'archetype_custom_properties',
    'item_custom_properties',
    'campaigns',
    'campaign_characters',
    'campaign_scenes',
    'scene_turn_callbacks',
    'campaign_events',
    'sync_deletes'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can select own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own rows" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own rows" ON public.%I', t);
  END LOOP;
END;
$$;

-- rulesets: ruleset id column is "id"
CREATE POLICY "Users can select own rows" ON public.rulesets
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, id)
    )
  );

CREATE POLICY "Users can insert own rows" ON public.rulesets
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, id)
    )
  );

CREATE POLICY "Users can update own rows" ON public.rulesets
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, id)
    )
  );

CREATE POLICY "Users can delete own rows" ON public.rulesets
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, id)
    )
  );

-- Tables with non-null ruleset_id
CREATE POLICY "Users can select own rows" ON public.attributes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.attributes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.attributes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.attributes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.actions
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.actions
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.actions
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.actions
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.items
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.items
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.items
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.items
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.charts
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.charts
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.charts
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.charts
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- documents: nullable ruleset_id
CREATE POLICY "Users can select own rows" ON public.documents
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.documents
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.documents
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.documents
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );

-- assets: nullable ruleset_id
CREATE POLICY "Users can select own rows" ON public.assets
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.assets
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.assets
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.assets
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.fonts
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.fonts
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.fonts
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.fonts
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.windows
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.windows
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.windows
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.windows
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.components
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.components
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.components
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.components
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.characters
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.characters
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.characters
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.characters
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.character_attributes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.character_attributes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.character_attributes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.character_attributes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.pages
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.pages
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.pages
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.pages
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.character_pages
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.character_pages
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.character_pages
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.character_pages
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- character_windows: derive ruleset via characters
CREATE POLICY "Users can select own rows" ON public.character_windows
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_windows.user_id
          AND c.id = character_windows.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.character_windows
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_windows.user_id
          AND c.id = character_windows.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.character_windows
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_windows.user_id
          AND c.id = character_windows.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_windows.user_id
          AND c.id = character_windows.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.character_windows
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_windows.user_id
          AND c.id = character_windows.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.ruleset_windows
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.ruleset_windows
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.ruleset_windows
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.ruleset_windows
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.inventories
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.inventories
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.inventories
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.inventories
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- inventory_items: derive ruleset via inventories
CREATE POLICY "Users can select own rows" ON public.inventory_items
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.inventories AS i
        WHERE i.user_id = inventory_items.user_id
          AND i.id = inventory_items.inventory_id
          AND public.is_org_collaborator_for_owner_ruleset(i.user_id, i.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.inventory_items
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.inventories AS i
        WHERE i.user_id = inventory_items.user_id
          AND i.id = inventory_items.inventory_id
          AND public.is_org_collaborator_for_owner_ruleset(i.user_id, i.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.inventory_items
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.inventories AS i
        WHERE i.user_id = inventory_items.user_id
          AND i.id = inventory_items.inventory_id
          AND public.is_org_collaborator_for_owner_ruleset(i.user_id, i.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.inventories AS i
        WHERE i.user_id = inventory_items.user_id
          AND i.id = inventory_items.inventory_id
          AND public.is_org_collaborator_for_owner_ruleset(i.user_id, i.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.inventory_items
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.inventories AS i
        WHERE i.user_id = inventory_items.user_id
          AND i.id = inventory_items.inventory_id
          AND public.is_org_collaborator_for_owner_ruleset(i.user_id, i.ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.dice_rolls
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.dice_rolls
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.dice_rolls
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.dice_rolls
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.scripts
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.scripts
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.scripts
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.scripts
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.script_logs
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.script_logs
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.script_logs
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.script_logs
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.dependency_graph_nodes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.dependency_graph_nodes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.dependency_graph_nodes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.dependency_graph_nodes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

CREATE POLICY "Users can select own rows" ON public.archetypes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.archetypes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.archetypes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.archetypes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- character_archetypes
CREATE POLICY "Users can select own rows" ON public.character_archetypes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_archetypes.user_id
          AND c.id = character_archetypes.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.character_archetypes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_archetypes.user_id
          AND c.id = character_archetypes.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.character_archetypes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_archetypes.user_id
          AND c.id = character_archetypes.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_archetypes.user_id
          AND c.id = character_archetypes.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.character_archetypes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.characters AS c
        WHERE c.user_id = character_archetypes.user_id
          AND c.id = character_archetypes.character_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.custom_properties
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.custom_properties
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.custom_properties
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.custom_properties
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- archetype_custom_properties
CREATE POLICY "Users can select own rows" ON public.archetype_custom_properties
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.archetypes AS a
        WHERE a.user_id = archetype_custom_properties.user_id
          AND a.id = archetype_custom_properties.archetype_id
          AND public.is_org_collaborator_for_owner_ruleset(a.user_id, a.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.archetype_custom_properties
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.archetypes AS a
        WHERE a.user_id = archetype_custom_properties.user_id
          AND a.id = archetype_custom_properties.archetype_id
          AND public.is_org_collaborator_for_owner_ruleset(a.user_id, a.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.archetype_custom_properties
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.archetypes AS a
        WHERE a.user_id = archetype_custom_properties.user_id
          AND a.id = archetype_custom_properties.archetype_id
          AND public.is_org_collaborator_for_owner_ruleset(a.user_id, a.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.archetypes AS a
        WHERE a.user_id = archetype_custom_properties.user_id
          AND a.id = archetype_custom_properties.archetype_id
          AND public.is_org_collaborator_for_owner_ruleset(a.user_id, a.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.archetype_custom_properties
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.archetypes AS a
        WHERE a.user_id = archetype_custom_properties.user_id
          AND a.id = archetype_custom_properties.archetype_id
          AND public.is_org_collaborator_for_owner_ruleset(a.user_id, a.ruleset_id)
      )
    )
  );

-- item_custom_properties
CREATE POLICY "Users can select own rows" ON public.item_custom_properties
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.items AS it
        WHERE it.user_id = item_custom_properties.user_id
          AND it.id = item_custom_properties.item_id
          AND public.is_org_collaborator_for_owner_ruleset(it.user_id, it.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.item_custom_properties
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.items AS it
        WHERE it.user_id = item_custom_properties.user_id
          AND it.id = item_custom_properties.item_id
          AND public.is_org_collaborator_for_owner_ruleset(it.user_id, it.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.item_custom_properties
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.items AS it
        WHERE it.user_id = item_custom_properties.user_id
          AND it.id = item_custom_properties.item_id
          AND public.is_org_collaborator_for_owner_ruleset(it.user_id, it.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.items AS it
        WHERE it.user_id = item_custom_properties.user_id
          AND it.id = item_custom_properties.item_id
          AND public.is_org_collaborator_for_owner_ruleset(it.user_id, it.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.item_custom_properties
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.items AS it
        WHERE it.user_id = item_custom_properties.user_id
          AND it.id = item_custom_properties.item_id
          AND public.is_org_collaborator_for_owner_ruleset(it.user_id, it.ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.campaigns
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.campaigns
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.campaigns
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.campaigns
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- campaign_characters
CREATE POLICY "Users can select own rows" ON public.campaign_characters
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_characters.user_id
          AND c.id = campaign_characters.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.campaign_characters
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_characters.user_id
          AND c.id = campaign_characters.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.campaign_characters
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_characters.user_id
          AND c.id = campaign_characters.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_characters.user_id
          AND c.id = campaign_characters.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.campaign_characters
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_characters.user_id
          AND c.id = campaign_characters.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

-- campaign_scenes
CREATE POLICY "Users can select own rows" ON public.campaign_scenes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_scenes.user_id
          AND c.id = campaign_scenes.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.campaign_scenes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_scenes.user_id
          AND c.id = campaign_scenes.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.campaign_scenes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_scenes.user_id
          AND c.id = campaign_scenes.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_scenes.user_id
          AND c.id = campaign_scenes.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.campaign_scenes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_scenes.user_id
          AND c.id = campaign_scenes.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.scene_turn_callbacks
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can insert own rows" ON public.scene_turn_callbacks
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can update own rows" ON public.scene_turn_callbacks
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );
CREATE POLICY "Users can delete own rows" ON public.scene_turn_callbacks
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
    )
  );

-- campaign_events
CREATE POLICY "Users can select own rows" ON public.campaign_events
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_events.user_id
          AND c.id = campaign_events.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.campaign_events
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_events.user_id
          AND c.id = campaign_events.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.campaign_events
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_events.user_id
          AND c.id = campaign_events.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_events.user_id
          AND c.id = campaign_events.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.campaign_events
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.campaigns AS c
        WHERE c.user_id = campaign_events.user_id
          AND c.id = campaign_events.campaign_id
          AND public.is_org_collaborator_for_owner_ruleset(c.user_id, c.ruleset_id)
      )
    )
  );

CREATE POLICY "Users can select own rows" ON public.sync_deletes
  FOR SELECT USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can insert own rows" ON public.sync_deletes
  FOR INSERT WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can update own rows" ON public.sync_deletes
  FOR UPDATE
  USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  )
  WITH CHECK (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );
CREATE POLICY "Users can delete own rows" ON public.sync_deletes
  FOR DELETE USING (
    public.sync_is_allowed()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        ruleset_id IS NOT NULL
        AND public.is_org_collaborator_for_owner_ruleset(user_id, ruleset_id)
      )
    )
  );

-- Restore users policies (unchanged from 20260321130000_sync_rls_requires_cloud_enabled.sql)
DROP POLICY IF EXISTS "Users can select own rows" ON public.users;
DROP POLICY IF EXISTS "Users can insert own rows" ON public.users;
DROP POLICY IF EXISTS "Users can update own rows" ON public.users;
DROP POLICY IF EXISTS "Users can delete own rows" ON public.users;

CREATE POLICY "Users can insert own rows" ON public.users
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can select own rows" ON public.users
  FOR SELECT
  USING (user_id = (SELECT auth.uid()) AND public.sync_is_allowed());

CREATE POLICY "Users can update own rows" ON public.users
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()) AND public.sync_is_allowed())
  WITH CHECK (user_id = (SELECT auth.uid()) AND public.sync_is_allowed());

CREATE POLICY "Users can delete own rows" ON public.users
  FOR DELETE
  USING (user_id = (SELECT auth.uid()) AND public.sync_is_allowed());

-- =============================================================================
-- Storage: personal folder, org ruleset folders, org logo
-- =============================================================================

DROP POLICY IF EXISTS "User uploads to assets" ON storage.objects;
DROP POLICY IF EXISTS "User reads own assets" ON storage.objects;
DROP POLICY IF EXISTS "User updates own assets" ON storage.objects;
DROP POLICY IF EXISTS "User deletes own assets" ON storage.objects;

DROP POLICY IF EXISTS "User uploads to fonts" ON storage.objects;
DROP POLICY IF EXISTS "User reads own fonts" ON storage.objects;
DROP POLICY IF EXISTS "User updates own fonts" ON storage.objects;
DROP POLICY IF EXISTS "User deletes own fonts" ON storage.objects;

CREATE POLICY "User uploads to assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
    OR public.storage_org_logo_path_allowed(name, true)
  )
);

CREATE POLICY "User reads own assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
    OR public.storage_org_logo_path_allowed(name, false)
  )
);

CREATE POLICY "User updates own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
    OR public.storage_org_logo_path_allowed(name, true)
  )
);

CREATE POLICY "User deletes own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
    OR public.storage_org_logo_path_allowed(name, true)
  )
);

CREATE POLICY "User uploads to fonts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fonts'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
  )
);

CREATE POLICY "User reads own fonts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
  )
);

CREATE POLICY "User updates own fonts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
  )
);

CREATE POLICY "User deletes own fonts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.storage_org_ruleset_path_allowed(name, false)
  )
);

-- =============================================================================
-- Invite accept: insert member while invite is still pending, then mark accepted (ordering)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_organization_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.organization_invites%ROWTYPE;
  norm text;
BEGIN
  norm := public.auth_email_normalized();
  IF norm = '' THEN
    RAISE EXCEPTION 'No email on account';
  END IF;

  SELECT * INTO inv
  FROM public.organization_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite is not pending';
  END IF;

  IF lower(trim(inv.invitee_email_normalized)) IS DISTINCT FROM norm THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id)
  VALUES (inv.organization_id, (SELECT auth.uid()));

  UPDATE public.organization_invites
  SET status = 'accepted'
  WHERE id = p_invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(uuid) TO authenticated;

-- =============================================================================
-- Grants
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_rulesets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invites TO authenticated;
